"""
Test các API extension gọi khi cào một app: mở/đóng lần cào, gửi thông tin app, hỏi trạng thái cào.
"""

import datetime

from market.models import App, CrawlRun, DeveloperAccount


def new_app_payload(run_id: int, **app_overrides) -> dict:
    """Body cho một app hoàn toàn mới, của tài khoản developer chưa từng gặp."""
    app_fields = {
        "id": "com.lutech.scanner",
        "title": "Scanner App",
        "category": "Productivity",
        "is_game": False,
        "installs_label": "5.000.000+",
        "min_installs": 5_000_000,
        "score": 4.0,
        "ratings": 100,
        "star_histogram": [20, 10, 10, 20, 40],
        "contains_ads": True,
        "offers_iap": False,
        "description": "Quét tài liệu",
    }
    app_fields.update(app_overrides)
    return {
        "run_id": run_id,
        "developer": {"play_developer_id": "lutech-dev", "display_name": "Lutech", "play_url": "https://play.google.com/store/apps/dev?id=1"},
        "app": app_fields,
    }


def post_app(client, body: dict):
    return client.post("/api/ingest/app/", body, content_type="application/json")


# ---------------------------------------------------------------------------
# Lần cào (crawl run)
# ---------------------------------------------------------------------------


def test_crawl_run_create(client, db):
    response = client.post(
        "/api/crawl-runs/", {"trigger": "studio", "target": "https://play.google.com/x"}, content_type="application/json"
    )
    assert response.status_code == 201
    assert CrawlRun.objects.get(id=response.json()["id"]).trigger == "studio"


def test_crawl_run_rejects_bad_trigger(client, db):
    response = client.post("/api/crawl-runs/", {"trigger": "all", "target": "x"}, content_type="application/json")
    assert response.status_code == 400


def test_crawl_run_finish(client, run_id):
    response = client.patch(
        f"/api/crawl-runs/{run_id}/",
        {"stats": {"apps": 3}, "errors": ["app X lỗi mạng"], "finished": True},
        content_type="application/json",
    )
    assert response.status_code == 200
    run = CrawlRun.objects.get(id=run_id)
    assert run.finished_at is not None
    assert run.stats == {"apps": 3}
    assert run.errors == ["app X lỗi mạng"]


def test_crawl_run_patch_without_finished_keeps_open(client, run_id):
    client.patch(f"/api/crawl-runs/{run_id}/", {"stats": {"apps": 1}}, content_type="application/json")
    assert CrawlRun.objects.get(id=run_id).finished_at is None


def test_crawl_run_patch_unknown_404(client, db):
    assert client.patch("/api/crawl-runs/999/", {"finished": True}, content_type="application/json").status_code == 404


# ---------------------------------------------------------------------------
# Nhận thông tin app
# ---------------------------------------------------------------------------


def test_ingest_new_app_creates_unassigned_developer(client, run_id):
    response = post_app(client, new_app_payload(run_id))
    assert response.status_code == 200
    assert response.json() == {
        "app_id": "com.lutech.scanner",
        "in_scope": False,
        "skipped_reason": "",
        "developer_status": "unassigned",
    }
    app = App.objects.get(id="com.lutech.scanner")
    assert app.low_star_ratio == 0.3
    assert app.developer_account.company is None
    assert app.raw_payload["app"]["title"] == "Scanner App"
    assert app.last_crawled_at is not None


def test_ingest_app_of_assigned_developer_in_scope(client, make_app, payload_for):
    app = make_app()
    response = post_app(client, payload_for(app))
    assert response.json()["in_scope"] is True
    assert response.json()["developer_status"] == "assigned"


def test_ingest_percentages_converted(client, run_id):
    body = new_app_payload(run_id, ratings=1000, star_percentages=[10, 5, 5, 20, 60])
    del body["app"]["star_histogram"]
    assert post_app(client, body).status_code == 200
    app = App.objects.get(id="com.lutech.scanner")
    assert app.star_histogram == [100, 50, 50, 200, 600]
    assert app.low_star_ratio == 0.15


