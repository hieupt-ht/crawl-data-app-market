"""urls.py — Đường dẫn gốc: trang quản trị `/admin/` và các API `/api/`."""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("market.api.urls")),
]
