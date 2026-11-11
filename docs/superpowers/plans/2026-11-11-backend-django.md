# Backend Django (lưu trữ, API cho extension, dashboard, gắn nhãn từ khóa) — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng backend Django nhận dữ liệu cào từ extension, lưu vào SQLite, gắn nhãn bằng từ khóa, và trả JSON đúng hình dạng `DashboardData` cho Next.js.

**Architecture:** Một Django project `config` với **một** Django app `market` (đủ nhỏ để sinh viên nắm hết), chia file theo trách nhiệm: `models.py`, `api/` (serializer + view), `services/` (logic thuần, dễ test), `labeling/` (gắn nhãn), `management/commands/`. Không có đăng nhập; chỉ chạy localhost. Việc nặng (gắn nhãn) chạy bằng lệnh `manage.py`, không trong request.

**Tech Stack:** Python 3.13 (miniconda có sẵn), Django 5.2 LTS, Django REST Framework 3.16, django-cors-headers 4.x, pytest + pytest-django, SQLite.

**Spec:** `docs/superpowers/specs/2026-11-11-crawler-backend-design.md` (đọc mục 6 và 7). Hợp đồng đầu ra: `frontend/src/lib/types.ts` → `DashboardData`.

**Ngoài phạm vi kế hoạch này:** extension Chrome, sửa `frontend/src/lib/dataSource.ts`, gắn nhãn bằng LLM (các kế hoạch sau).

## Global Constraints

- Tuân thủ skill `readable-code` (`.claude/skills/readable-code`): comment, docstring và thông báo lỗi trả cho người dùng bằng **tiếng Việt**; tên biến/hàm/class bằng **tiếng Anh**.
- JSON của `/api/dashboard/` dùng **camelCase** đúng từng tên trường trong `types.ts`; mọi API khác dùng **snake_case**.
- Ngày trong JSON: `"YYYY-MM-DD"`. `lang` chỉ `"vi"` hoặc `"en"`. `score` của review chỉ `1` hoặc `2`.
- Ngưỡng lọc app: `min_installs < 100_000` → loại; app game → loại.
- Mỗi request `POST /api/ingest/reviews/` tối đa **100** review.
- `meta.source` = `"Google Play (tự cào bằng extension)"`.
- Taxonomy khởi đầu = đúng id/tên trong `frontend/src/data/mockData.ts` (8 lĩnh vực, 3 nhóm pain, 10 pain point, 15 mong muốn).
- Nhãn gán tay (`manual`) **không bao giờ** bị lệnh tự động ghi đè; company đã gán của tài khoản developer **không** bị ingest ghi đè.
- Không dùng MongoDB; `DATABASES` mặc định SQLite file `backend/db.sqlite3`.
- `SECRET_KEY` đọc từ biến môi trường `DJANGO_SECRET_KEY`, có giá trị mặc định chỉ dùng khi dev.
- Lệnh chạy test (từ thư mục `backend/`): `.venv/Scripts/python -m pytest` (Windows, Git Bash).

## Review Focus

1. **Extension gửi lại cùng một đợt review** (mạng chập chờn, bấm cào lại) → không sinh bản trùng; trả `duplicates` đúng. Test ở Task 5.
2. **Cùng một id review xuất hiện ở lượt `vi` rồi lượt `en`** → giữ bản đầu, `lang` vẫn là `vi`. Test ở Task 5.
3. **Cào lại app sau khi đã gán công ty / gán lĩnh vực tay trong admin** → ingest không xóa `company`, không đổi `domain` có `domain_source="manual"`. Test ở Task 4.
4. **Review viết hoa hoặc không dấu** ("QUANG CAO QUA NHIEU") vẫn khớp nhãn `ads`; còn "downloads" thì **không** được khớp từ khóa "ads". Test ở Task 7.
5. **Biểu đồ sao rỗng / toàn số 0 / extension chỉ gửi phần trăm** → không chia cho 0, `low_star_ratio = 0.0`, số lượt 1★ và 2★ tính ra hợp lý. Test ở Task 2.

---

## Cấu trúc file

```
.gitignore                         (mới, ở thư mục gốc)
backend/
  requirements.txt
  pytest.ini
  manage.py
  README.md                        cách chạy, bằng tiếng Việt
  config/settings.py, urls.py, wsgi.py, asgi.py
  market/
    models.py                      toàn bộ bảng
    admin.py
    taxonomy_seed.py               hằng số taxonomy + từ khóa khởi đầu
    migrations/0001_initial.py     (makemigrations sinh)
    migrations/0002_seed_taxonomy.py
    services/stars.py              tính số lượt 1★/2★ và low_star_ratio
    services/scope.py              app có thuộc phạm vi dashboard không
    services/dashboard.py          dựng dict DashboardData
    api/serializers.py
    api/views.py
    api/urls.py
    labeling/text.py               chuẩn hóa chữ + khớp từ khóa
    labeling/rules.py              gắn nhãn review / lĩnh vực app
    management/commands/label_data.py
    management/commands/sample_labels.py
  tests/
    conftest.py                    factory dựng dữ liệu test
    test_health.py, test_models.py, test_api_developers.py,
    test_api_ingest_app.py, test_api_ingest_reviews.py,
    test_dashboard.py, test_labeling.py, test_commands.py
```

