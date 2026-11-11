"""Test cho các bảng dữ liệu, taxonomy nạp sẵn, hàm tính sao và hàm xét phạm vi."""

from market.models import Domain, PainGroup, PainPoint, Wish
from market.services.scope import is_in_scope, skipped_reason_for
from market.services.stars import low_star_ratio, star_counts_from_percentages


def test_taxonomy_seeded(db):
    assert Domain.objects.count() == 8
    assert PainGroup.objects.count() == 3
    assert PainPoint.objects.count() == 10
    assert Wish.objects.count() == 15
    assert PainPoint.objects.get(id="ads").group_id == "business"
    assert "quảng cáo" in PainPoint.objects.get(id="ads").keywords


def test_taxonomy_keeps_mock_order(db):
    assert list(Domain.objects.values_list("id", flat=True))[:2] == ["pdf", "ai_photo"]


def test_low_star_ratio_normal():
    assert low_star_ratio([20, 10, 10, 20, 40]) == 0.3


def test_low_star_ratio_empty_or_zero():
    assert low_star_ratio([]) == 0.0
    assert low_star_ratio([0, 0, 0, 0, 0]) == 0.0


def test_low_star_ratio_wrong_length():
    assert low_star_ratio([1, 2, 3]) == 0.0


def test_star_counts_from_percentages():
    assert star_counts_from_percentages([10, 5, 5, 20, 60], 1000) == [100, 50, 50, 200, 600]


def test_skipped_reason():
    assert skipped_reason_for(50_000, False) == "under_100k"
    assert skipped_reason_for(5_000_000, True) == "game"
    assert skipped_reason_for(50_000, True) == "game"
    assert skipped_reason_for(100_000, False) == ""


def test_scope(make_app, make_developer):
    assert is_in_scope(make_app()) is True

    foreign = make_developer(play_developer_id="adobe", status="foreign", company=None)
    assert is_in_scope(make_app(id="com.adobe.reader", developer_account=foreign)) is False

    unassigned = make_developer(play_developer_id="x", status="unassigned", company=None)
    assert is_in_scope(make_app(id="com.x", developer_account=unassigned)) is False


def test_scope_non_vietnamese_company(make_app, make_developer, make_company):
    company = make_company(id="adobe-inc", name="Adobe", is_vietnamese=False)
    developer = make_developer(play_developer_id="adobe", company=company, status="assigned")
    assert is_in_scope(make_app(id="com.adobe.reader", developer_account=developer)) is False
