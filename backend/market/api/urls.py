"""urls.py — Bảng đường dẫn của các API, được gắn dưới tiền tố `/api/` (xem config/urls.py)."""

from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    # Công ty và tài khoản developer
    path("companies/", views.company_list, name="company-list"),
    path("developer-accounts/", views.developer_account_assign, name="developer-account-assign"),
    path(
        "developer-accounts/<str:play_developer_id>/",
        views.developer_account_detail,
        name="developer-account-detail",
    ),
]
