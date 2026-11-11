# App Opportunity Finder

Dashboard tìm lĩnh vực app nên làm, dựa trên review 1–2★ của các app (≥100K lượt tải, không gồm game)
của studio Việt Nam trên Google Play.

- `frontend/` — Next.js 16 (App Router) + TypeScript + Tailwind v4 + ECharts. Hiện dùng dữ liệu giả (`src/data/mockData.ts`).
- `backend/` — Django + DRF + SQLite: nhận dữ liệu cào từ extension Chrome, gắn nhãn, trả `/api/dashboard/` (đang làm, nhánh `feat/backend-django`).
- `docs/learning/` — bài tổng hợp kiến thức sau mỗi phiên làm việc, chia `frontend/` và `backend/`; mục lục ở `index.html`.
- `docs/HANDOFF.md` — tóm tắt bối cảnh, quyết định đã chốt và việc còn dang dở. Đọc file này khi bắt đầu chat mới.

## Quy ước làm việc
- Người phát triển là sinh viên năm 4: luôn dùng skill `readable-code` khi viết code,
  và skill `learning-notes` để viết bài tổng hợp HTML khi kết thúc mỗi phiên có sửa code.
- Giao diện và comment bằng tiếng Việt; tên biến/hàm bằng tiếng Anh.
- Kiểm tra frontend: `cd frontend && npx tsc --noEmit && npm run lint && npm run build`.
- Kiểm tra backend: `cd backend && .venv/Scripts/python -m pytest && .venv/Scripts/python manage.py check`.
