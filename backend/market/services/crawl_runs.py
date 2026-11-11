"""
crawl_runs.py — Nhật ký lần cào và "trạng thái cào" của từng app.

Trạng thái cào cho extension biết review mới nhất đã lưu là gì, để lần cào sau
cuộn tới đó thì dừng (chỉ lấy review mới, không cào lại từ đầu).
"""

from django.utils import timezone

from market.models import CrawlRun, Review


def update_crawl_run(run: CrawlRun, stats: dict | None, errors: list | None, is_finished: bool) -> CrawlRun:
    """Ghi thống kê / lỗi extension gửi lên; `is_finished` thì đóng lần cào bằng giờ hiện tại."""
    if stats is not None:
        run.stats = stats
    if errors is not None:
        run.errors = errors
    if is_finished:
        run.finished_at = timezone.now()
    run.save()
    return run


def get_crawl_state(app_id: str, lang: str, score: int | None = None) -> dict:
    """
    Review mới nhất đã lưu của một app ở một lượt cào (vi/en), có thể lọc thêm theo số sao.
    Ví dụ: {"latest_review_id": "gp:abc", "latest_review_date": "2026-11-05", "review_count": 12}.
    """
    # QuerySet là truy vấn "lười": dòng này chưa chạy SQL, chỉ khi gọi .count() / .first() mới chạy
    reviews = Review.objects.filter(app_id=app_id, lang=lang)
    if score is not None:
        reviews = reviews.filter(score=score)

    # Cùng ngày thì review lưu sau (created_at lớn hơn) được coi là mới hơn
    latest = reviews.order_by("-date", "-created_at").first()
    return {
        "latest_review_id": latest.id if latest else None,
        "latest_review_date": latest.date.isoformat() if latest else None,
        "review_count": reviews.count(),
    }
