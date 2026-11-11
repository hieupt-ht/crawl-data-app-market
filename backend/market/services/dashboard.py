"""
dashboard.py — Dựng dữ liệu cho GET /api/dashboard/.

Kết quả là một dict có ĐÚNG hình dạng `DashboardData` trong frontend/src/lib/types.ts
(tên trường camelCase), để Next.js dùng thẳng, không phải đổi gì.

Chỉ đưa ra dữ liệu "đã xong": app có lĩnh vực, không bị loại, thuộc studio Việt (trừ khi include_foreign),
và review đã được gắn nhãn. Nhờ vậy dashboard không hiện dữ liệu dở dang.
"""

from collections import defaultdict

from django.utils import timezone

from market.models import App, Company, CrawlRun, Domain, PainGroup, PainPoint, Review, Wish
from market.services.scope import is_in_scope

DATA_SOURCE = "Google Play (tự cào bằng extension)"
# Tiền tố companyId cho app chưa có công ty (tài khoản nước ngoài / chưa gán)
UNASSIGNED_COMPANY_PREFIX = "dev:"


def build_dashboard_data(include_foreign: bool = False) -> dict:
    """Trả dict DashboardData. `include_foreign=True` thì đưa cả app ngoài studio Việt vào để so sánh."""
    apps = _included_apps(include_foreign)
    app_ids = [app.id for app in apps]
    return {
        "meta": {"updatedAt": _updated_at(), "source": DATA_SOURCE},
        "companies": _companies_of(apps),
        "domains": [{"id": domain.id, "name": domain.name} for domain in Domain.objects.all()],
        "painGroups": [{"id": group.id, "name": group.name} for group in PainGroup.objects.all()],
        "painPoints": [
            {"id": pain.id, "name": pain.name, "group": pain.group_id} for pain in PainPoint.objects.all()
        ],
        "wishes": [{"id": wish.id, "name": wish.name} for wish in Wish.objects.all()],
        "apps": [_serialize_app(app) for app in apps],
        "reviews": _labeled_reviews(app_ids),
    }


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------


def _included_apps(include_foreign: bool) -> list[App]:
    """App được đưa lên dashboard: không bị loại, đã có lĩnh vực, và thuộc studio Việt (hoặc include_foreign)."""
    # select_related: lấy luôn tài khoản developer + công ty bằng JOIN trong cùng một truy vấn,
    # tránh lỗi "N+1" (100 app thì thêm 100 truy vấn hỏi công ty)
    candidates = App.objects.filter(skipped_reason="", domain__isnull=False).select_related(
        "developer_account__company"
    )
    included = []
    for app in candidates:
        if include_foreign or is_in_scope(app):
            included.append(app)
    return included


def _company_id_of(app: App) -> str:
    """id công ty của app; app chưa có công ty thì dùng "dev:<id tài khoản>" để vẫn nhóm được theo tài khoản."""
    developer = app.developer_account
    if developer.company_id:
        return developer.company_id
    return UNASSIGNED_COMPANY_PREFIX + developer.play_developer_id


def _serialize_app(app: App) -> dict:
    """Một app theo interface `App` của types.ts."""
    histogram = app.star_histogram
    has_histogram = len(histogram) >= 2
    return {
        "id": app.id,
        "title": app.title,
        "companyId": _company_id_of(app),
        "domainId": app.domain_id,
        "installsLabel": app.installs_label,
        "minInstalls": app.min_installs,
        "score": app.score,
        "ratings": app.ratings,
        "lowStarRatio": app.low_star_ratio,
        "oneStarRatings": histogram[0] if has_histogram else 0,
        "twoStarRatings": histogram[1] if has_histogram else 0,
        "containsAds": app.contains_ads,
        "offersIAP": app.offers_iap,
        "features": app.features,
    }


def _companies_of(apps: list[App]) -> list[dict]:
    """
    Danh sách công ty có ít nhất một app được đưa vào — mỗi companyId trong `apps` đều có mục ở đây.
    App chưa có công ty thì thêm mục {"id": "dev:…", "name": tên tài khoản developer}.
    """
    entries_by_id: dict[str, dict] = {}
    for app in apps:
        company_id = _company_id_of(app)
        if company_id in entries_by_id:
            continue
        company: Company | None = app.developer_account.company
        name = company.name if company else app.developer_account.display_name
        entries_by_id[company_id] = {"id": company_id, "name": name}
    return sorted(entries_by_id.values(), key=lambda entry: entry["name"].lower())


# ---------------------------------------------------------------------------
# Review
# ---------------------------------------------------------------------------


def _labeled_reviews(app_ids: list[str]) -> list[dict]:
    """Các review đã gắn nhãn của những app được đưa vào, theo interface `Review` của types.ts."""
    labeled = Review.objects.filter(app_id__in=app_ids, labeled_at__isnull=False)
    pain_ids_by_review = _pain_point_ids_by_review(app_ids)
    result = []
    for review in labeled:
        result.append(_serialize_review(review, pain_ids_by_review[review.id]))
    return result


def _pain_point_ids_by_review(app_ids: list[str]) -> dict[str, list[str]]:
    """
    {review_id: [id pain point, ...]} cho mọi review đã gắn nhãn — chỉ MỘT truy vấn.

    Đọc thẳng bảng trung gian của quan hệ nhiều-nhiều (Review.pain_points.through), thay vì
    prefetch_related: prefetch sẽ gửi danh sách id của mọi review vào câu SQL, mà SQLite giới hạn
    số tham số trong một câu (~32.000) — dễ vượt khi có hàng chục nghìn review.
    """
    links = (
        Review.pain_points.through.objects.filter(review__app_id__in=app_ids, review__labeled_at__isnull=False)
        .order_by("painpoint__order")
        .values_list("review_id", "painpoint_id")
    )
    # defaultdict(list): hỏi review chưa có nhãn nào thì tự trả list rỗng
    pain_ids_by_review: dict[str, list[str]] = defaultdict(list)
    for review_id, pain_point_id in links:
        pain_ids_by_review[review_id].append(pain_point_id)
    return pain_ids_by_review


def _serialize_review(review: Review, pain_point_ids: list[str]) -> dict:
    return {
        "id": review.id,
        "appId": review.app_id,
        "score": review.score,
        "date": review.date.isoformat(),
        "lang": review.lang,
        "content": review.content,
        "painPoints": pain_point_ids,
        "wishId": review.wish_id,
        "thumbsUp": review.thumbs_up,
    }


# ---------------------------------------------------------------------------
# Meta
# ---------------------------------------------------------------------------


def _updated_at() -> str:
    """Ngày (giờ Việt Nam) của lần cào xong gần nhất; chưa cào xong lần nào thì lấy hôm nay."""
    latest_run = CrawlRun.objects.filter(finished_at__isnull=False).order_by("-finished_at").first()
    if latest_run is None:
        return timezone.localdate().isoformat()
    # localtime: đổi giờ UTC lưu trong DB sang giờ Asia/Ho_Chi_Minh (TIME_ZONE trong settings) rồi mới lấy ngày
    return timezone.localtime(latest_run.finished_at).date().isoformat()
