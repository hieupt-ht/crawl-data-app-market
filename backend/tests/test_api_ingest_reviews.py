"""
Test POST /api/ingest/reviews/ — extension gửi review 1–2★ theo từng đợt (tối đa 100 review/đợt).

Hai tình huống quan trọng nhất:
- mạng chập chờn nên extension gửi lại cùng một đợt → không sinh bản trùng;
- cùng một review xuất hiện ở lượt "vi" rồi lượt "en" → giữ bản thấy đầu tiên.
"""

import pytest

from market.models import Review

APP_ID = "com.apero.pdfreader"


def review(review_id: str, **overrides) -> dict:
    """Một review hợp lệ như extension gửi."""
    item = {"id": review_id, "score": 1, "date": "2026-11-03", "content": "Quảng cáo quá nhiều", "thumbs_up": 2}
    item.update(overrides)
    return item


def reviews_batch(count: int) -> list[dict]:
    return [review(f"g{number}") for number in range(1, count + 1)]


@pytest.fixture
def post(client, make_app, run_id):
    """Trả hàm gửi một đợt review cho app mặc định (app được tạo sẵn)."""
    make_app()

    def send(reviews: list[dict], lang: str = "vi", app_id: str = APP_ID):
        body = {"run_id": run_id, "app_id": app_id, "lang": lang, "reviews": reviews}
        return client.post("/api/ingest/reviews/", body, content_type="application/json")

    return send


def test_add_reviews_created(post):
    response = post(reviews_batch(3))
    assert response.status_code == 200
    assert response.json() == {"created": 3, "duplicates": 0}
    saved = Review.objects.get(id="g1")
    assert saved.lang == "vi"
    assert saved.score == 1
    assert saved.thumbs_up == 2
    assert saved.date.isoformat() == "2026-11-03"
    assert saved.raw_payload == review("g1")


def test_thumbs_up_optional(post):
    item = review("g1")
    del item["thumbs_up"]
    assert post([item]).status_code == 200
    assert Review.objects.get(id="g1").thumbs_up == 0


def test_resend_same_batch_no_duplicates(post):
    batch = reviews_batch(3)
    post(batch)
    response = post(batch)
    assert response.json() == {"created": 0, "duplicates": 3}
    assert Review.objects.count() == 3


def test_partly_new_batch(post):
    post(reviews_batch(2))
    response = post(reviews_batch(5))
    assert response.json() == {"created": 3, "duplicates": 2}


def test_same_id_twice_in_one_batch(post):
    response = post([review("g1"), review("g1")])
    assert response.status_code == 200
    assert response.json() == {"created": 1, "duplicates": 1}


def test_same_id_in_other_lang_keeps_first(post):
    post([review("g1")], lang="vi")
    response = post([review("g1", content="Too many ads")], lang="en")
    assert response.json()["duplicates"] == 1
    saved = Review.objects.get(id="g1")
    assert saved.lang == "vi"
    assert saved.content == "Quảng cáo quá nhiều"


def test_reject_score_3(post):
    response = post([review("g1"), review("g2"), review("g3", score=3)])
    assert response.status_code == 400
    assert "Review thứ 3" in str(response.json())
    assert Review.objects.count() == 0


def test_reject_over_100(post):
    response = post(reviews_batch(101))
    assert response.status_code == 400
    assert Review.objects.count() == 0


def test_accept_exactly_100(post):
    assert post(reviews_batch(100)).json() == {"created": 100, "duplicates": 0}


def test_reject_skipped_app(client, make_app, run_id):
    make_app(id="com.game", skipped_reason="game", is_game=True)
    body = {"run_id": run_id, "app_id": "com.game", "lang": "vi", "reviews": [review("g1")]}
    response = client.post("/api/ingest/reviews/", body, content_type="application/json")
    assert response.status_code == 400
    assert "App đã bị loại" in str(response.json())


def test_reject_unknown_app(post):
    assert post([review("g1")], app_id="com.khong.co").status_code == 400


def test_reject_bad_date(post):
    response = post([review("g1", date="03/11/2026")])
    assert response.status_code == 400
    assert "Review thứ 1" in str(response.json())


def test_reject_bad_lang(post):
    assert post([review("g1")], lang="fr").status_code == 400
