"""
views.py — Các API của backend.

Mỗi hàm ở đây chỉ lo phần "nhận request → trả response".
Kiểm tra dữ liệu nằm trong `serializers.py`, logic xử lý nằm trong `market/services/`.
"""

from django.db.models.functions import Lower
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from market.models import Company, CrawlRun, DeveloperAccount
from market.services.crawl_runs import get_crawl_state, update_crawl_run
from market.services.ingest import upsert_app
from market.services.scope import is_in_scope

from .serializers import (
    CompanySerializer,
    CrawlRunCreateSerializer,
    CrawlRunUpdateSerializer,
    CrawlStateQuerySerializer,
    DeveloperAccountSerializer,
    DeveloperAssignmentSerializer,
    IngestAppSerializer,
)


@api_view(["GET"])
def health(request: Request) -> Response:
    """Trả {"status": "ok"} — extension gọi để biết Django đã bật hay chưa."""
    return Response({"status": "ok"})


# ---------------------------------------------------------------------------
# Công ty và tài khoản developer (popup "Tài khoản này thuộc công ty nào?")
# ---------------------------------------------------------------------------


@api_view(["GET"])
def company_list(request: Request) -> Response:
    """Danh sách công ty, sắp xếp theo tên, để popup cho người dùng chọn."""
    # Lower: không phân biệt hoa/thường, để "iKame" đứng trước "RoosterX" như người đọc mong đợi
    companies = Company.objects.order_by(Lower("name"))
    return Response(CompanySerializer(companies, many=True).data)


@api_view(["GET"])
def developer_account_detail(request: Request, play_developer_id: str) -> Response:
    """Cho extension biết tài khoản này đã được gán công ty chưa."""
    # select_related: lấy luôn công ty trong cùng một truy vấn (JOIN), khỏi truy vấn thêm lần nữa
    developer = DeveloperAccount.objects.select_related("company").filter(
        play_developer_id=play_developer_id
    ).first()
    if developer is None:
        return Response({"detail": "Chưa biết tài khoản developer này."}, status=404)
    return Response(DeveloperAccountSerializer(developer).data)


@api_view(["POST"])
def developer_account_assign(request: Request) -> Response:
    """Lưu câu trả lời của popup: gán tài khoản vào công ty, tạo công ty mới, hoặc đánh dấu nước ngoài."""
    serializer = DeveloperAssignmentSerializer(data=request.data)
    # raise_exception=True: dữ liệu sai thì DRF tự trả 400 kèm thông báo lỗi
    serializer.is_valid(raise_exception=True)
    developer = serializer.save()
    return Response(DeveloperAccountSerializer(developer).data)


# ---------------------------------------------------------------------------
# Lần cào và trạng thái cào
# ---------------------------------------------------------------------------


@api_view(["POST"])
def crawl_run_create(request: Request) -> Response:
    """Mở một lần cào, trả id để extension gửi kèm mọi dữ liệu sau đó."""
    serializer = CrawlRunCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    run = serializer.save()
    return Response({"id": run.id}, status=201)


@api_view(["PATCH"])
def crawl_run_update(request: Request, run_id: int) -> Response:
    """Ghi thống kê/lỗi và đóng lần cào khi extension gửi `finished: true`."""
    run = get_object_or_404(CrawlRun, id=run_id)
    serializer = CrawlRunUpdateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    run = update_crawl_run(run, data.get("stats"), data.get("errors"), data["finished"])
    return Response({"id": run.id, "finished_at": run.finished_at})


@api_view(["GET"])
def crawl_state(request: Request) -> Response:
    """Review mới nhất đã lưu của app ở một lượt cào — extension cuộn tới đó thì dừng."""
    # request.query_params: các tham số sau dấu ? trên URL
    serializer = CrawlStateQuerySerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    query = serializer.validated_data
    return Response(get_crawl_state(query["app_id"], query["lang"], query.get("score")))


# ---------------------------------------------------------------------------
# Nhận dữ liệu cào
# ---------------------------------------------------------------------------


@api_view(["POST"])
def ingest_app(request: Request) -> Response:
    """Lưu thông tin một app; trả cho popup biết app có trong phạm vi dashboard không."""
    serializer = IngestAppSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    app = upsert_app(data["app"], data["developer"], raw_payload=request.data)
    return Response(
        {
            "app_id": app.id,
            "in_scope": is_in_scope(app),
            "skipped_reason": app.skipped_reason,
            "developer_status": app.developer_account.status,
        }
    )
