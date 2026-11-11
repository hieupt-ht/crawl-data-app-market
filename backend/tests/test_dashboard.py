"""
Test GET /api/dashboard/ — JSON phải khớp từng tên trường với `DashboardData` trong frontend/src/lib/types.ts.
"""

import datetime

from django.utils import timezone

from market.models import CrawlRun

EXPECTED_TOP_KEYS = {"meta", "companies", "domains", "painGroups", "painPoints", "wishes", "apps", "reviews"}
EXPECTED_APP_KEYS = {
    "id", "title", "companyId", "domainId", "installsLabel", "minInstalls", "score", "ratings",
    "lowStarRatio", "oneStarRatings", "twoStarRatings", "containsAds", "offersIAP", "features",
}
EXPECTED_REVIEW_KEYS = {"id", "appId", "score", "date", "lang", "content", "painPoints", "wishId", "thumbsUp"}

LABELED_AT = datetime.datetime(2026, 11, 2, tzinfo=datetime.timezone.utc)


def get_dashboard(client, include_foreign: bool = False) -> dict:
    url = "/api/dashboard/?include_foreign=1" if include_foreign else "/api/dashboard/"
    response = client.get(url)
    assert response.status_code == 200
    return response.json()


def app_ids(data: dict) -> list[str]:
    return [app["id"] for app in data["apps"]]


def test_shape_matches_types_ts(client, make_app, make_review):
    app = make_app(features=["Đọc PDF"])
    make_review(app, id="r1", labeled_at=LABELED_AT, pain_point_ids=["ads"], wish_id="offline", thumbs_up=4)
    data = get_dashboard(client)

    assert set(data.keys()) == EXPECTED_TOP_KEYS
    assert set(data["meta"].keys()) == {"updatedAt", "source"}
    assert data["meta"]["source"] == "Google Play (tự cào bằng extension)"
    assert data["companies"] == [{"id": "apero", "name": "Apero"}]
    assert set(data["painPoints"][0].keys()) == {"id", "name", "group"}
    assert set(data["domains"][0].keys()) == {"id", "name"}
    assert set(data["painGroups"][0].keys()) == {"id", "name"}
    assert set(data["wishes"][0].keys()) == {"id", "name"}
    assert len(data["domains"]) == 8 and len(data["painPoints"]) == 10 and len(data["wishes"]) == 15

    assert set(data["apps"][0].keys()) == EXPECTED_APP_KEYS
    assert data["apps"][0]["companyId"] == "apero"
    assert data["apps"][0]["domainId"] == "pdf"
    assert data["apps"][0]["features"] == ["Đọc PDF"]

    assert set(data["reviews"][0].keys()) == EXPECTED_REVIEW_KEYS
    assert data["reviews"][0] == {
        "id": "r1", "appId": "com.apero.pdfreader", "score": 1, "date": "2026-11-01", "lang": "vi",
        "content": "Quảng cáo quá nhiều", "painPoints": ["ads"], "wishId": "offline", "thumbsUp": 4,
    }


def test_taxonomy_in_order(client, db):
    data = get_dashboard(client)
    assert data["domains"][0]["id"] == "pdf"
    assert data["painGroups"][0]["id"] == "business"


def test_excludes_foreign_by_default_and_includes_with_flag(client, make_app, make_developer):
    make_app()
    adobe = make_developer(play_developer_id="adobe", display_name="Adobe", status="foreign", company=None)
    make_app(id="com.adobe.reader", developer_account=adobe)

    assert app_ids(get_dashboard(client)) == ["com.apero.pdfreader"]

    with_foreign = get_dashboard(client, include_foreign=True)
    assert sorted(app_ids(with_foreign)) == ["com.adobe.reader", "com.apero.pdfreader"]
    adobe_app = next(app for app in with_foreign["apps"] if app["id"] == "com.adobe.reader")
    assert adobe_app["companyId"] == "dev:adobe"
    assert {"id": "dev:adobe", "name": "Adobe"} in with_foreign["companies"]


def test_excludes_non_vietnamese_company(client, make_app, make_developer, make_company):
    google = make_company(id="google", name="Google", is_vietnamese=False)
    developer = make_developer(play_developer_id="google-dev", company=google)
    make_app(id="com.google.docs", developer_account=developer)
    assert get_dashboard(client)["apps"] == []
    assert get_dashboard(client)["companies"] == []


def test_excludes_app_without_domain_and_skipped_app(client, make_app):
    make_app(id="com.no.domain", domain_id=None)
    make_app(id="com.game", skipped_reason="game", is_game=True)
    make_app(id="com.small", skipped_reason="under_100k", min_installs=50_000)
    assert get_dashboard(client)["apps"] == []


def test_excludes_unlabeled_reviews(client, make_app, make_review):
    app = make_app()
    make_review(app, id="labeled", labeled_at=LABELED_AT)
    make_review(app, id="unlabeled")
    assert [review["id"] for review in get_dashboard(client)["reviews"]] == ["labeled"]


def test_excludes_reviews_of_excluded_apps(client, make_app, make_review):
    app = make_app(domain_id=None)
    make_review(app, id="r1", labeled_at=LABELED_AT)
    assert get_dashboard(client)["reviews"] == []


def test_one_two_star_from_histogram(client, make_app):
    make_app(star_histogram=[100, 50, 25, 200, 600])
    app = get_dashboard(client)["apps"][0]
    assert app["oneStarRatings"] == 100
    assert app["twoStarRatings"] == 50


def test_empty_histogram_gives_zero_counts(client, make_app):
    make_app(star_histogram=[])
    app = get_dashboard(client)["apps"][0]
    assert app["oneStarRatings"] == 0 and app["twoStarRatings"] == 0


def test_updated_at_from_latest_finished_run(client, db):
    older = CrawlRun.objects.create(trigger="app", target="a")
    newer = CrawlRun.objects.create(trigger="app", target="b")
    CrawlRun.objects.filter(id=older.id).update(finished_at=datetime.datetime(2026, 11, 1, 3, tzinfo=datetime.timezone.utc))
    # 20:00 UTC ngày 5/11 = 03:00 sáng 6/11 giờ Việt Nam
    CrawlRun.objects.filter(id=newer.id).update(finished_at=datetime.datetime(2026, 11, 5, 20, tzinfo=datetime.timezone.utc))
    CrawlRun.objects.create(trigger="app", target="still running")
    assert get_dashboard(client)["meta"]["updatedAt"] == "2026-11-06"


def test_updated_at_today_when_no_finished_run(client, db):
    today = timezone.localdate().isoformat()
    assert get_dashboard(client)["meta"]["updatedAt"] == today


def test_query_count_is_constant(client, django_assert_max_num_queries, make_app, make_review):
    for app_number in range(5):
        app = make_app(id=f"com.app{app_number}")
        for review_number in range(5):
            make_review(
                app, id=f"r{app_number}-{review_number}", labeled_at=LABELED_AT, pain_point_ids=["ads", "crash"]
            )
    with django_assert_max_num_queries(12):
        data = get_dashboard(client)
    assert len(data["apps"]) == 5
    assert len(data["reviews"]) == 25
