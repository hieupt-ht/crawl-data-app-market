# Thiết kế: Extension cào Google Play + Backend Django + nối Dashboard

Ngày: 11/11/2026 · Trạng thái: đã duyệt (11/11/2026)
Đọc kèm: `CLAUDE.md`, `docs/HANDOFF.md`, `frontend/src/lib/types.ts`.

Ký hiệu: **[Đã chốt]** = người phát triển đã đồng ý trong buổi trao đổi.
**[Đề xuất]** = Claude tự chọn, người phát triển có thể đổi.

---

## 1. Mục đích và lý do

Dashboard hiện chạy bằng dữ liệu giả. Cần dữ liệu thật: app (≥100K lượt tải, không phải game) của
studio Việt Nam và review 1–2★ của chúng, đã được gắn nhãn lĩnh vực / pain point / mong muốn,
để trả lời câu hỏi *"Nên làm app ở lĩnh vực nào, và làm khác đối thủ ở điểm nào?"*

**Vì sao tự cào bằng extension Chrome thay vì thư viện `google-play-scraper`** [Đã chốt]:
- Thư viện dùng endpoint không chính thức → Google đổi là hỏng, phải chờ người khác sửa.
- Chỉ lấy được những trường thư viện đã parse; không khám phá app hàng loạt theo studio được.
- Người phát triển muốn tự làm theo hướng cào (để hiểu và làm chủ).
- Review không nằm sẵn trong HTML tải về; phải bấm "Xem tất cả bài đánh giá" và cuộn. Extension chạy
  trong Chrome thật nên làm được đúng như người dùng bấm tay, và khó bị chặn hơn request trần.

**Không cần realtime** [Đã chốt]: chỉ cào khi người dùng bấm nút.

## 2. Mục tiêu / Không làm / Thất bại dù chạy được

**Mục tiêu**
1. Extension: bấm 1 nút trên trang studio → tự đi qua các app của studio đó, lấy thông tin app + review 1–2★.
2. Extension: bấm 1 nút trên trang một app → cào riêng app đó. [Đề xuất]
3. Django lưu dữ liệu, gắn nhãn, và trả JSON đúng hình dạng `DashboardData` (`frontend/src/lib/types.ts`).
4. Frontend chỉ sửa `lib/dataSource.ts` để lấy dữ liệu từ Django thay vì `mockData.ts`.

**Không làm (giai đoạn này)**
- Cào tự động theo lịch, cào realtime.
- Đăng nhập / nhiều người dùng / phân quyền. Chỉ chạy trên máy cá nhân (localhost).
- Deploy lên server, App Store (iOS), game.
- Viết lại phần tính điểm cơ hội: giữ nguyên trong `frontend/src/lib/analytics.ts`.

**Thất bại dù chạy được (anti-goals)**
- Crawler "lan" ra toàn cửa hàng qua mục "App tương tự".
- Bị Google chặn IP hoặc khóa tài khoản Google của người dùng.
- Code quá "thông minh" khiến sinh viên năm 4 không đọc hiểu, không tự sửa được khi Google đổi giao diện.
- Nhãn pain point sai nhiều đến mức kết luận trên dashboard không đáng tin.

## 3. Ràng buộc

- Người phát triển là sinh viên năm 4 → tuân thủ skill `readable-code`; giao diện + comment tiếng Việt,
  tên biến/hàm tiếng Anh; cuối mỗi phiên có sửa code viết bài học (`learning-notes`).
- Frontend đã có: Next.js 16 (App Router, `cacheComponents` bật), TS, Tailwind v4, ECharts.
- Backend: Python Django [Đã chốt].
- Hợp đồng dữ liệu `DashboardData` là cố định; backend phải trả đúng.
- Bộ nhãn (taxonomy) hiện có trong `mockData.ts` — 8 lĩnh vực, 3 nhóm pain, 10 pain point, 15 mong muốn —
  là điểm xuất phát; có thể thêm lĩnh vực mới khi gặp app thật không khớp.

## 4. Kiến trúc tổng thể

```
[Chrome Extension]  --POST JSON-->  [Django + DRF, SQLite]  --GET /api/dashboard-->  [Next.js dashboard]
  đọc DOM Google Play                 lưu, khử trùng lặp,
  (studio → app → review)             gắn nhãn (lệnh riêng)
```

Ba phần độc lập, nói chuyện với nhau chỉ qua HTTP JSON trên localhost.

