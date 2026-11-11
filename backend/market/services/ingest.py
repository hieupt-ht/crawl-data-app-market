"""
ingest.py — Lưu dữ liệu extension cào được vào database.

Luồng: extension gửi JSON → serializer kiểm tra (market/api/serializers.py) → các hàm ở đây ghi vào bảng.
Nguyên tắc: cào lại bao nhiêu lần cũng được, KHÔNG làm mất những gì người dùng đã sửa tay
(công ty của tài khoản developer, lĩnh vực gán tay, tính năng của app).
"""

from django.db import transaction
from django.utils import timezone

from market.models import App, DeveloperAccount, Review
from market.services.scope import skipped_reason_for
from market.services.stars import low_star_ratio, star_counts_from_percentages


def upsert_developer(developer: dict) -> DeveloperAccount:
    """
    Tạo tài khoản developer nếu chưa có (trạng thái "chưa gán").
    Nếu đã có thì chỉ cập nhật tên hiển thị và link — không đụng công ty và trạng thái đã gán.
    """
    account, is_new = DeveloperAccount.objects.get_or_create(
        play_developer_id=developer["play_developer_id"],
        defaults={
            "display_name": developer["display_name"],
            "play_url": developer.get("play_url", ""),
            "status": "unassigned",
        },
    )
    if is_new:
        return account

    account.display_name = developer["display_name"]
    if "play_url" in developer:
        account.play_url = developer["play_url"]
    # update_fields: chỉ ghi hai cột này, để chắc chắn không ghi đè company/status
    account.save(update_fields=["display_name", "play_url"])
    return account


def build_star_histogram(data: dict) -> list[int]:
    """
    Lấy 5 số lượt chấm sao. Ưu tiên `star_histogram` (số thật);
    nếu extension chỉ đọc được độ dài thanh (%) thì đổi `star_percentages` ra số lượt.
    """
    if data.get("star_histogram"):
        return list(data["star_histogram"])
    return star_counts_from_percentages(data["star_percentages"], data["ratings"])


def upsert_app(data: dict, developer: dict, raw_payload: dict | None = None) -> App:
    """
    Tạo hoặc cập nhật một app từ dữ liệu extension gửi lên (đã qua serializer).

    - `data`: phần "app" của body; `developer`: phần "developer".
    - `raw_payload`: body gốc nguyên vẹn, lưu lại phòng khi sau này cần đọc trường mới.
    Không đụng `domain`, `domain_source`, `features` vì đó là kết quả gắn nhãn / sửa tay.
    """
    histogram = build_star_histogram(data)
    crawled_fields = {
        "title": data["title"],
        "category": data.get("category", ""),
        "is_game": data["is_game"],
        "installs_label": data["installs_label"],
        "min_installs": data["min_installs"],
        "score": data["score"],
        "ratings": data["ratings"],
        "star_histogram": histogram,
        "low_star_ratio": low_star_ratio(histogram),
        "contains_ads": data["contains_ads"],
        "offers_iap": data["offers_iap"],
        "description": data.get("description", ""),
        "skipped_reason": skipped_reason_for(data["min_installs"], data["is_game"]),
        "raw_payload": raw_payload if raw_payload is not None else {"developer": developer, "app": data},
        "last_crawled_at": timezone.now(),
    }

    # transaction.atomic(): nếu lỗi giữa chừng (vd lưu app hỏng) thì tài khoản developer cũng không được lưu
    with transaction.atomic():
        account = upsert_developer(developer)
        crawled_fields["developer_account"] = account
        app, _ = App.objects.update_or_create(id=data["id"], defaults=crawled_fields)
    return app


def add_reviews(app: App, lang: str, reviews: list[dict]) -> tuple[int, int]:
    """
    Thêm một đợt review (đã qua serializer) cho app ở lượt cào `lang`. Trả (số tạo mới, số trùng).

    Review "trùng" = id đã có trong database ở BẤT KỲ lượt nào, hoặc lặp lại ngay trong đợt này.
    Gặp trùng thì giữ bản thấy đầu tiên, nên gửi lại cùng đợt bao nhiêu lần cũng không sinh bản sao,
    và review đã lưu ở lượt "vi" vẫn giữ lang "vi" khi lượt "en" gặp lại nó.
    """
    incoming_ids = [item["id"] for item in reviews]
    # Một truy vấn lấy các id đã có, thay vì hỏi database từng review một
    existing_ids = set(Review.objects.filter(id__in=incoming_ids).values_list("id", flat=True))

    new_reviews = []
    seen_ids = set(existing_ids)
    for item in reviews:
        if item["id"] in seen_ids:
            continue
        seen_ids.add(item["id"])
        new_reviews.append(
            Review(
                id=item["id"],
                app=app,
                lang=lang,
                score=item["score"],
                date=item["date"],
                content=item["content"],
                thumbs_up=item.get("thumbs_up", 0),
                raw_payload=item.get("raw_payload", {}),
            )
        )

    # bulk_create: ghi tất cả review mới bằng một câu lệnh INSERT, nhanh hơn nhiều so với .save() từng cái
    with transaction.atomic():
        Review.objects.bulk_create(new_reviews)

    created_count = len(new_reviews)
    return created_count, len(reviews) - created_count
