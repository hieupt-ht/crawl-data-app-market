"""urls.py — Bảng đường dẫn của các API, được gắn dưới tiền tố `/api/` (xem config/urls.py)."""

from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
]
