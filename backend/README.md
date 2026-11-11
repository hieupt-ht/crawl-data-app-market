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

Sau mỗi lần cào bằng extension:

```bash
.venv/Scripts/python manage.py label_data              # gắn nhãn app/review chưa gắn, in app chưa khớp lĩnh vực
.venv/Scripts/python manage.py label_data --relabel    # gắn lại tất cả (vd sau khi sửa từ khóa trong admin); nhãn sửa tay được giữ
.venv/Scripts/python manage.py sample_labels --n 50    # in 50 review ngẫu nhiên để chấm đúng/sai (mục tiêu ≥ 70%)
```

Xem dữ liệu dashboard: http://localhost:8000/api/dashboard/ (thêm `?include_foreign=1` để thấy cả app
của tài khoản chưa gán công ty hoặc không phải studio Việt).

## Các API

| Method | Đường dẫn | Ai gọi | Việc |
|---|---|---|---|
| GET | `/api/health/` | extension | Django đã bật chưa |
| GET | `/api/companies/` | extension | Danh sách công ty cho popup chọn |
| GET | `/api/developer-accounts/<id>/` | extension | Tài khoản developer đã gán công ty chưa (404 nếu chưa biết) |
| POST | `/api/developer-accounts/` | extension | Gán tài khoản: `company_id` \| `new_company_name` \| `foreign: true` (đúng một) |
| POST | `/api/crawl-runs/` | extension | Mở lần cào → `{"id"}` |
| PATCH | `/api/crawl-runs/<id>/` | extension | Gửi `stats`, `errors`, `finished: true` |
| POST | `/api/ingest/app/` | extension | Gửi thông tin app (`star_histogram` hoặc `star_percentages`) |
| GET | `/api/crawl-state/?app_id=&lang=&score=` | extension | Review mới nhất đã lưu → biết khi nào dừng cuộn |
| POST | `/api/ingest/reviews/` | extension | Gửi ≤ 100 review/đợt; trả `created`, `duplicates` |
| GET | `/api/dashboard/` | Next.js | Dữ liệu đúng hình dạng `DashboardData` (`frontend/src/lib/types.ts`) |

API dashboard dùng tên trường camelCase như `types.ts`; các API còn lại dùng snake_case.
Dữ liệu sai thì trả `400` kèm thông báo tiếng Việt, vd `"Review thứ 3 – score: score phải là 1 hoặc 2 (đang là 4)."`.

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
| `market/services/` | Logic xử lý dữ liệu: nhận dữ liệu cào (`ingest.py`), dựng dashboard (`dashboard.py`), chạy gắn nhãn (`labeling.py`) |
| `market/labeling/` | Gắn nhãn pain point / lĩnh vực bằng từ khóa (hàm thuần, không đọc database) |
| `market/management/commands/` | Lệnh chạy tay: `label_data`, `sample_labels` |
| `tests/` | Test tự động (pytest) |
