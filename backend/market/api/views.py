"""
views.py — Các API của backend.

Mỗi hàm/class ở đây chỉ lo phần "nhận request → trả response".
Logic xử lý dữ liệu nằm trong `market/services/` để dễ test và dễ đọc.
"""

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response


@api_view(["GET"])
def health(request: Request) -> Response:
    """Trả {"status": "ok"} — extension gọi để biết Django đã bật hay chưa."""
    return Response({"status": "ok"})