---

### Task 1: Đưa git ra thư mục gốc + khung Django chạy được

**Files:**
- Move: `frontend/.git` → `.git`
- Create: `.gitignore`, `backend/requirements.txt`, `backend/pytest.ini`, `backend/config/*`, `backend/manage.py`, `backend/market/__init__.py`, `backend/market/apps.py`, `backend/market/api/urls.py`, `backend/market/api/views.py`, `backend/tests/test_health.py`, `backend/README.md`

**Interfaces:**
- Produces: URL gốc `api/` include `market.api.urls`; view `health` tại `GET /api/health/` → `200 {"status": "ok"}` (extension dùng để biết Django đã bật chưa).

- [ ] **Step 1: Chuyển git ra gốc, giữ lịch sử.** Hỏi người dùng xác nhận trước khi chạy. Chạy `mv frontend/.git .git` ở thư mục gốc. Tạo `.gitignore` gốc gồm: `node_modules/`, `.next/`, `*.tsbuildinfo`, `.env*`, `backend/.venv/`, `backend/db.sqlite3`, `__pycache__/`, `.pytest_cache/`, `.superpowers/`. Giữ `frontend/.gitignore` (đường dẫn trong đó tương đối với `frontend/`, vẫn đúng).
  Kiểm tra: `git status` liệt kê các file frontend là đổi tên/thêm mới, **không** liệt kê `node_modules` hay `.next`.

- [ ] **Step 2: Commit việc chuyển git**
```bash
git add -A && git commit -m "chore: chuyển git ra thư mục gốc, thêm .gitignore chung"
```

- [ ] **Step 3: Tạo môi trường ảo và cài thư viện.** `backend/requirements.txt`:
```
Django>=5.2,<5.3
djangorestframework>=3.16,<3.17
django-cors-headers>=4.7,<5
pytest>=8,<9
pytest-django>=4.11,<5
```
Chạy: `cd backend && python -m venv .venv && .venv/Scripts/python -m pip install -r requirements.txt`
Kết quả mong đợi: cài xong, không lỗi.

- [ ] **Step 4: Tạo project.** `.venv/Scripts/django-admin startproject config .` rồi `.venv/Scripts/python manage.py startapp market`. Trong `config/settings.py`:
  - `INSTALLED_APPS` thêm `rest_framework`, `corsheaders`, `market`; middleware `corsheaders.middleware.CorsMiddleware` đặt trên `CommonMiddleware`.
  - `LANGUAGE_CODE = "vi"`, `TIME_ZONE = "Asia/Ho_Chi_Minh"`, `USE_TZ = True`.
  - `CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]`, `CORS_ALLOWED_ORIGIN_REGEXES = [r"^chrome-extension://.*$"]`.
  - `REST_FRAMEWORK = {"DEFAULT_AUTHENTICATION_CLASSES": [], "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"], "UNAUTHENTICATED_USER": None}`. Comment giải thích: không có đăng nhập thì DRF không bắt CSRF, nên extension POST được.
  - `SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-khong-dung-khi-deploy")`.
  - `pytest.ini`: `[pytest]` / `DJANGO_SETTINGS_MODULE = config.settings` / `python_files = test_*.py`.