def test_ingest_under_100k_marked_skipped(client, run_id):
    response = post_app(client, new_app_payload(run_id, min_installs=50_000, installs_label="50.000+"))
    assert response.json()["skipped_reason"] == "under_100k"
    assert App.objects.get(id="com.lutech.scanner").skipped_reason == "under_100k"


def test_ingest_game_marked_skipped(client, run_id):
    response = post_app(client, new_app_payload(run_id, is_game=True))
    assert response.json()["skipped_reason"] == "game"


def test_reingest_keeps_company_and_manual_domain(client, make_app, payload_for):
    app = make_app(domain_source="manual", features=["Đọc PDF"])  # domain "pdf", đã gán công ty
    response = post_app(client, payload_for(app, title="Tên mới"))
    assert response.status_code == 200
    app.refresh_from_db()
    assert app.title == "Tên mới"
    assert app.domain_id == "pdf" and app.domain_source == "manual"
    assert app.features == ["Đọc PDF"]
    assert app.developer_account.status == "assigned"
    assert app.developer_account.company_id == "apero"


def test_reingest_updates_developer_name_only(client, make_app, payload_for):
    app = make_app()
    body = payload_for(app)
    body["developer"]["display_name"] = "Apero Mới"
    post_app(client, body)
    developer = DeveloperAccount.objects.get(play_developer_id=app.developer_account_id)
    assert developer.display_name == "Apero Mới"
    assert developer.status == "assigned"


def test_ingest_missing_histogram_400(client, run_id):
    body = new_app_payload(run_id)
    del body["app"]["star_histogram"]
    assert post_app(client, body).status_code == 400
    assert App.objects.count() == 0


def test_ingest_histogram_wrong_length_400(client, run_id):
    assert post_app(client, new_app_payload(run_id, star_histogram=[1, 2, 3])).status_code == 400


def test_ingest_unknown_run_400(client, db):
    assert post_app(client, new_app_payload(999)).status_code == 400


# ---------------------------------------------------------------------------
# Trạng thái cào (để extension biết khi nào dừng cuộn)
# ---------------------------------------------------------------------------


def test_crawl_state_empty(client, make_app):
    make_app()
    response = client.get("/api/crawl-state/?app_id=com.apero.pdfreader&lang=vi")
    assert response.status_code == 200
    assert response.json() == {"latest_review_id": None, "latest_review_date": None, "review_count": 0}


def test_crawl_state_latest(client, make_app, make_review):
    app = make_app()
    make_review(app, id="vi-old", lang="vi", date=datetime.date(2026, 10, 1))
    make_review(app, id="vi-new", lang="vi", date=datetime.date(2026, 11, 5))
    make_review(app, id="en-newest", lang="en", date=datetime.date(2026, 11, 10))
    response = client.get("/api/crawl-state/?app_id=com.apero.pdfreader&lang=vi")
    assert response.json() == {"latest_review_id": "vi-new", "latest_review_date": "2026-11-05", "review_count": 2}


def test_crawl_state_filters_by_score(client, make_app, make_review):
    app = make_app()
    make_review(app, id="one-star", score=1, date=datetime.date(2026, 11, 1))
    make_review(app, id="two-star", score=2, date=datetime.date(2026, 11, 9))
    response = client.get("/api/crawl-state/?app_id=com.apero.pdfreader&lang=vi&score=1")
    assert response.json()["latest_review_id"] == "one-star"
    assert response.json()["review_count"] == 1


def test_crawl_state_same_day_uses_created_at(client, make_app, make_review):
    app = make_app()
    make_review(app, id="first", date=datetime.date(2026, 11, 1))
    make_review(app, id="second", date=datetime.date(2026, 11, 1))
    response = client.get("/api/crawl-state/?app_id=com.apero.pdfreader&lang=vi")
    assert response.json()["latest_review_id"] == "second"


def test_crawl_state_bad_params_400(client, db):
    assert client.get("/api/crawl-state/?lang=vi").status_code == 400
    assert client.get("/api/crawl-state/?app_id=x&lang=fr").status_code == 400
