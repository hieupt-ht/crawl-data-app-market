"""
text.py — Chuẩn hóa chữ để so từ khóa, không phụ thuộc hoa/thường hay dấu tiếng Việt.

Người dùng hay gõ không dấu hoặc viết hoa ("QUANG CAO QUA NHIEU"), nên cả nội dung review
lẫn từ khóa đều được đưa về cùng một dạng trước khi so: chữ thường, không dấu, một khoảng trắng.
"""

import re
import unicodedata


def normalize(text: str) -> str:
    """
    Chữ thường, bỏ dấu tiếng Việt, gộp khoảng trắng. Ví dụ: "  Quảng   CÁO " -> "quang cao".

    Cách bỏ dấu: NFD tách "ả" thành "a" + dấu hỏi (ký tự "combining"), rồi bỏ các ký tự combining.
    Riêng "đ" không tách được theo cách đó nên phải đổi tay sang "d".
    """
    decomposed = unicodedata.normalize("NFD", text.lower())
    without_marks = "".join(char for char in decomposed if not unicodedata.combining(char))
    without_marks = without_marks.replace("đ", "d")
    return " ".join(without_marks.split())


def contains_keyword(normalized_text: str, keyword: str) -> bool:
    """
    True nếu `keyword` xuất hiện như một từ (hoặc cụm từ) trọn vẹn trong `normalized_text`.

    `\b` là "ranh giới từ": nhờ nó "ads" khớp "too many ads" nhưng KHÔNG khớp "downloads".
    `re.escape` để từ khóa có ký tự đặc biệt (vd "c++") không bị hiểu là cú pháp regex.
    """
    normalized_keyword = normalize(keyword)
    if not normalized_keyword:
        return False
    pattern = r"\b" + re.escape(normalized_keyword) + r"\b"
    return re.search(pattern, normalized_text) is not None
