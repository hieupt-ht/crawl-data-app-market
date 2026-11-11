"""
Test hai lệnh manage.py: `label_data` (gắn nhãn) và `sample_labels` (in mẫu để đọc kiểm tra).

`call_command` chạy lệnh ngay trong test; `StringIO` hứng chữ lệnh in ra để kiểm.
"""

import datetime
from io import StringIO

from django.core.management import call_command

from market.models import App, Review

LABELED_AT = datetime.datetime(2026, 11, 2, tzinfo=datetime.timezone.utc)


def run_command(name: str, *args) -> str:
    output = StringIO()
    call_command(name, *args, stdout=output)
    return output.getvalue()


def test_label_data_labels_reviews_and_domain(make_app, make_review):
    app = make_app(domain_id=None, title="PDF Reader", description="", category="")
    make_review(app, id="r1", content="quảng cáo quá nhiều")
    make_review(app, id="r2", content="tệ")

    output = run_command("label_data")

    app.refresh_from_db()
    assert app.domain_id == "pdf"
    assert app.domain_source == "rules"
    first = Review.objects.get(id="r1")
    assert list(first.pain_points.values_list("id", flat=True)) == ["ads"]
    assert first.labeled_at is not None
    assert first.label_source == "rules"
    # Review không khớp nhãn nào vẫn được đánh dấu đã gắn nhãn, để lên dashboard và không bị xử lý lại
    second = Review.objects.get(id="r2")
    assert second.labeled_at is not None
    assert second.pain_points.count() == 0
    assert "1 app" in output
    assert "2 review" in output


def test_label_data_sets_wish(make_app, make_review):
    app = make_app()
    make_review(app, id="r1", content="Mong có chế độ offline")
    run_command("label_data")
    assert Review.objects.get(id="r1").wish_id == "offline"


def test_label_data_skips_manual(make_app, make_review):
    app = make_app(domain_id="music", domain_source="manual", title="PDF Reader")
    make_review(app, id="manual", content="quảng cáo quá nhiều", pain_point_ids=["crash"],
                label_source="manual", labeled_at=LABELED_AT)

    run_command("label_data", "--relabel")

    app.refresh_from_db()
    assert app.domain_id == "music"
    assert list(Review.objects.get(id="manual").pain_points.values_list("id", flat=True)) == ["crash"]


def test_label_data_skips_skipped_apps(make_app):
    make_app(id="com.game", domain_id=None, title="PDF Game", skipped_reason="game", is_game=True)
    run_command("label_data")
    assert App.objects.get(id="com.game").domain_id is None


def test_label_data_relabel_replaces_rules_labels(make_app, make_review):
    app = make_app()
    make_review(app, id="r1", content="hay văng app", pain_point_ids=["ads"],
                label_source="rules", labeled_at=LABELED_AT)
    run_command("label_data", "--relabel")
    assert list(Review.objects.get(id="r1").pain_points.values_list("id", flat=True)) == ["crash"]


def test_label_data_reports_unmatched_app(make_app):
    make_app(id="com.flash", title="Flashlight", description="bright light", category="Tools", domain_id=None)
    output = run_command("label_data")
    assert "com.flash — Flashlight" in output
    assert App.objects.get(id="com.flash").domain_id is None


def test_label_data_idempotent_without_relabel(make_app, make_review):
    app = make_app()
    make_review(app, content="quảng cáo")
    run_command("label_data")
    output = run_command("label_data")
    assert "0 review" in output


def test_sample_labels_prints_n(make_app, make_review):
    app = make_app()
    for number in range(3):
        make_review(app, id=f"r{number}", labeled_at=LABELED_AT, pain_point_ids=["ads"])
    make_review(app, id="unlabeled")

    output = run_command("sample_labels", "--n", "2")

    blocks = [line for line in output.splitlines() if line.startswith("[vi] ")]
    assert len(blocks) == 2
    assert "Quảng cáo quá nhiều" in output
    assert "unlabeled" not in output
    assert "≥ 70%" in output


def test_sample_labels_same_seed_same_result(make_app, make_review):
    app = make_app()
    for number in range(10):
        make_review(app, id=f"r{number}", content=f"review số {number}", labeled_at=LABELED_AT)
    assert run_command("sample_labels", "--n", "3", "--seed", "7") == run_command("sample_labels", "--n", "3", "--seed", "7")
