"""
label_data.py — Lệnh `python manage.py label_data [--relabel]`.

Gắn lĩnh vực cho app và pain point / mong muốn cho review bằng từ khóa.
Chạy sau mỗi lần cào. Không chạy trong request vì có thể mất vài chục giây khi dữ liệu nhiều.
"""

from django.core.management.base import BaseCommand

from market.services.labeling import label_app_domains, label_reviews


class Command(BaseCommand):
    help = "Gắn nhãn lĩnh vực cho app và pain point / mong muốn cho review bằng từ khóa."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--relabel",
            action="store_true",
            help="Gắn lại cả những gì đã gắn (trừ nhãn sửa tay). Dùng sau khi sửa từ khóa trong admin.",
        )

    def handle(self, *args, **options) -> None:
        relabel = options["relabel"]

        labeled_app_count, unmatched_apps = label_app_domains(relabel=relabel)
        self.stdout.write(f"Đã gán lĩnh vực cho {labeled_app_count} app.")
        if unmatched_apps:
            self.stdout.write(
                f"Có {len(unmatched_apps)} app chưa khớp lĩnh vực nào "
                "(gán tay trong admin, hoặc thêm từ khóa cho lĩnh vực rồi chạy lại):"
            )
            for app in unmatched_apps:
                self.stdout.write(f"  {app.id} — {app.title}")

        labeled_review_count = label_reviews(relabel=relabel)
        self.stdout.write(f"Đã gắn nhãn {labeled_review_count} review.")
