"""
stars.py — Tính toán từ biểu đồ phân bố sao của một app.

Biểu đồ (histogram) là danh sách 5 số lượt chấm: phần tử [0] là 1★, ..., [4] là 5★.
"""

STAR_LEVELS = 5


def star_counts_from_percentages(percentages: list[float], ratings: int) -> list[int]:
    """
    Đổi % của 5 thanh sao sang số lượt chấm.
    Trang web Google Play có thể chỉ hiện độ dài thanh (%), không hiện số.
    Ví dụ: [10, 5, 5, 20, 60] với 1000 lượt chấm -> [100, 50, 50, 200, 600].
    """
    return [round(ratings * percent / 100) for percent in percentages]


def low_star_ratio(histogram: list[int]) -> float:
    """
    Tỉ lệ lượt chấm 1–2★ trên tổng, làm tròn 4 chữ số. Ví dụ [20, 10, 10, 20, 40] -> 0.3.
    Trả 0.0 khi dữ liệu không dùng được (rỗng, sai độ dài, tổng bằng 0) để không chia cho 0.
    """
    if len(histogram) != STAR_LEVELS:
        return 0.0
    total = sum(histogram)
    if total == 0:
        return 0.0
    return round((histogram[0] + histogram[1]) / total, 4)
