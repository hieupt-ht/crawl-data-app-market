"""
Test bộ gắn nhãn bằng từ khóa — hàm thuần, không cần database.
"""

from market.labeling.rules import label_app_domain, label_review
from market.labeling.text import contains_keyword, normalize
from market.taxonomy_seed import PAIN_POINTS

PAINS = [("ads", ["quảng cáo", "ads"]), ("crash", ["văng", "crash"])]
WISHES = [("offline", ["offline", "không cần mạng"]), ("fewer_ads", ["ít quảng cáo"])]


def test_normalize_removes_diacritics_case_and_extra_spaces():
    assert normalize("  Quảng   CÁO  Đầy\nmàn hình ") == "quang cao day man hinh"


def test_contains_keyword_word_boundary():
    assert contains_keyword(normalize("Too many ADS!"), "ads") is True
    assert contains_keyword(normalize("downloads"), "ads") is False


def test_matches_without_diacritics_and_uppercase():
    assert label_review("QUANG CAO QUA NHIEU", PAINS, WISHES)[0] == ["ads"]


def test_ads_not_matched_inside_downloads():
    assert label_review("too many downloads needed", PAINS, WISHES)[0] == []


def test_multiple_pains_and_first_wish():
    assert label_review("Quảng cáo nhiều, hay văng app. Mong có offline", PAINS, WISHES) == (["ads", "crash"], "offline")


def test_pains_keep_label_order_not_text_order():
    assert label_review("crash rồi lại quảng cáo", PAINS, WISHES)[0] == ["ads", "crash"]


def test_no_match():
    assert label_review("tệ", PAINS, WISHES) == ([], None)


def test_domain_title_weighs_more():
    domains = [("pdf", ["pdf"]), ("scanner", ["scan", "quét"])]
    assert label_app_domain("PDF Reader", "scan documents, scan qr", "Productivity", domains) == "pdf"  # 3 > 2


def test_domain_counts_each_keyword_once():
    # "scan" xuất hiện 2 lần trong mô tả nhưng chỉ tính 1 từ khóa khớp → scanner được 1 điểm
    domains = [("scanner", ["scan", "quét"]), ("pdf", ["pdf", "document"])]
    assert label_app_domain("Tiện ích", "scan scan, pdf document", "Tools", domains) == "pdf"


def test_domain_tie_takes_first_in_list():
    domains = [("pdf", ["pdf"]), ("scanner", ["scan"])]
    assert label_app_domain("App", "pdf scan", "Tools", domains) == "pdf"


def test_domain_uses_category():
    assert label_app_domain("Something", "", "Music & Audio", [("music", ["music"])]) == "music"


def test_domain_none_when_no_keyword():
    assert label_app_domain("Flashlight", "bright light", "Tools", [("pdf", ["pdf"])]) is None


# ---------------------------------------------------------------------------
# Bộ từ khóa khởi đầu thật + câu tiếng Việt thường gặp (review cuối nhánh, lỗi C1):
# bỏ dấu làm "do" = "đơ", "chấm" = "chậm", "rồi" = "rối", "mở" = "mờ"... nên phải so CÓ dấu
# khi review được gõ có dấu.
# ---------------------------------------------------------------------------

SEED_PAINS = [(item["id"], item["keywords"]) for item in PAIN_POINTS]


def seed_pains_of(content: str) -> list[str]:
    return label_review(content, SEED_PAINS, [])[0]


def test_seed_accented_common_words_do_not_match():
    assert seed_pains_of("Mình chấm 1 sao vì quảng cáo") == ["ads"]
    assert "crash" not in seed_pains_of("Tôi gỡ app do quảng cáo nhiều")
    assert "crash" not in seed_pains_of("Vâng, app rất tốt nhưng nhiều quảng cáo")
    assert seed_pains_of("Cài rồi mà không mở được file") == ["crash"]
    assert seed_pains_of("Lời bài hát sai") == []


def test_seed_accented_real_complaints_still_match():
    assert seed_pains_of("App bị đơ liên tục") == ["crash"]
    assert seed_pains_of("Chạy chậm quá") == ["slow"]
    assert seed_pains_of("Ảnh xuất ra bị mờ") == ["ai_bad"]
    assert seed_pains_of("Giao diện rối") == ["ux"]


def test_seed_unaccented_review_still_matches():
    assert seed_pains_of("QUANG CAO QUA NHIEU") == ["ads"]
    assert seed_pains_of("app cham qua") == ["slow"]


def test_seed_admin_address_and_interjection_not_labels():
    assert seed_pains_of("Ad ơi sửa giúp em với") == []
    assert seed_pains_of("ui, app này hay ghê") == []
