"""
settings.py — Cấu hình chung của backend Django.

Backend chỉ chạy trên máy cá nhân (localhost), không có đăng nhập:
- extension Chrome gửi dữ liệu cào về qua các API trong `market/api/`;
- dashboard Next.js (localhost:3000) đọc dữ liệu qua `/api/dashboard/`.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Khóa bí mật: lấy từ biến môi trường khi deploy; giá trị mặc định chỉ dùng khi dev trên máy.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-khong-dung-khi-deploy")

DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "market",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    # CorsMiddleware phải đứng trước CommonMiddleware để kịp gắn header CORS vào response
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# SQLite: một file duy nhất, không cần cài gì. Khi cần deploy thì đổi sang PostgreSQL ở đây.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "vi"
TIME_ZONE = "Asia/Ho_Chi_Minh"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- CORS: cho phép dashboard Next.js và extension Chrome gọi API ---
CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]
CORS_ALLOWED_ORIGIN_REGEXES = [r"^chrome-extension://.*$"]

# --- Django REST Framework ---
# Không bật đăng nhập: khi không có SessionAuthentication thì DRF không bắt kiểm tra CSRF,
# nhờ vậy extension POST dữ liệu được mà không cần token. Chỉ an toàn vì backend chạy localhost.
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "UNAUTHENTICATED_USER": None,
}
