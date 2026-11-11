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
- Backend (CHƯA LÀM): **Python Django** — thư mục `backend/`.
- Cào dữ liệu: thư viện **google-play-scraper** (không phải API chính thức, là cào không cần trình duyệt).
  - Bản Python **không có** hàm lấy danh sách app theo nhà phát triển → dùng bản Node `developer()`, hoặc đọc link `<a>` trên trang studio, hoặc lập danh sách tay.
  - Lấy được: title, installs/minInstalls, score, ratings, **histogram** (để tính % 1–2★), containsAds, offersIAP, description, reviews (lọc theo sao, sort NEWEST, có thumbsUpCount).
  - KHÔNG có sẵn: domain chi tiết, tính năng chính, pain point → cần **LLM gắn nhãn**.

## 3. Đã làm xong (dữ liệu giả, chưa có backend)
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

## 4. Quy ước
- Skill dự án trong `.claude/skills/`: `readable-code` (khi viết code) và `learning-notes` (cuối phiên có sửa code → viết `docs/learning/NN-*.html` + cập nhật `index.html`).
- Đã có bài học: `01-dashboard-overview.html`, `02-trang-chi-tiet-app.html`, `03-bo-thanh-truot-trong-so.html`.
- Kiểm tra: `cd frontend && npx tsc --noEmit && npm run lint && npm run build`.
- Kiểm thử trình duyệt trước đây dùng script puppeteer-core tạm (không nằm trong repo) với Chrome tại
  `C:\Program Files\Google\Chrome\Application\chrome.exe`.

## 5. Việc còn dang dở / câu hỏi mở
1. ~~3 thanh trượt khó hiểu~~ → ĐÃ XONG (xem mục 3). Ý tưởng để ngỏ nếu cần: chỉ xếp hạng lĩnh vực có lượt tải ≥ ngưỡng (vd 10 Tr).
2. **Chưa chốt**: lấy review của người dùng toàn cầu (chủ yếu tiếng Anh) hay chỉ người dùng Việt Nam → ảnh hưởng tham số `lang`/`country` khi cào.
3. Backend Django + script cào chưa bắt đầu. `apps.csv` cần thêm cột histogram: `App` giờ cần `lowStarRatio`, `oneStarRatings` (histogram[0]), `twoStarRatings` (histogram[1]).
4. `create-next-app` đã tạo **git riêng trong `frontend/`**; nên chuyển git ra thư mục gốc trước khi thêm `backend/`. Chưa commit gì.
5. Hạn chế đã biết: `/apps/id-sai` hiện giao diện 404 nhưng mã HTTP vẫn 200 (giới hạn của Next 16 khi bật Cache Components).
