"""Test quy tắc: sửa nhãn tay trong admin thì nhãn được đánh dấu "manual" để lệnh tự động không ghi đè."""

from django.contrib.admin.sites import AdminSite

from market.admin import AppAdmin, ReviewAdmin
from market.models import App, Review


class FakeForm:
    """Giả lập form admin: chỉ cần biết những trường nào đã bị người dùng sửa."""

    def __init__(self, changed_data):
        self.changed_data = changed_data


def test_changing_domain_in_admin_marks_manual(make_app):
    app = make_app(domain_source="rules")
    app.domain_id = "music"
    AppAdmin(App, AdminSite()).save_model(request=None, obj=app, form=FakeForm(["domain"]), change=True)
    app.refresh_from_db()
    assert app.domain_source == "manual"


def test_saving_app_without_domain_change_keeps_source(make_app):
    app = make_app(domain_source="rules")
    app.title = "Tên mới"
    AppAdmin(App, AdminSite()).save_model(request=None, obj=app, form=FakeForm(["title"]), change=True)
    app.refresh_from_db()
    assert app.domain_source == "rules"


def test_changing_review_labels_in_admin_marks_manual(make_app, make_review):
    review = make_review(make_app(), label_source="rules")
    ReviewAdmin(Review, AdminSite()).save_model(request=None, obj=review, form=FakeForm(["pain_points"]), change=True)
    review.refresh_from_db()
    assert review.label_source == "manual"