Thư mục [Đề xuất]:
```
extension/   Chrome extension (Manifest V3)
backend/     Django project
frontend/    (đã có)
```
Trước khi tạo `backend/` và `extension/`: chuyển git từ `frontend/` ra thư mục gốc (HANDOFF mục 5.4).

## 5. Phần 1 — Chrome Extension

### 5.1 Hành vi [Đã chốt, trừ chỗ ghi Đề xuất]

**Nút "Cào studio này"** (hiện khi đang ở trang `play.google.com/store/apps/dev?id=...` hoặc `/developer?id=...`):
1. Đọc các thẻ `<a href="/store/apps/details?id=...">` **trên chính trang studio** → danh sách appId.
   Cuộn/bấm "xem thêm" nếu trang studio không hiện hết app. Chỉ đi **một tầng**: không đi theo link
   trong trang app (mục "App tương tự", "Cũng của nhà phát triển"…).
2. Với từng app, cào **hai lượt** [Đã chốt]: tiếng Việt `hl=vi&gl=VN` và tiếng Anh `hl=en&gl=US`.
3. Mỗi lượt:
   a. Mở trang app, đọc: tên, nhà phát triển, thể loại (category), mốc lượt tải, điểm sao, số lượt chấm,
      biểu đồ phân bố sao (để tính `lowStarRatio`), có quảng cáo, có mua trong app, mô tả.
   b. **Lọc sớm**: dưới 100K lượt tải hoặc thể loại là game → bỏ qua, ghi lý do.
      (Thông tin app chỉ cần đọc ở lượt đầu; lượt thứ hai chỉ cần review.)
   c. Bấm "Xem tất cả bài đánh giá" / "See all reviews" (chữ nút biết trước theo ngôn ngữ của lượt).
   d. Sắp xếp "Mới nhất"; nếu hộp review có lọc theo sao thì chọn 1★ rồi 2★, không có thì lấy hết rồi lọc.
   e. Cuộn và đọc review cho tới khi gặp **điều kiện dừng** (mục 5.2).
   f. Gửi về Django theo từng đợt (mục 7).
4. Giữa các app nghỉ **ngẫu nhiên** [Đề xuất: 5–15 giây]; giữa các lần cuộn nghỉ ngắn [Đề xuất: 0,8–2 giây].

**Tài khoản developer chưa gán** [Đã chốt]: khi bấm "Cào studio này" trên trang của một tài khoản developer
mà Django chưa biết thuộc công ty nào, popup hỏi **một lần**: chọn công ty có sẵn / gõ tên công ty mới /
"Không phải studio Việt". Lưu xong mới cào tiếp. Với "Cào app này" thì không hỏi: app được lưu dạng
"ngoài phạm vi", gán sau trong admin (mục "Tài khoản chưa gán"). Cần thêm API:
`GET /api/developer-accounts/<play_developer_id>/` và `POST /api/developer-accounts/` (gán vào công ty).

**Nút "Cào app này"** (khi ở trang `details?id=...`) [Đã chốt]: chạy bước 2–3 cho riêng app đó.
Đây cũng là phần **làm đầu tiên**: "Cào studio này" chỉ là lặp "Cào app này" qua danh sách link.

**Hiển thị tiến độ** trong popup: đang ở app thứ mấy / tổng, đã lấy bao nhiêu review, app bị bỏ qua và lý do,
lỗi gần nhất. Có nút **Dừng**.

### 5.2 Điều kiện dừng khi cuộn review [Đã chốt; con số là Đề xuất, chỉnh được trong cài đặt]
Dừng khi gặp **điều kiện nào trước**:
- review cũ hơn **12 tháng** so với hôm nay;
- đã đủ **500 review 1–2★** cho lượt (ngôn ngữ) đó;
- gặp review **đã có trong database** (cào lần sau chỉ lấy phần mới) — extension hỏi Django trước khi cào
  (mục 7, `GET /api/crawl-state`);
- cuộn thêm mà không có review mới [Đề xuất: 3 lần liên tiếp] (hết review).

### 5.3 Quy tắc đọc DOM
- **Không** bám vào class bị mã hóa (`h3YV2d`, …). Ưu tiên: thuộc tính `aria-label`, `role`, `data-*`
  (ví dụ id review), cấu trúc thẻ, và chữ hiển thị (vì ngôn ngữ đã cố định theo lượt).
- Gom **toàn bộ selector vào một file** (vd `extension/src/selectors.js`) với comment giải thích từng cái,
  để khi Google đổi giao diện chỉ phải sửa một chỗ.