- [ ] **Step 5: Viết test thất bại** `tests/test_health.py`:
```python
def test_health_returns_ok(client):
    response = client.get("/api/health/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 6: Chạy test, thấy FAIL** (404). Lệnh: `.venv/Scripts/python -m pytest tests/test_health.py -v`

- [ ] **Step 7: Viết `health` trong `market/api/views.py`** (DRF `@api_view(["GET"])`), nối `market/api/urls.py` và `config/urls.py` (`path("api/", include("market.api.urls"))`, giữ `admin/`).

- [ ] **Step 8: Chạy test, thấy PASS.**

- [ ] **Step 9: Viết `backend/README.md`** (tiếng Việt): tạo venv, cài thư viện, `migrate`, `createsuperuser`, `runserver`, chạy test, giải thích ngắn từng thư mục.

- [ ] **Step 10: Commit** `git add backend .gitignore && git commit -m "feat(backend): khung Django + DRF + CORS, endpoint health"`

---

### Task 2: Bảng dữ liệu, taxonomy khởi đầu, admin, hàm tính sao và phạm vi

**Files:**
- Create: `market/models.py`, `market/taxonomy_seed.py`, `market/migrations/0002_seed_taxonomy.py`, `market/admin.py`, `market/services/__init__.py`, `market/services/stars.py`, `market/services/scope.py`, `tests/conftest.py`, `tests/test_models.py`

**Interfaces:**
- Produces (models, trường đúng tên):
  - `Domain(id: CharField pk max 40, name, keywords: JSONField(default=list), order: int)`; `PainGroup(id pk, name)`; `PainPoint(id pk, name, group: FK PainGroup, keywords, order)`; `Wish(id pk, name, keywords, order)`. `Meta.ordering = ["order"]`.
  - `Company(id: SlugField pk, name, is_vietnamese: bool default True)`.
  - `DeveloperAccount(play_developer_id: CharField pk, display_name, play_url: URLField blank, company: FK Company null, status: choices "unassigned"|"assigned"|"foreign" default "unassigned", created_at)`.
  - `App(id: CharField pk max 255, title, developer_account: FK, category: blank, is_game: bool, installs_label, min_installs: BigInt, score: float, ratings: BigInt, star_histogram: JSONField(default=list) — 5 số lượt, phần tử [0] là 1★, low_star_ratio: float, contains_ads, offers_iap, description: Text, features: JSONField(default=list), domain: FK Domain null, domain_source: choices ""|"rules"|"llm"|"manual" default "", skipped_reason: choices ""|"under_100k"|"game" default "", raw_payload: JSONField(default=dict), last_crawled_at: datetime null)`.
  - `Review(id: CharField pk max 255 — id review của Google, app: FK related_name="reviews", lang: choices "vi"|"en", score: PositiveSmallInt, date: Date, content: Text, thumbs_up: int default 0, pain_points: M2M PainPoint blank, wish: FK Wish null, labeled_at: datetime null, label_source: choices ""|"rules"|"llm"|"manual" default "", raw_payload: JSONField(default=dict), created_at)`. Index `(app, lang, date)`.
  - `CrawlRun(id auto, trigger: choices "studio"|"app", target: CharField, started_at auto_now_add, finished_at null, stats: JSONField(default=dict), errors: JSONField(default=list))`.
- Produces (services):
  - `stars.star_counts_from_percentages(percentages: list[float], ratings: int) -> list[int]`: trả `[round(ratings * p / 100) for p in percentages]`.
  - `stars.low_star_ratio(histogram: list[int]) -> float`: `(h[0]+h[1]) / sum(h)`, làm tròn 4 chữ số; trả `0.0` nếu list rỗng, sai độ dài hoặc tổng bằng 0.
  - `scope.is_in_scope(app: App) -> bool`: True khi `developer_account.status == "assigned"`, có company và `company.is_vietnamese`.
  - `scope.skipped_reason_for(min_installs: int, is_game: bool) -> str`: `"game"` nếu là game (ưu tiên), `"under_100k"` nếu dưới 100_000, còn lại `""`.
- Produces (test helpers trong `tests/conftest.py`): fixture `make_company(**kw)`, `make_developer(**kw)`, `make_app(**kw)`, `make_review(**kw)`, có giá trị mặc định hợp lệ (app mặc định: 1_000_000 lượt tải, đã gán vào công ty Việt, domain `pdf`).

- [ ] **Step 1: Viết test thất bại** `tests/test_models.py`:
```python
def test_taxonomy_seeded(db):
    assert Domain.objects.count() == 8
    assert PainGroup.objects.count() == 3
    assert PainPoint.objects.count() == 10
    assert Wish.objects.count() == 15
    assert PainPoint.objects.get(id="ads").group_id == "business"
    assert "quảng cáo" in PainPoint.objects.get(id="ads").keywords

def test_low_star_ratio_normal():
    assert low_star_ratio([20, 10, 10, 20, 40]) == 0.3

def test_low_star_ratio_empty_or_zero():
    assert low_star_ratio([]) == 0.0
    assert low_star_ratio([0, 0, 0, 0, 0]) == 0.0

def test_star_counts_from_percentages():
    assert star_counts_from_percentages([10, 5, 5, 20, 60], 1000) == [100, 50, 50, 200, 600]

def test_skipped_reason():
    assert skipped_reason_for(50_000, False) == "under_100k"
    assert skipped_reason_for(5_000_000, True) == "game"
    assert skipped_reason_for(100_000, False) == ""

def test_scope(make_app, make_developer, make_company):
    assert is_in_scope(make_app()) is True
    foreign = make_developer(play_developer_id="adobe", status="foreign", company=None)
    assert is_in_scope(make_app(id="com.adobe.reader", developer_account=foreign)) is False
    unassigned = make_developer(play_developer_id="x", status="unassigned", company=None)
    assert is_in_scope(make_app(id="com.x", developer_account=unassigned)) is False
