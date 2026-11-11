"""
labeling.py — Chạy bộ gắn nhãn (market/labeling/rules.py) trên dữ liệu trong database.

Lệnh `manage.py label_data` gọi các hàm ở đây. Quy tắc quan trọng nhất:
nhãn sửa tay (`manual`) KHÔNG BAO GIỜ bị ghi đè, kể cả khi chạy với --relabel.
"""

from django.db import transaction
from django.utils import timezone

from market.labeling.rules import Label, label_app_domain, label_review
from market.models import App, Domain, PainPoint, Review, Wish

REVIEW_BATCH_SIZE = 500


def load_labels(model) -> list[Label]:
    """Đọc bảng nhãn (Domain / PainPoint / Wish) thành list (id, keywords), theo thứ tự `order`."""
    labels = []
    for row in model.objects.all():
        labels.append((row.id, row.keywords))
    return labels


# ---------------------------------------------------------------------------
# Lĩnh vực của app
# ---------------------------------------------------------------------------


def label_app_domains(relabel: bool = False) -> tuple[int, list[App]]:
    """
    Gán lĩnh vực cho app chưa có (hoặc mọi app nếu `relabel`), bỏ qua app bị loại và app gán tay.
    Trả (số app được gán, danh sách app vẫn chưa có lĩnh vực vì không khớp từ khóa nào).
    """
    domain_labels = load_labels(Domain)
    apps = App.objects.filter(skipped_reason="").exclude(domain_source="manual")
    if not relabel:
        apps = apps.filter(domain__isnull=True)

    labeled_count = 0
    unmatched_apps = []
    for app in apps:
        domain_id = label_app_domain(app.title, app.description, app.category, domain_labels)
        if domain_id is None:
            if app.domain_id is None:
                unmatched_apps.append(app)
            continue
        app.domain_id = domain_id
        app.domain_source = "rules"
        app.save(update_fields=["domain", "domain_source"])
        labeled_count += 1
    return labeled_count, unmatched_apps


# ---------------------------------------------------------------------------
# Pain point và mong muốn của review
# ---------------------------------------------------------------------------


def label_reviews(relabel: bool = False) -> int:
    """
    Gắn pain point + mong muốn cho review chưa gắn (hoặc mọi review nếu `relabel`), trừ review sửa tay.
    Review không khớp nhãn nào vẫn được đặt `labeled_at`, để lên dashboard và lần sau không xử lý lại.
    Trả số review đã gắn nhãn.
    """
    pain_labels = load_labels(PainPoint)
    wish_labels = load_labels(Wish)

    reviews = Review.objects.exclude(label_source="manual")
    if not relabel:
        reviews = reviews.filter(labeled_at__isnull=True)
    # only(): chỉ lấy 2 cột cần dùng, đỡ tốn bộ nhớ khi có hàng chục nghìn review
    review_list = list(reviews.only("id", "content").order_by("id"))

    for start in range(0, len(review_list), REVIEW_BATCH_SIZE):
        _label_review_batch(review_list[start : start + REVIEW_BATCH_SIZE], pain_labels, wish_labels)
    return len(review_list)


def _label_review_batch(batch: list[Review], pain_labels: list[Label], wish_labels: list[Label]) -> None:
    """
    Gắn nhãn một lô review và ghi bằng vài câu SQL cho cả lô (thay vì vài câu cho MỖI review).
    transaction.atomic(): lỗi giữa chừng thì cả lô không đổi gì, không có review "gắn nhãn một nửa".
    """
    PainLink = Review.pain_points.through  # bảng trung gian của quan hệ nhiều-nhiều review ↔ pain point
    now = timezone.now()

    new_links = []
    for review in batch:
        pain_ids, wish_id = label_review(review.content, pain_labels, wish_labels)
        review.wish_id = wish_id
        review.labeled_at = now
        review.label_source = "rules"
        for pain_id in pain_ids:
            new_links.append(PainLink(review_id=review.id, painpoint_id=pain_id))

    batch_ids = [review.id for review in batch]
    with transaction.atomic():
        # Xóa nhãn cũ của lô rồi ghi nhãn mới (quan trọng khi chạy --relabel)
        PainLink.objects.filter(review_id__in=batch_ids).delete()
        PainLink.objects.bulk_create(new_links)
        # bulk_update: cập nhật 3 cột cho cả lô bằng một câu UPDATE
        Review.objects.bulk_update(batch, ["wish", "labeled_at", "label_source"])
