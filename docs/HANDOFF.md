# Bàn giao bối cảnh — App Opportunity Finder (cập nhật 11/11/2026)

File này tóm tắt các phiên chat trước để chat mới nắm được bối cảnh. Đọc cùng `CLAUDE.md`.

## 1. Mục tiêu
- Sếp giao: tìm app **≥ 100K lượt tải** trên Google Play, **cào review 1–2★**, làm **dashboard** gồm:
  tên app, số lượt tải, domain (lĩnh vực), tính năng chính, user pain point.
- Phạm vi đã chốt: app của **studio Việt Nam** (RoosterX, Apero, iKame, Lutech, Eco Mobile…), **không lấy game**.
- Câu hỏi dashboard phải trả lời: *"Nên làm app ở lĩnh vực nào, và làm khác đối thủ ở điểm nào?"*
- Người làm: **sinh viên năm 4**, ít kinh nghiệm → code phải dễ đọc, và sau mỗi phiên có bài học HTML.

## 2. Công nghệ đã chốt
- Frontend: **Next.js 16 (App Router) + TypeScript + Tailwind v4 + ECharts** (cài qua npm) — thư mục `frontend/`.
  Lưu ý Next 16 khác bản cũ: `params` là Promise, bật `cacheComponents`; đọc docs trong `frontend/node_modules/next/dist/docs/`.
- Backend: **Django 5.2 + DRF + SQLite** (sau này đổi PostgreSQL; **không dùng MongoDB**) — thư mục `backend/`.
- Cào dữ liệu: **ĐỔI HƯỚNG (11/11)** — KHÔNG dùng thư viện google-play-scraper nữa. Tự cào bằng **extension Chrome**
  đọc thẻ HTML ngay trong trình duyệt (bấm "Xem tất cả bài đánh giá", cuộn, đọc DOM) rồi gửi JSON về Django.
- Thiết kế đầy đủ (ĐÃ DUYỆT): `docs/superpowers/specs/2026-11-11-crawler-backend-design.md`.
  Kế hoạch backend 9 task: `docs/superpowers/plans/2026-11-11-backend-django.md`.
- Các quyết định đã chốt trong thiết kế:
  - Nút **"Cào studio này"** (đi theo link `<a>` app trên trang developer, **chỉ 1 tầng**) và **"Cào app này"** (làm trước).
  - Mỗi app cào **2 lượt**: tiếng Việt `hl=vi&gl=VN` và tiếng Anh `hl=en&gl=US` (→ câu hỏi toàn cầu/VN đã chốt: lấy cả hai).
  - Dừng cuộn khi review > **12 tháng** hoặc đủ **500 review 1–2★**/lượt; lần sau chỉ lấy review mới. Không realtime.
  - **Tài khoản developer** (tên người đăng app trên Google Play) ≠ **công ty**: một studio có nhiều tài khoản.
    Gán 1 lần; khi "Cào studio này" gặp tài khoản lạ, popup hỏi "Tài khoản này thuộc công ty nào?".
  - App của developer nước ngoài: **lưu nhưng ẩn** khỏi dashboard (`?include_foreign=1` để bật).
  - Gắn nhãn: **từ khóa trước** (miễn phí), LLM sau khi có API key và nếu độ đúng < 70%. **Không cần RAG.**
  - Chạy extension trong Chrome profile riêng không đăng nhập Google; nghỉ ngẫu nhiên giữa các app.
  - Ý tưởng chưa chốt: nút "Cập nhật tất cả" (cào lại mọi app đã lưu) — bàn khi làm extension.

## 3. Frontend đã làm xong (dữ liệu giả)
**Trang Overview `/`**
- Header + bộ lọc (công ty, 3/6/12 tháng, ngôn ngữ review), 4 ô KPI.
- ① Bảng xếp hạng lĩnh vực: 3 cột thanh ngang ghi số thật — Lượt tải · % 1–2★ · % chê quảng cáo/giá (dễ sửa);
  rê chuột ra số cụ thể (vd "147.770 lượt chấm 1–2★ / 377.000 lượt chấm (1★: … · 2★: …)").
  **Xếp hạng mặc định theo % 1–2★** (`rankDomains`). ĐÃ BỎ thanh trượt trọng số + điểm 0–100 (phiên 11/11, bài học 03).
  Đánh đổi đã chấp nhận: lĩnh vực nhỏ như "Ghi chú AI" (2,6 Tr lượt tải) có thể đứng hạng cao.
- ② Scatter "Bản đồ cơ hội" (tự đặt nhãn tránh đè), ③ Heatmap lĩnh vực × pain point (bấm ô → panel 10 review bên phải),
  ④ Top mong muốn (donut top 5 + "Khác", giữa vòng ghi % review có nêu mong muốn; dùng chung ở trang app), ⑤ Bảng app đối thủ.
- Trạng thái xem (bộ lọc, lĩnh vực đang chọn) lưu **trên URL** (`lib/viewState.ts`), vd `/?months=6&domain=pdf`.