```

- [ ] **Step 2: Chạy test, thấy FAIL** (import lỗi). `.venv/Scripts/python -m pytest tests/test_models.py -v`

- [ ] **Step 3: Viết `models.py`** theo Interfaces, mỗi model có docstring tiếng Việt và `__str__`.

- [ ] **Step 4: Viết `taxonomy_seed.py`**: các hằng `DOMAINS`, `PAIN_GROUPS`, `PAIN_POINTS`, `WISHES` (list dict `id`, `name`, `keywords`, cùng `group` cho pain point), id/tên chép đúng từ `mockData.ts`. Mỗi nhãn có 3–8 từ khóa tiếng Việt **có dấu** và tiếng Anh. Bắt buộc có: `ads` gồm `"quảng cáo"`, `"ads"`, `"advertisement"`; `paywall` gồm `"trả phí"`, `"subscription"`, `"premium"`; `crash` gồm `"crash"`, `"văng"`, `"lỗi"`; lĩnh vực `pdf` gồm `"pdf"`, `"document"`, `"tài liệu"`.

- [ ] **Step 5: `makemigrations market`** (sinh `0001_initial`), rồi viết tay `0002_seed_taxonomy.py`. Dùng `RunPython` đọc từ `taxonomy_seed.py`, trường `order` lấy theo vị trí trong list. Có hàm `reverse` xóa dữ liệu đã nạp.

- [ ] **Step 6: Viết `services/stars.py`, `services/scope.py`, `tests/conftest.py`** theo Interfaces.

- [ ] **Step 7: Viết `admin.py`**:
  - Đăng ký `Company`, `Domain`, `PainPoint`, `Wish`, `CrawlRun`. `Domain` / `PainPoint` / `Wish` sửa được `keywords` trong admin, để thêm lĩnh vực mới mà không cần sửa code.
  - `DeveloperAccountAdmin`: `list_filter = ["status", "company"]`, để thấy mục "Tài khoản chưa gán".
  - `AppAdmin`: `list_filter` gồm `domain`, `skipped_reason`, và một bộ lọc tùy biến "Chưa có lĩnh vực" (`domain__isnull`). Khi lưu app mà người dùng đổi `domain` trong form, tự đặt `domain_source="manual"` (override `save_model`, so với giá trị cũ).
  - `ReviewAdmin`: tương tự, đổi `pain_points` hoặc `wish` thì đặt `label_source="manual"`. Có `search_fields = ["content"]`, `list_filter = ["lang", "score", "label_source", "app"]`.

- [ ] **Step 8: Chạy test, thấy PASS.** Sau đó chạy `.venv/Scripts/python manage.py migrate` để chắc migration chạy được trên DB thật.

- [ ] **Step 9: Commit** `git commit -m "feat(backend): models, taxonomy khởi đầu, admin, tính tỉ lệ 1–2★"`

---

### Task 3: API công ty và tài khoản developer (cho popup "Tài khoản này thuộc công ty nào?")

**Files:**
- Create: `market/api/serializers.py`, `tests/test_api_developers.py`
- Modify: `market/api/views.py`, `market/api/urls.py`

**Interfaces:**
- Consumes: models `Company`, `DeveloperAccount` (Task 2).
- Produces:
  - `GET /api/companies/` → `200 [{"id","name","is_vietnamese"}]`, sắp xếp theo `name`.
  - `GET /api/developer-accounts/<play_developer_id>/` → `200 {"play_developer_id","display_name","status","company": {"id","name"} | null}`; `404 {"detail": "Chưa biết tài khoản developer này."}` nếu chưa có.
  - `POST /api/developer-accounts/` body `{"play_developer_id", "display_name", "play_url"?, đúng MỘT trong: "company_id" | "new_company_name" | "foreign": true}` → upsert, `200` cùng hình dạng như GET. Quy tắc: `company_id` → status `assigned`; `new_company_name` → tạo `Company(id=slugify(name), name, is_vietnamese=True)` (nếu slug đã có thì dùng công ty đó), status `assigned`; `foreign` → `company=None`, status `foreign`. Không có hoặc có hơn một lựa chọn → `400`. `company_id` không tồn tại → `400`.

- [ ] **Step 1: Viết test thất bại**:
```python
def test_get_unknown_developer_404(client, db):
    assert client.get("/api/developer-accounts/abc/").status_code == 404

def test_assign_to_new_company(client, db):
    r = client.post("/api/developer-accounts/", {"play_developer_id": "123", "display_name": "PDF Reader Studio", "new_company_name": "Apero"}, content_type="application/json")
    assert r.status_code == 200
    assert r.json()["status"] == "assigned"
    assert r.json()["company"] == {"id": "apero", "name": "Apero"}