- Đọc xong review nào có thể xóa phần tử đó khỏi DOM để trang không nặng dần. [Đề xuất]
- Ngày review hiển thị dạng chữ theo ngôn ngữ ("3 tháng 3, 2026" / "March 3, 2026") → cần hàm chuyển
  về `YYYY-MM-DD` cho cả hai ngôn ngữ.
- "X người thấy hữu ích" → `thumbsUp`.

### 5.4 An toàn tài khoản [Đề xuất]
Chạy extension trong **một Chrome profile riêng, không đăng nhập Google**, để nếu bị nghi là bot thì không
ảnh hưởng tài khoản chính. Mở các tab cào trong **một cửa sổ riêng** (tab nền bị Chrome làm chậm).

### 5.5 Công nghệ extension [Đề xuất]
Manifest V3, **JavaScript thuần, không build step** (dễ đọc, nạp thẳng bằng "Load unpacked").
- `service worker`: điều phối hàng đợi app, mở/đóng tab, gọi API Django.
- `content script`: chạy trên trang Google Play, đọc DOM, bấm, cuộn.
- `popup`: nút bấm + tiến độ + cài đặt (lưu bằng `chrome.storage`).
- `host_permissions`: `https://play.google.com/*`, `http://localhost:8000/*`.

## 6. Phần 2 — Backend Django

### 6.1 Công nghệ [Đã chốt]
Django + Django REST Framework, **SQLite khi làm trên máy → PostgreSQL khi cần deploy/dùng chung**
(chỉ đổi `DATABASES` trong `settings.py`). `django-cors-headers` cho phép extension và Next.js gọi.
Không dùng Celery: việc nặng chạy bằng lệnh `manage.py` riêng.

**Không dùng MongoDB** [Đã chốt], vì:
- dữ liệu có quan hệ chặt: studio → app → review → nhiều pain point, và dashboard toàn đếm/gộp theo quan hệ;
- ORM, migration và admin của Django hỗ trợ SQL tốt nhất;
- phần dữ liệu "hay đổi cấu trúc" được lưu bằng `JSONField` (cột `raw_payload`).

### 6.2 Mô hình dữ liệu (bảng)
| Bảng | Trường chính | Ghi chú |
|---|---|---|
| `Company` | id (slug), name, is_vietnamese (bool) | Studio; nhập tay trong admin |
| `DeveloperAccount` | play_developer_id, display_name, play_url, company (null được) | Một studio có thể có **nhiều tài khoản developer** trên Google Play. Gặp tài khoản lạ khi cào → tự tạo với `company = null` |
| `Domain`, `PainGroup`, `PainPoint`, `Wish` | id, name (+ group cho PainPoint) | Nạp sẵn từ taxonomy trong `mockData.ts` (fixture) |
| `App` | id (appId), title, developer_account, raw_payload (JSON, bản gốc extension gửi), domain (null được), category, installs_label, min_installs, score, ratings, star_histogram (JSON 5 số hoặc % 5 thanh), low_star_ratio, contains_ads, offers_iap, description, features (JSON list), skipped_reason, last_crawled_at | `domain`, `features` do bước gắn nhãn điền |
| `Review` | id (id review của Google), app, lang (`vi`/`en`), score (1/2), date, content, thumbs_up, pain_points (M2M), wish (null được), labeled_at, label_source (`rules`/`llm`/`manual`) | Khóa chính là id review → gửi lại không bị trùng |
| `CrawlRun` | id, started_at, finished_at, trigger (`studio`/`app`), target, stats (JSON), errors (JSON) | Nhật ký mỗi lần bấm nút |

Thông tin app thay đổi theo thời gian (lượt tải, điểm): giai đoạn này **ghi đè** bản mới nhất, không lưu lịch sử. [Đề xuất]

**Lĩnh vực nằm trong database, sửa được trong admin** [Đề xuất]: bảng `Domain` có thêm trường `keywords`
(danh sách từ khóa Việt + Anh) để bộ gắn nhãn `rules` đọc. Như vậy gặp app thật không khớp 8 lĩnh vực cũ thì
thêm lĩnh vực mới trong admin, không phải sửa code. `PainPoint` và `Wish` cũng có `keywords` tương tự.
`App` có thêm `domain_source` (`rules`/`llm`/`manual`). Lĩnh vực gán tay thì lệnh tự động không ghi đè.

