"""
text.py — Chuẩn hóa chữ để so từ khóa, không phụ thuộc hoa/thường, và xử lý đúng chuyện có dấu / không dấu.

Vấn đề: người dùng có khi gõ không dấu ("QUANG CAO QUA NHIEU"), nhưng nếu lúc nào cũng bỏ dấu
thì nhiều từ khác nghĩa thành giống nhau: "do" = "đơ", "chấm" = "chậm", "rồi" = "rối", "mở" = "mờ".
Cách làm:
  - review gõ CÓ dấu  → so có dấu ("chấm 1 sao" không khớp từ khóa "chậm");
  - review gõ KHÔNG dấu → bỏ dấu cả từ khóa rồi mới so ("cham qua" khớp "chậm").
"""

import re
import unicodedata


def fold_case(text: str) -> str:
    """
    Chữ thường, gộp khoảng trắng, GIỮ dấu. Ví dụ: "  Quảng   CÁO " -> "quảng cáo".
    NFC: gộp "a" + dấu hỏi rời thành một ký tự "ả", để hai cách gõ dấu khác nhau vẫn so bằng nhau.
    """
    composed = unicodedata.normalize("NFC", text.lower())
    return " ".join(composed.split())


def normalize(text: str) -> str:
    """
    Chữ thường, BỎ dấu tiếng Việt, gộp khoảng trắng. Ví dụ: "  Quảng   CÁO " -> "quang cao".

    Cách bỏ dấu: NFD tách "ả" thành "a" + dấu hỏi (ký tự "combining"), rồi bỏ các ký tự combining.
    Riêng "đ" không tách được theo cách đó nên phải đổi tay sang "d".
    """
    decomposed = unicodedata.normalize("NFD", text.lower())
    without_marks = "".join(char for char in decomposed if not unicodedata.combining(char))
    without_marks = without_marks.replace("đ", "d")
    return " ".join(without_marks.split())


def has_diacritics(text: str) -> bool:
    """True nếu chữ có ít nhất một dấu tiếng Việt (hoặc chữ "đ") — tức người viết đang gõ có dấu."""
    return normalize(text) != fold_case(text)


def prepare_for_matching(text: str) -> str:
    """
    Đưa nội dung review về dạng để so từ khóa: có dấu thì giữ dấu, không dấu thì vẫn là không dấu.
    Gọi một lần cho mỗi review, rồi dùng kết quả cho mọi `contains_keyword`.
    """
    return fold_case(text)


def contains_keyword(prepared_text: str, keyword: str) -> bool:
    """
    True nếu `keyword` xuất hiện như một từ (hoặc cụm từ) trọn vẹn trong `prepared_text`
    (kết quả của `prepare_for_matching`).

    - Chữ có dấu: so với từ khóa có dấu. Chữ không dấu: so với từ khóa đã bỏ dấu.
    - `\\b` là "ranh giới từ": nhờ nó "ads" khớp "too many ads" nhưng KHÔNG khớp "downloads".
    - `re.escape` để từ khóa có ký tự đặc biệt (vd "c++") không bị hiểu là cú pháp regex.
    """
    if has_diacritics(prepared_text):
        prepared_keyword = fold_case(keyword)
    else:
        prepared_keyword = normalize(keyword)
    if not prepared_keyword:
        return False
    pattern = r"\b" + re.escape(prepared_keyword) + r"\b"
    return re.search(pattern, prepared_text) is not None