def test_mark_foreign(client, db): ...          # status "foreign", company None
def test_assign_existing_company(client, make_company): ...   # company_id
def test_reject_two_choices(client, db): ...    # company_id + foreign → 400
def test_reject_unknown_company_id(client, db): ...  # 400
def test_list_companies_sorted(client, make_company): ...
```

- [ ] **Step 2: Chạy test, thấy FAIL** (404 hoặc 405).
- [ ] **Step 3: Viết serializer và view** theo Interfaces. Logic chọn giữa ba lựa chọn đặt trong serializer `DeveloperAssignmentSerializer.validate` và `.save()`, với thông báo lỗi tiếng Việt.
- [ ] **Step 4: Chạy test, thấy PASS.**
- [ ] **Step 5: Commit** `git commit -m "feat(backend): API gán tài khoản developer vào công ty"`

---

### Task 4: Lần cào (crawl run), nhận thông tin app, trạng thái cào

**Files:**
- Create: `market/services/ingest.py`, `tests/test_api_ingest_app.py`
- Modify: `market/api/serializers.py`, `market/api/views.py`, `market/api/urls.py`

**Interfaces:**
- Consumes: `stars.*`, `scope.*` (Task 2).
- Produces:
  - `POST /api/crawl-runs/` `{"trigger": "studio"|"app", "target": str}` → `201 {"id": int}`.
  - `PATCH /api/crawl-runs/<id>/` `{"stats"?: dict, "errors"?: list, "finished": true}` → `200`. `finished: true` thì đặt `finished_at = now()`.
  - `POST /api/ingest/app/` body:
    ```
    {"run_id": int,
     "developer": {"play_developer_id", "display_name", "play_url"?},
     "app": {"id", "title", "category", "is_game", "installs_label", "min_installs", "score", "ratings",
             "star_histogram"?: [5 int] | "star_percentages"?: [5 float],
             "contains_ads", "offers_iap", "description"}}
    ```
    → `200 {"app_id", "in_scope": bool, "skipped_reason": str, "developer_status": str}`.
  - `services.ingest.upsert_app(data: dict, developer: dict) -> App`:
    - Tài khoản developer chưa có thì tạo với `status="unassigned"`. Đã có thì chỉ cập nhật `display_name` và `play_url`, **không đụng** `company` và `status`.
    - Có `star_percentages` mà không có `star_histogram` thì đổi sang số lượt bằng `star_counts_from_percentages`.
    - Tính `low_star_ratio` và `skipped_reason`.
    - Lưu toàn bộ body nhận được vào `raw_payload`, đặt `last_crawled_at = now()`.
    - **Không đụng** `domain`, `domain_source`, `features`.
    - Phải có ít nhất một trong `star_histogram` / `star_percentages`, và đúng 5 phần tử. Sai thì `400`.
  - `GET /api/crawl-state/?app_id=&lang=&score=` (`score` không bắt buộc) → `200 {"latest_review_id": str|null, "latest_review_date": "YYYY-MM-DD"|null, "review_count": int}`, lọc review theo app, lang (và score nếu có), lấy review có `date` mới nhất (cùng ngày thì lấy `created_at` mới nhất). Thiếu `app_id` hoặc `lang` sai thì `400`.

- [ ] **Step 1: Viết test thất bại**:
```python
def test_ingest_new_app_creates_unassigned_developer(client, db, run_id): ...
    # in_scope False, developer_status "unassigned", low_star_ratio tính đúng từ star_histogram
def test_ingest_percentages_converted(client, db, run_id): ...
    # star_percentages [10,5,5,20,60], ratings 1000 → star_histogram [100,50,50,200,600], low_star_ratio 0.15
def test_ingest_under_100k_marked_skipped(client, db, run_id): ...   # skipped_reason "under_100k"
def test_reingest_keeps_company_and_manual_domain(client, make_app, run_id):
    app = make_app(domain_source="manual")          # domain "pdf", đã gán công ty
    payload = payload_for(app, title="Tên mới")
    client.post("/api/ingest/app/", payload, content_type="application/json")
    app.refresh_from_db()
    assert app.title == "Tên mới"
    assert app.domain_id == "pdf" and app.domain_source == "manual"
    assert app.developer_account.status == "assigned"