**Ý nghĩa `Review.lang`** [Đề xuất]: là **lượt cào** đã lấy review đó (`vi` = lượt `hl=vi&gl=VN`,
`en` = lượt `hl=en&gl=US`), không phải ngôn ngữ thật của đoạn chữ. Nếu cùng một id review xuất hiện ở cả hai
lượt thì **giữ bản thấy đầu tiên** và đếm vào "trùng". Điều kiện dừng "gặp review đã có" tính theo từng cặp
(app, lượt), và nếu lọc riêng 1★ / 2★ thì tính theo cả số sao. Nếu id bị trùng làm điều kiện này không
khớp, mốc ngày `latest_review_date` vẫn đủ để dừng.

### 6.3 API
| Method | Đường dẫn | Ai gọi | Việc |
|---|---|---|---|
| `POST` | `/api/crawl-runs/` | extension | Mở một lần cào, nhận `run_id` |
| `GET` | `/api/crawl-state/?app_id=...&lang=vi` | extension | Trả `latest_review_id`, `latest_review_date` để extension biết dừng |
| `POST` | `/api/ingest/app/` | extension | Upsert thông tin 1 app (kèm `run_id`) |
| `POST` | `/api/ingest/reviews/` | extension | Thêm một đợt review (≤100/đợt); bỏ qua id đã có; trả số mới/số trùng |
| `PATCH` | `/api/crawl-runs/<id>/` | extension | Đóng lần cào, gửi thống kê + lỗi |
| `GET` | `/api/dashboard/` | Next.js | Trả `DashboardData` đúng `types.ts` |

`/api/dashboard/` chỉ trả app **đã có lĩnh vực** và review **đã gắn nhãn**, để dashboard không hiện dữ liệu dở dang.
**App ngoài phạm vi** [Đã chốt]: app có tài khoản developer không thuộc studio Việt Nam nào (`company` null
hoặc `is_vietnamese = false`) **vẫn được lưu và gắn nhãn, nhưng mặc định không có trong `/api/dashboard/`**.
Có tham số `?include_foreign=1` để sau này bật lên so sánh với đối thủ nước ngoài. Gán tài khoản developer vào
studio trong admin thì app tự vào phạm vi. Popup extension báo "ngoài phạm vi" khi cào app như vậy.
Ở `DashboardData`, `App.companyId` lấy theo `developer_account.company`.

Để app không "biến mất lặng lẽ": lệnh `label_data` in ra danh sách app **chưa khớp lĩnh vực nào**, và trong admin
có bộ lọc "chưa có lĩnh vực" để gán tay. [Đề xuất]
`meta.updatedAt` = ngày của lần cào gần nhất; `meta.source` = "Google Play (tự cào bằng extension)".

Kiểm tra dữ liệu vào (serializer): score chỉ 1 hoặc 2, lang chỉ `vi`/`en`, date đúng định dạng, appId hợp lệ.

### 6.4 Phân tích (gắn nhãn) — chạy bằng lệnh riêng, không chạy trong request
Lệnh: `python manage.py label_data` (chỉ xử lý app/review chưa gắn nhãn; có cờ `--relabel` để làm lại).

Cần gắn:
1. **Lĩnh vực của app** — từ tên + thể loại + mô tả.
2. **Tính năng chính của app** (2–4 cụm ngắn tiếng Việt) — từ mô tả.
3. **Pain point của review** (0..n nhãn trong 10 nhãn cố định) và **mong muốn** (0..1 trong 15 nhãn).

Thiết kế **hai cách gắn nhãn cùng một giao diện** (cùng hàm vào/ra), chọn bằng cài đặt [Đề xuất]:
- **`rules` — từ khóa, miễn phí, mặc định**: bảng từ khóa tiếng Việt + tiếng Anh cho từng nhãn
  (vd `ads`: "quảng cáo", "ads", "advertisement"; `paywall`: "trả phí", "subscription", "premium"…).
  Lĩnh vực app: bảng từ khóa trên tên/mô tả. Tính năng: để trống hoặc nhập tay trong admin.
  Ưu: chạy ngay, không tốn tiền, dễ hiểu. Nhược: bỏ sót, nhầm khi câu phủ định / mỉa mai.
- **`llm` — mô hình AI**: khi có API key. Gửi theo lô (vd 20 review/lần), yêu cầu trả JSON chỉ chứa id nhãn
  trong danh sách cho trước; kiểm tra id hợp lệ trước khi lưu. Gợi ý model rẻ, nhanh (vd Claude Haiku);
  key đặt trong file `.env`, không commit.

