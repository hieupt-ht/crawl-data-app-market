"""
views.py — Các API của backend.

Mỗi hàm ở đây chỉ lo phần "nhận request → trả response".
Kiểm tra dữ liệu nằm trong `serializers.py`, logic xử lý nằm trong `market/services/`.
"""

from django.db.models.functions import Lower
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from market.models import Company, DeveloperAccount

from .serializers import CompanySerializer, DeveloperAccountSerializer, DeveloperAssignmentSerializer


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