def test_ingest_missing_histogram_400(client, db, run_id): ...
def test_crawl_state_empty(client, make_app): ...   # cả 3 trường null/0
def test_crawl_state_latest(client, make_app, make_review): ...  # 2 review vi, 1 en → trả review vi mới nhất
def test_crawl_run_finish(client, db): ...          # PATCH finished → finished_at có giá trị
```
Fixture `run_id` và helper `payload_for(app, **overrides)` đặt trong `tests/conftest.py`.

- [ ] **Step 2: Chạy test, thấy FAIL.**
- [ ] **Step 3: Viết `services/ingest.py` (`upsert_app`), serializer và view** theo Interfaces. Gói việc ghi trong `transaction.atomic()`.
- [ ] **Step 4: Chạy test, thấy PASS.**
- [ ] **Step 5: Commit** `git commit -m "feat(backend): API crawl-run, nhận thông tin app, trạng thái cào"`

---

### Task 5: Nhận review theo đợt

**Files:**
- Create: `tests/test_api_ingest_reviews.py`
- Modify: `market/services/ingest.py`, `market/api/serializers.py`, `market/api/views.py`, `market/api/urls.py`

**Interfaces:**
- Consumes: `App` đã có từ Task 4.
- Produces:
  - `POST /api/ingest/reviews/` `{"run_id", "app_id", "lang": "vi"|"en", "reviews": [{"id", "score", "date": "YYYY-MM-DD", "content", "thumbs_up"?}]}` → `200 {"created": int, "duplicates": int}`.
  - `services.ingest.add_reviews(app: App, lang: str, reviews: list[dict]) -> tuple[int, int]`: chỉ tạo review có id **chưa tồn tại ở bất kỳ lượt nào** (giữ bản thấy đầu tiên), dùng `bulk_create`. Mỗi review lưu nguyên dict gốc vào `raw_payload`. Trả `(created, duplicates)`.
  - Lỗi `400`, với thông báo tiếng Việt nói rõ phần tử thứ mấy bị sai: app không tồn tại; app có `skipped_reason` khác rỗng ("App đã bị loại: …"); quá 100 review; có review `score` khác 1 hoặc 2; `date` sai định dạng; `lang` sai. **Cả đợt bị từ chối** khi có một phần tử sai, để không lưu một nửa.

- [ ] **Step 1: Viết test thất bại**:
```python
def test_add_reviews_created(client, make_app, run_id): ...        # 3 review → created 3, duplicates 0
def test_resend_same_batch_no_duplicates(client, make_app, run_id):
    batch = reviews_batch(3)
    post(batch); r = post(batch)
    assert r.json() == {"created": 0, "duplicates": 3}
    assert Review.objects.count() == 3
def test_same_id_in_other_lang_keeps_first(client, make_app, run_id):
    post(lang="vi", reviews=[review("g1")]); r = post(lang="en", reviews=[review("g1")])
    assert r.json()["duplicates"] == 1
    assert Review.objects.get(id="g1").lang == "vi"
def test_reject_score_3(client, make_app, run_id): ...             # 400, không lưu review nào
def test_reject_over_100(client, make_app, run_id): ...            # 101 review → 400
def test_reject_skipped_app(client, make_app, run_id): ...         # app skipped_reason "game" → 400
def test_reject_bad_date(client, make_app, run_id): ...            # "03/11/2026" → 400
```

- [ ] **Step 2: Chạy test, thấy FAIL.**
- [ ] **Step 3: Viết `add_reviews`, serializer (`ReviewItemSerializer` có `many=True`, `max_length=100`) và view.**
- [ ] **Step 4: Chạy test, thấy PASS.**
- [ ] **Step 5: Commit** `git commit -m "feat(backend): API nhận review theo đợt, chống trùng"`

---

### Task 6: Endpoint dashboard trả `DashboardData`

**Files:**
- Create: `market/services/dashboard.py`, `tests/test_dashboard.py`
- Modify: `market/api/views.py`, `market/api/urls.py`

**Interfaces:**
- Consumes: models, `scope.is_in_scope`.
- Produces:
  - `services.dashboard.build_dashboard_data(include_foreign: bool = False) -> dict`, có đúng các khóa `meta, companies, domains, painGroups, painPoints, wishes, apps, reviews`.
    - **App được đưa vào** khi: `skipped_reason == ""`, có `domain`, và (`is_in_scope(app)` hoặc `include_foreign`).
    - **Review được đưa vào** khi: thuộc app đã được đưa vào và `labeled_at` không rỗng.
    - `apps[i]` có đủ trường: `id, title, companyId, domainId, installsLabel, minInstalls, score, ratings, lowStarRatio, oneStarRatings (= star_histogram[0]), twoStarRatings (= star_histogram[1]), containsAds, offersIAP, features`.
    - `companyId`: là `company.id` nếu có. App nước ngoài hoặc chưa gán thì là `"dev:" + play_developer_id`.
    - `companies`: các công ty Việt Nam có ít nhất một app được đưa vào. Khi `include_foreign`, thêm các mục `{"id": "dev:…", "name": display_name}` cho những tài khoản nước ngoài hoặc chưa gán có app được đưa vào.
    - `domains, painGroups, painPoints (có "group"), wishes`: lấy toàn bộ, theo `order`.
    - `reviews[i]`: `id, appId, score, date ("YYYY-MM-DD"), lang, content, painPoints (list id), wishId (id hoặc null), thumbsUp`.
    - `meta.updatedAt`: ngày (giờ Việt Nam) của `finished_at` mới nhất trong các `CrawlRun`. Chưa có lần cào nào xong thì lấy ngày hôm nay. `meta.source`: theo Global Constraints.
    - Dùng `select_related` / `prefetch_related` để tránh truy vấn N+1.
  - `GET /api/dashboard/?include_foreign=1` → `200` với dict ở trên.

- [ ] **Step 1: Viết test thất bại**:
```python
EXPECTED_APP_KEYS = {"id","title","companyId","domainId","installsLabel","minInstalls","score","ratings",
    "lowStarRatio","oneStarRatings","twoStarRatings","containsAds","offersIAP","features"}
