"""
conftest.py — "Nhà máy" dựng dữ liệu cho test.

pytest tự nạp file này. Mỗi fixture `make_*` trả về một hàm tạo bản ghi với giá trị mặc định hợp lệ;
test chỉ cần truyền những trường nó quan tâm, ví dụ `make_app(min_installs=50_000)`.
"""

import datetime

import pytest

from market.models import App, Company, DeveloperAccount, Review


@pytest.fixture
def make_company(db):
    def create(**fields) -> Company:
        values = {"id": "apero", "name": "Apero", "is_vietnamese": True}
        values.update(fields)
        company, _ = Company.objects.get_or_create(id=values.pop("id"), defaults=values)
        return company

    return create


@pytest.fixture
def make_developer(db, make_company):
    def create(**fields) -> DeveloperAccount:
        values = {
            "play_developer_id": "apero-dev",
            "display_name": "Apero Technologies Group",
            "status": "assigned",
        }
        values.update(fields)
        # Mặc định gán vào công ty Việt "apero"; truyền company=None để tạo tài khoản chưa gán / nước ngoài
        if "company" not in values:
            values["company"] = make_company()
        developer_id = values.pop("play_developer_id")
        developer, _ = DeveloperAccount.objects.update_or_create(
            play_developer_id=developer_id, defaults=values
        )
        return developer

    return create


@pytest.fixture
def make_app(db, make_developer):
    def create(**fields) -> App:
        values = {
            "id": "com.apero.pdfreader",
            "title": "PDF Reader Pro",
            "category": "Productivity",
            "is_game": False,
            "installs_label": "1.000.000+",
            "min_installs": 1_000_000,
            "score": 4.1,
            "ratings": 1000,
            "star_histogram": [100, 50, 50, 200, 600],
            "low_star_ratio": 0.15,
            "contains_ads": True,
            "offers_iap": True,
            "description": "Đọc file PDF",
            "domain_id": "pdf",
        }
        values.update(fields)
        if "developer_account" not in values:
            values["developer_account"] = make_developer()
        return App.objects.create(**values)

    return create


@pytest.fixture
def make_review(db):
    counter = {"next": 1}

    def create(app: App, **fields) -> Review:
        values = {
            "id": f"review-{counter['next']}",
            "lang": "vi",
            "score": 1,
            "date": datetime.date(2026, 11, 1),
            "content": "Quảng cáo quá nhiều",
            "thumbs_up": 0,
        }
        counter["next"] += 1
        values.update(fields)
        pain_point_ids = values.pop("pain_point_ids", None)
        review = Review.objects.create(app=app, **values)
        if pain_point_ids:
            review.pain_points.set(pain_point_ids)
        return review

    return create
