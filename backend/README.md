# Backend — App Opportunity Finder

Backend Django nhận dữ liệu cào từ extension Chrome, lưu vào SQLite, gắn nhãn review,
rồi trả dữ liệu cho dashboard Next.js qua `/api/dashboard/`.

Thiết kế: `docs/superpowers/specs/2026-11-11-crawler-backend-design.md`.

## Cài đặt lần đầu (Windows, Git Bash)

```bash
cd backend
python -m venv .venv                                   # tạo môi trường ảo riêng cho dự án
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python manage.py migrate                 # tạo database db.sqlite3 + nạp sẵn danh sách nhãn
.venv/Scripts/python manage.py createsuperuser         # tạo tài khoản vào trang /admin/
```

## Chạy hằng ngày

```bash
.venv/Scripts/python manage.py runserver               # http://localhost:8000
```

- Trang quản trị: http://localhost:8000/admin/
- Kiểm tra backend đang chạy: http://localhost:8000/api/health/

## Chạy test

```bash
.venv/Scripts/python -m pytest
```

## Các thư mục

| Thư mục | Làm gì |
|---|---|
| `config/` | Cấu hình Django (settings, đường dẫn gốc) |
| `market/models.py` | Các bảng dữ liệu: công ty, tài khoản developer, app, review, nhãn |
| `market/api/` | Các API cho extension và dashboard |
| `market/services/` | Logic xử lý dữ liệu (hàm thuần, dễ test) |
| `market/labeling/` | Gắn nhãn pain point / lĩnh vực bằng từ khóa |
| `market/management/commands/` | Lệnh chạy tay, vd `label_data` |
| `tests/` | Test tự động (pytest) |