EXPECTED_REVIEW_KEYS = {"id","appId","score","date","lang","content","painPoints","wishId","thumbsUp"}

def test_shape_matches_types_ts(client, make_app, make_review): ...   # đúng khóa ở mọi cấp
def test_excludes_foreign_by_default_and_includes_with_flag(client, make_app, make_developer): ...
def test_excludes_app_without_domain_and_skipped_app(client, make_app): ...
def test_excludes_unlabeled_reviews(client, make_app, make_review): ...
def test_one_two_star_from_histogram(client, make_app): ...   # [100,50,...] → 100, 50
def test_updated_at_from_latest_finished_run(client, db): ...
def test_query_count_is_constant(client, django_assert_max_num_queries, make_app, make_review):
    # tạo 5 app × 5 review → tối đa 12 truy vấn
```

- [ ] **Step 2: Chạy test, thấy FAIL.**
- [ ] **Step 3: Viết `build_dashboard_data` và view.** Tách từng hàm nhỏ `_serialize_app`, `_serialize_review`, `_included_apps` để dễ đọc.
- [ ] **Step 4: Chạy test, thấy PASS.**
- [ ] **Step 5: Commit** `git commit -m "feat(backend): endpoint dashboard trả DashboardData"`

---

### Task 7: Bộ gắn nhãn bằng từ khóa (hàm thuần)

**Files:**
- Create: `market/labeling/__init__.py`, `market/labeling/text.py`, `market/labeling/rules.py`, `tests/test_labeling.py`

**Interfaces:**
- Produces:
  - `text.normalize(text: str) -> str`: chuyển chữ thường, bỏ dấu tiếng Việt (`unicodedata` NFD rồi bỏ ký tự combining, đổi `đ` thành `d`), gộp khoảng trắng.
  - `text.contains_keyword(normalized_text: str, keyword: str) -> bool`: chuẩn hóa `keyword` rồi khớp theo **ranh giới từ** (`re.search(r"\b" + re.escape(k) + r"\b", ...)`).
  - `rules.Label = tuple[str, list[str]]` (id, keywords).
  - `rules.label_review(content: str, pain_labels: list[Label], wish_labels: list[Label]) -> tuple[list[str], str | None]`: trả **mọi** pain point có từ khóa khớp (giữ thứ tự của `pain_labels`), và mong muốn **đầu tiên** khớp (hoặc `None`).
  - `rules.label_app_domain(title: str, description: str, category: str, domain_labels: list[Label]) -> str | None`: điểm của mỗi lĩnh vực = 3 × số từ khóa khớp trong `title` + 1 × số từ khóa khớp trong `description + " " + category`. Lấy lĩnh vực có điểm cao nhất (> 0). Hòa điểm thì lấy lĩnh vực đứng trước trong list. Không khớp gì thì trả `None`.
  - Các hàm này **không** import model, để sau này bộ gắn nhãn LLM thay thế được với cùng đầu vào/đầu ra.

- [ ] **Step 1: Viết test thất bại**:
```python
PAINS = [("ads", ["quảng cáo", "ads"]), ("crash", ["văng", "crash"])]
WISHES = [("offline", ["offline", "không cần mạng"]), ("fewer_ads", ["ít quảng cáo"])]

def test_matches_without_diacritics_and_uppercase():
    assert label_review("QUANG CAO QUA NHIEU", PAINS, WISHES)[0] == ["ads"]

def test_ads_not_matched_inside_downloads():
    assert label_review("too many downloads needed", PAINS, WISHES)[0] == []

def test_multiple_pains_and_first_wish():
    assert label_review("Quảng cáo nhiều, hay văng app. Mong có offline", PAINS, WISHES) == (["ads", "crash"], "offline")

def test_no_match():
    assert label_review("tệ", PAINS, WISHES) == ([], None)

def test_domain_title_weighs_more():
    domains = [("pdf", ["pdf"]), ("scanner", ["scan", "quét"])]
    assert label_app_domain("PDF Reader", "scan documents, scan qr", "Productivity", domains) == "pdf"   # 3 > 2

def test_domain_none_when_no_keyword():
    assert label_app_domain("Flashlight", "bright light", "Tools", [("pdf", ["pdf"])]) is None