Người phát triển **chưa có/ chưa xác định API key** → làm `rules` trước, `llm` là bước sau.
Có thể sửa nhãn tay trong Django admin (`label_source = manual`, lệnh tự động không ghi đè nhãn tay).

**Kiểm tra chất lượng nhãn** [Đề xuất]: lệnh `manage.py sample_labels --n 50` in ngẫu nhiên 50 review kèm nhãn
để người phát triển đọc và đếm đúng/sai; mục tiêu tạm ≥ 70% đúng trước khi tin dashboard.

### 6.5 Tính `lowStarRatio`
= (số lượt 1★ + 2★) / tổng lượt chấm, từ biểu đồ phân bố sao trên trang app. Trang web có thể chỉ hiện
**độ dài thanh** (%), không hiện số → khi đó tính trực tiếp từ % của 5 thanh. Cần xác nhận ở bước spike.

## 7. Phần 3 — Nối Frontend

- `frontend/src/lib/dataSource.ts`: thay `return DATA` bằng gọi `GET http://localhost:8000/api/dashboard/`.
  Hàm sẽ thành bất đồng bộ (`async`) → các chỗ gọi `getDashboardData()` / `getLookups()` phải sửa theo.
  Cách cache với Next 16 `cacheComponents` (vd `"use cache"` + thời gian làm mới) để builder đọc docs trong
  `frontend/node_modules/next/dist/docs/` rồi chọn.
- Địa chỉ API đặt trong biến môi trường (`.env.local`), không viết cứng.
- Giữ `mockData.ts` làm phương án dự phòng: nếu chưa bật Django thì dashboard vẫn chạy bằng dữ liệu giả
  (chọn bằng biến môi trường). [Đề xuất]
- Bộ lọc "công ty" lấy từ `companies` thật; bộ lọc ngôn ngữ review đã có sẵn.

## 8. Thứ tự làm [Đề xuất]

0. **Spike khảo sát DOM (vứt đi sau)** — mở trang Google Play bằng tay/DevTools, xác nhận: link app trên trang
   studio, có id review trong DOM không, hộp review có lọc sao không, biểu đồ sao hiện số hay %, định dạng ngày,
   chữ trên các nút ở hai ngôn ngữ. Ghi kết quả vào `docs/` để làm căn cứ cho selector.
1. Chuyển git ra thư mục gốc; tạo `backend/` Django: model, admin, fixture taxonomy, `/api/dashboard/`
   (test bằng dữ liệu nhập tay vài dòng).
2. API ingest + crawl-state + crawl-runs, có test.
3. Extension: "Cào app này" cho **một app, một ngôn ngữ**, gửi được về Django.
4. Extension: hai ngôn ngữ, điều kiện dừng, cào lần sau chỉ lấy phần mới.
5. Extension: "Cào studio này" (hàng đợi, nghỉ ngẫu nhiên, nút Dừng, tiến độ).
6. Gắn nhãn `rules` + lệnh kiểm tra mẫu.
7. Nối frontend với `/api/dashboard/`.
8. (Khi có key) gắn nhãn `llm`.

Mỗi bước xong là chạy được và kiểm tra được; viết bài học HTML cuối mỗi phiên.

## 9. Rủi ro đã biết
- Google đổi giao diện → selector hỏng. Giảm thiểu: một file selector, thông báo lỗi rõ "không tìm thấy nút X".
- Bị nghi bot (captcha, chặn tạm). Giảm thiểu: nghỉ ngẫu nhiên, profile riêng, cào ít, phát hiện captcha thì dừng và báo.
- Điều khoản Google Play không cho phép thu thập tự động; dự án dùng nội bộ để nghiên cứu, lượng nhỏ, không phân phối lại dữ liệu.
- Nhãn bằng từ khóa kém chính xác → có bước kiểm tra mẫu và sửa tay.
- Mốc lượt tải và số lượt chấm trên web bị làm tròn ("10M+", "610K") → `minInstalls`, `ratings` là số xấp xỉ.

## 10. Để builder tự quyết
- Cấu trúc file chi tiết bên trong `extension/` và `backend/` (tên app Django, tên module).
- Cách viết test (pytest-django hay test của Django), miễn có test cho API ingest và hàm gắn nhãn.
- Cơ chế cache dữ liệu ở Next 16.
- Định dạng chính xác JSON gửi từ extension (miễn đủ trường ở mục 6.2).
- Cách content script và service worker trao đổi tin nhắn.
