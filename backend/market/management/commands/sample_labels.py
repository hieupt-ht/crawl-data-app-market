"""
sample_labels.py — Lệnh `python manage.py sample_labels [--n 50] [--seed 0]`.

In ngẫu nhiên N review đã gắn nhãn để bạn đọc và đếm xem bộ gắn nhãn đúng bao nhiêu phần trăm.
Cùng `--seed` thì ra cùng một mẫu, để hai người có thể chấm cùng một bộ.
"""

import random

from django.core.management.base import BaseCommand

from market.models import Review

CONTENT_PREVIEW_LENGTH = 200
TARGET_ACCURACY = "70%"


class Command(BaseCommand):
    help = "In ngẫu nhiên N review đã gắn nhãn để kiểm tra chất lượng nhãn bằng mắt."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--n", type=int, default=50, help="Số review cần in (mặc định 50).")
        parser.add_argument("--seed", type=int, default=0, help="Hạt giống ngẫu nhiên (mặc định 0).")

    def handle(self, *args, **options) -> None:
        labeled_ids = list(Review.objects.filter(labeled_at__isnull=False).order_by("id").values_list("id", flat=True))
        sample_size = min(options["n"], len(labeled_ids))
        # random.Random(seed): bộ sinh số ngẫu nhiên riêng, cùng seed thì cùng kết quả
        sample_ids = random.Random(options["seed"]).sample(labeled_ids, sample_size)

        # prefetch_related: lấy pain point của mọi review trong mẫu bằng một truy vấn, thay vì mỗi review một lần
        reviews = Review.objects.filter(id__in=sample_ids).select_related("wish").prefetch_related("pain_points")
        reviews_by_id = {review.id: review for review in reviews}

        for review_id in sample_ids:
            self._print_review(reviews_by_id[review_id])

        self.stdout.write(f"Đã in {sample_size} review. Đếm số review gắn nhãn đúng; mục tiêu ≥ {TARGET_ACCURACY}.")

    def _print_review(self, review: Review) -> None:
        pain_names = [pain.name for pain in review.pain_points.all()]
        self.stdout.write(f"[{review.lang}] {review.app_id}")
        self.stdout.write(f"  {review.content[:CONTENT_PREVIEW_LENGTH]}")
        self.stdout.write(f"  Pain point: {', '.join(pain_names) if pain_names else '(không có)'}")
        self.stdout.write(f"  Mong muốn: {review.wish.name if review.wish else '(không có)'}")
        self.stdout.write("")