**Trang chi tiết app `/apps/[appId]`** (thay cho panel cũ)
- So sánh pain point app vs trung bình lĩnh vực ("+7 điểm · nặng hơn"), mong muốn, xu hướng theo tháng,
  khu đọc review (lọc/tìm/sắp xếp/phân trang), app khác cùng lĩnh vực.

**Dữ liệu giả**: `frontend/src/data/mockData.ts` (object `DATA`, 8 lĩnh vực, 40 app, 8 công ty, ~3.000 review sinh bằng seed).
Cuối file có ghi chú cách thay bằng `apps.csv` / `reviews.csv` thật. Chỉ cần sửa `lib/dataSource.ts` khi đổi nguồn.
Hợp đồng dữ liệu (backend phải trả đúng hình dạng này): `frontend/src/lib/types.ts` → `DashboardData`.

- Giao diện (11/11): font **Be Vietnam Pro** (next/font), bảng màu slate trong `globals.css` + `chartTheme.ts` (phải giữ trùng nhau),
  `text-xs` = 13px. Quy tắc: mọi chữ ≥ 4,5:1 so với nền thật, không chữ nào < 12px.
  Script kiểm tra tương phản (puppeteer, ngoài repo) đã chạy: 0 lỗi trên Overview, Overview khi chọn lĩnh vực, trang app.

## 4. Quy ước
- Skill dự án trong `.claude/skills/`: `readable-code` (khi viết code) và `learning-notes` (cuối phiên có sửa code → viết `docs/learning/frontend/NN-*.html` hoặc `docs/learning/backend/NN-*.html` + cập nhật `index.html`; số bài đánh liên tục giữa hai thư mục).
- Đã có bài học: `frontend/01-dashboard-overview.html`, `frontend/02-trang-chi-tiet-app.html`, `frontend/03-bo-thanh-truot-trong-so.html`,
  `backend/04-khung-django-va-models.html`, `backend/05-api-nhan-du-lieu-cao.html`, `backend/06-dashboard-va-gan-nhan.html`. Mỗi đợt backend xong viết 1 bài (đợt 2 → bài 05).
- Kiểm tra frontend: `cd frontend && npx tsc --noEmit && npm run lint && npm run build`.
- Kiểm tra backend: `cd backend && .venv/Scripts/python -m pytest && .venv/Scripts/python manage.py check`.
- Git: repo ở thư mục gốc (đã chuyển từ `frontend/`). `master` = frontend; backend làm trên nhánh **`feat/backend-django`**. Chưa có remote GitHub.
- Kiểm thử trình duyệt trước đây dùng script puppeteer-core tạm (không nằm trong repo) với Chrome tại
  `C:\Program Files\Google\Chrome\Application\chrome.exe`.

## 5. Việc còn dang dở / câu hỏi mở
1. ~~3 thanh trượt khó hiểu~~ → ĐÃ XONG (xem mục 3). Ý tưởng để ngỏ nếu cần: chỉ xếp hạng lĩnh vực có lượt tải ≥ ngưỡng (vd 10 Tr).
2. ~~Toàn cầu hay Việt Nam~~ → ĐÃ CHỐT: cào cả hai lượt vi + en.
3. **Backend đang làm theo đợt** (người dùng muốn dừng sau mỗi đợt để xem):
   - ✅ Đợt 1 = Task 1–2: khung Django, `/api/health/`, 9 model, nạp bộ nhãn bằng data migration, admin, 13 test xanh.
   - ✅ Đợt 2 = Task 3–5: `/api/companies/`, `/api/developer-accounts/` (GET + POST gán công ty), `/api/crawl-runs/` (POST + PATCH),
     `/api/ingest/app/`, `/api/crawl-state/`, `/api/ingest/reviews/` (≤100/đợt, chống trùng, lỗi tiếng Việt "Review thứ N"). 57 test xanh.
     Logic ghi ở `market/services/ingest.py` + `crawl_runs.py`. Bài học 05.
   - ✅ Đợt 3 = Task 6–8: `/api/dashboard/` (đúng `DashboardData`, `?include_foreign=1`, app chưa gán công ty có `companyId = "dev:<id>"`),
     gắn nhãn từ khóa (`market/labeling/`, hàm thuần), lệnh `label_data [--relabel]` và `sample_labels [--n 50] [--seed 0]`. 90 test xanh.
     Đã thử tay cả đường đi bằng curl: ingest → label_data → dashboard. Bài học 06.
   - ⏭ **Đợt 4 = Task 9**: cập nhật tài liệu. Sau cùng: review toàn nhánh bởi reviewer độc lập.
   - Sổ tiến độ (không commit): `.superpowers/sdd/2026-11-11-backend-django/progress.md` — ghi task đã xong + các "Ruling".
4. Sau backend: kế hoạch riêng cho **extension Chrome** (bước 0: khảo sát DOM Google Play bằng tay), rồi nối frontend
   (`lib/dataSource.ts` gọi `/api/dashboard/`), rồi gắn nhãn LLM.
5. Hạn chế đã biết: `/apps/id-sai` hiện giao diện 404 nhưng mã HTTP vẫn 200 (giới hạn của Next 16 khi bật Cache Components).
6. File `package-lock.json` rỗng ở thư mục gốc là rác, xóa được.