```

- [ ] **Step 2: Chạy test, thấy FAIL.**
- [ ] **Step 3: Viết `text.py` và `rules.py`.** Phần docstring nêu rõ hạn chế: không hiểu câu phủ định ("không có quảng cáo" vẫn bị gắn nhãn `ads`).
- [ ] **Step 4: Chạy test, thấy PASS.**
- [ ] **Step 5: Commit** `git commit -m "feat(backend): gắn nhãn pain point/lĩnh vực bằng từ khóa"`

---

### Task 8: Lệnh `label_data` và `sample_labels`

**Files:**
- Create: `market/management/__init__.py`, `market/management/commands/__init__.py`, `.../label_data.py`, `.../sample_labels.py`, `tests/test_commands.py`

**Interfaces:**
- Consumes: `rules.label_review`, `rules.label_app_domain` (Task 7); keywords đọc từ các bảng `Domain` / `PainPoint` / `Wish`.
- Produces:
  - `python manage.py label_data [--relabel]`:
    - **App** có `skipped_reason == ""`, `domain_source != "manual"`, và (`domain` rỗng hoặc có `--relabel`): gọi `label_app_domain`. Kết quả khác `None` thì đặt `domain` và `domain_source="rules"`.
    - **Review** có `label_source != "manual"`, và (`labeled_at` rỗng hoặc có `--relabel`): gọi `label_review`, đặt `pain_points`, `wish`, `labeled_at=now()`, `label_source="rules"`. Review không khớp nhãn nào **vẫn** được đặt `labeled_at`.
    - In ra (tiếng Việt): số app được gán lĩnh vực, **danh sách app chưa khớp lĩnh vực nào** (`appId — title`), và số review đã gắn nhãn.
  - `python manage.py sample_labels [--n 50] [--seed 0]`: in ngẫu nhiên N review đã gắn nhãn. Mỗi review in một khối gồm `[lang] appId`, 200 ký tự đầu của nội dung, danh sách tên pain point, và tên mong muốn. Cuối cùng in hướng dẫn: "Đếm số review gắn nhãn đúng; mục tiêu ≥ 70%".

- [ ] **Step 1: Viết test thất bại** (dùng `call_command` và `StringIO`):
```python
def test_label_data_labels_reviews_and_domain(make_app, make_review): ...
    # app domain None, title "PDF Reader" → domain "pdf", domain_source "rules"
    # review "quảng cáo quá nhiều" → pain_points ["ads"], labeled_at có giá trị
def test_label_data_skips_manual(make_app, make_review): ...
    # review label_source "manual" có pain ["crash"] → vẫn ["crash"] sau khi chạy với --relabel
    # app domain_source "manual" domain "music" → giữ "music"
def test_label_data_reports_unmatched_app(make_app): ...
    # app "Flashlight" → output chứa "com.flash" và vẫn domain None
def test_label_data_idempotent_without_relabel(make_app, make_review): ...
    # chạy lần 2 → báo 0 review gắn mới
def test_sample_labels_prints_n(make_app, make_review): ...  # 3 review đã nhãn, --n 2 → 2 khối
```

- [ ] **Step 2: Chạy test, thấy FAIL.**
- [ ] **Step 3: Viết hai lệnh.** Đọc taxonomy **một lần** thành list `Label` rồi truyền vào hàm thuần. Ghi review theo lô (ví dụ mỗi 500 review một `transaction.atomic()`).
- [ ] **Step 4: Chạy toàn bộ test, thấy PASS.** `.venv/Scripts/python -m pytest -v`
- [ ] **Step 5: Thử tay end-to-end.**
  - Chạy `runserver`.
  - Dùng `curl` POST một crawl-run, một app (title "PDF Reader") và 3 review.
  - Chạy `label_data`.
  - Gọi `GET /api/dashboard/?include_foreign=1`: phải thấy app với `domainId "pdf"` và 3 review đã có `painPoints`.
- [ ] **Step 6: Commit** `git commit -m "feat(backend): lệnh label_data và sample_labels"`

---

### Task 9: Cập nhật tài liệu cuối phiên

**Files:**
- Modify: `docs/HANDOFF.md`, `CLAUDE.md` (dòng `backend/` đổi từ "chưa làm" thành mô tả thật; thêm lệnh kiểm tra backend)
- Create: `docs/learning/03-backend-django.html` (+ cập nhật `docs/learning/index.html`) theo skill `learning-notes`

- [ ] **Step 1:** Cập nhật `HANDOFF.md`:
  - backend đã có những gì, cách chạy;
  - việc còn lại: extension, nối frontend, LLM;
  - xóa mục 5.3 và 5.4 vì đã xong.
- [ ] **Step 2:** Viết bài học HTML. Nội dung: model và quan hệ, DRF serializer, vì sao tách `services/`, cách chống trùng review, gắn nhãn bằng từ khóa và hạn chế của nó.
- [ ] **Step 3: Commit** `git commit -m "docs: bàn giao và bài học backend Django"`
