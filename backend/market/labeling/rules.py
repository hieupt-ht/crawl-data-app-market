"""
rules.py — Gắn nhãn bằng từ khóa (cách "rules": miễn phí, chạy ngay, dễ hiểu).

Các hàm ở đây là hàm thuần: chỉ nhận chữ + danh sách nhãn, trả id nhãn; KHÔNG đọc database.
Nhờ vậy sau này bộ gắn nhãn bằng AI (LLM) có thể thay thế với cùng đầu vào / đầu ra.

Hạn chế cần biết khi đọc kết quả:
- Không hiểu câu phủ định: "không có quảng cáo" vẫn bị gắn nhãn `ads`.
- Không hiểu mỉa mai, và bỏ sót khi người dùng diễn đạt bằng từ không có trong danh sách.
- Review gõ có dấu được so CÓ dấu (để "do" không khớp "đơ", "chấm" không khớp "chậm").
  Review gõ KHÔNG dấu thì phải bỏ dấu để so, nên vẫn còn nhầm kiểu "toi go app do qc" → `crash` ("đơ").
Vì vậy cần lệnh `sample_labels` để đọc thử và đếm tỉ lệ đúng.
"""

from market.labeling.text import contains_keyword, prepare_for_matching

# Một nhãn = (id, danh sách từ khóa), ví dụ ("ads", ["quảng cáo", "ads"])
Label = tuple[str, list[str]]

TITLE_WEIGHT = 3  # Từ khóa nằm trong tên app nói rõ lĩnh vực hơn hẳn từ khóa trong mô tả
DESCRIPTION_WEIGHT = 1


def matches_any(normalized_text: str, keywords: list[str]) -> bool:
    """True nếu chữ chứa ít nhất một từ khóa."""
    for keyword in keywords:
        if contains_keyword(normalized_text, keyword):
            return True
    return False


def count_matched_keywords(normalized_text: str, keywords: list[str]) -> int:
    """Số từ khóa (khác nhau) có trong chữ. Một từ khóa lặp 5 lần vẫn chỉ tính 1."""
    count = 0
    for keyword in keywords:
        if contains_keyword(normalized_text, keyword):
            count += 1
    return count


def label_review(content: str, pain_labels: list[Label], wish_labels: list[Label]) -> tuple[list[str], str | None]:
    """
    Trả (mọi pain point khớp — theo thứ tự của `pain_labels`, mong muốn ĐẦU TIÊN khớp hoặc None).
    Ví dụ: "Quảng cáo nhiều, hay văng app" -> (["ads", "crash"], None).
    """
    text = prepare_for_matching(content)

    pain_ids = []
    for pain_id, keywords in pain_labels:
        if matches_any(text, keywords):
            pain_ids.append(pain_id)

    wish_id = None
    for candidate_id, keywords in wish_labels:
        if matches_any(text, keywords):
            wish_id = candidate_id
            break

    return pain_ids, wish_id


def label_app_domain(title: str, description: str, category: str, domain_labels: list[Label]) -> str | None:
    """
    Chọn lĩnh vực cho app. Điểm = 3 × số từ khóa khớp trong tên + 1 × số từ khóa khớp trong mô tả và thể loại.
    Lấy lĩnh vực điểm cao nhất (> 0); hòa thì lấy lĩnh vực đứng trước; không khớp gì thì None.
    """
    title_text = prepare_for_matching(title)
    body_text = prepare_for_matching(description + " " + category)

    best_domain_id = None
    best_score = 0
    for domain_id, keywords in domain_labels:
        score = (
            TITLE_WEIGHT * count_matched_keywords(title_text, keywords)
            + DESCRIPTION_WEIGHT * count_matched_keywords(body_text, keywords)
        )
        # Dùng ">" (không phải ">="): hòa điểm thì giữ lĩnh vực đứng trước trong danh sách
        if score > best_score:
            best_domain_id = domain_id
            best_score = score
    return best_domain_id
