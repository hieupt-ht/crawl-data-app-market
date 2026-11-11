"""
models.py — Các bảng dữ liệu của backend.

Luồng dữ liệu: extension cào Google Play → lưu vào các bảng này → lệnh `label_data` gắn nhãn
→ `/api/dashboard/` đọc ra cho Next.js.

Quan hệ chính:
    Company (studio thật) 1—n DeveloperAccount (tên người đăng app trên Google Play)
    DeveloperAccount 1—n App 1—n Review
    Review n—n PainPoint, Review n—1 Wish, App n—1 Domain
"""

from django.db import models

# Nguồn của một nhãn: do lệnh tự động gắn (rules/llm) hay do người sửa tay trong admin (manual).
# Nhãn "manual" không bao giờ bị lệnh tự động ghi đè.
LABEL_SOURCE_CHOICES = [
    ("", "Chưa gắn"),
    ("rules", "Từ khóa"),
    ("llm", "AI"),
    ("manual", "Sửa tay"),
]


# ---------------------------------------------------------------------------
# Bộ nhãn (taxonomy): nạp sẵn bằng migration 0002, sửa thêm được trong admin
# ---------------------------------------------------------------------------


class Domain(models.Model):
    """Lĩnh vực app, ví dụ "Đọc PDF/tài liệu"."""

    id = models.CharField(primary_key=True, max_length=40)
    name = models.CharField(max_length=100)
    # Danh sách từ khóa (Việt + Anh) để bộ gắn nhãn bằng từ khóa nhận ra lĩnh vực này
    keywords = models.JSONField(default=list, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "lĩnh vực"
        verbose_name_plural = "lĩnh vực"

    def __str__(self) -> str:
        return self.name


class PainGroup(models.Model):
    """Nhóm pain point: business (mô hình kinh doanh — dễ sửa), technical, experience."""

    id = models.CharField(primary_key=True, max_length=20)
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "nhóm pain point"
        verbose_name_plural = "nhóm pain point"

    def __str__(self) -> str:
        return self.name


class PainPoint(models.Model):
    """Một điều người dùng chê, ví dụ "Quảng cáo quá nhiều"."""

    id = models.CharField(primary_key=True, max_length=40)
    name = models.CharField(max_length=100)
    group = models.ForeignKey(PainGroup, on_delete=models.PROTECT, related_name="pain_points")
    keywords = models.JSONField(default=list, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "pain point"
        verbose_name_plural = "pain point"

    def __str__(self) -> str:
        return self.name


class Wish(models.Model):
    """Một mong muốn lặp lại của người dùng, ví dụ "Dùng được offline"."""

    id = models.CharField(primary_key=True, max_length=40)
    name = models.CharField(max_length=100)
    keywords = models.JSONField(default=list, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "mong muốn"
        verbose_name_plural = "mong muốn"

    def __str__(self) -> str:
        return self.name


# ---------------------------------------------------------------------------
# Công ty và tài khoản developer
# ---------------------------------------------------------------------------


class Company(models.Model):
    """Studio thật (công ty), ví dụ Apero. Một công ty có thể có nhiều tài khoản developer."""

    id = models.SlugField(primary_key=True, max_length=60)
    name = models.CharField(max_length=100)
    # Chỉ app của công ty Việt Nam mới hiện trên dashboard (trừ khi bật include_foreign)
    is_vietnamese = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "công ty"
        verbose_name_plural = "công ty"

    def __str__(self) -> str:
        return self.name


class DeveloperAccount(models.Model):
    """
    Tài khoản người đăng app trên Google Play — dòng chữ xanh dưới tên app.
    Google Play không cho biết tài khoản thuộc công ty nào, nên người dùng gán một lần
    (qua popup extension hoặc admin).
    """

    STATUS_CHOICES = [
        ("unassigned", "Chưa gán"),
        ("assigned", "Đã gán công ty"),
        ("foreign", "Không phải studio Việt"),
    ]

    play_developer_id = models.CharField(primary_key=True, max_length=255)
    display_name = models.CharField(max_length=255)
    play_url = models.URLField(max_length=500, blank=True)
    company = models.ForeignKey(
        Company, null=True, blank=True, on_delete=models.SET_NULL, related_name="developer_accounts"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="unassigned")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["display_name"]
        verbose_name = "tài khoản developer"
        verbose_name_plural = "tài khoản developer"

    def __str__(self) -> str:
        return self.display_name


# ---------------------------------------------------------------------------
# App và review
# ---------------------------------------------------------------------------


class App(models.Model):
    """Một app trên Google Play, khóa chính là appId (vd "com.apero.pdfreader")."""

    SKIPPED_REASON_CHOICES = [
        ("", "Không bị loại"),
        ("under_100k", "Dưới 100K lượt tải"),
        ("game", "Là game"),
    ]

    id = models.CharField(primary_key=True, max_length=255)
    title = models.CharField(max_length=255)
    developer_account = models.ForeignKey(DeveloperAccount, on_delete=models.PROTECT, related_name="apps")
    category = models.CharField(max_length=100, blank=True)
    is_game = models.BooleanField(default=False)
    installs_label = models.CharField(max_length=50)
    min_installs = models.BigIntegerField()
    score = models.FloatField()
    ratings = models.BigIntegerField()
    # 5 số lượt chấm sao, phần tử [0] là 1★, [4] là 5★
    star_histogram = models.JSONField(default=list)
    low_star_ratio = models.FloatField(default=0.0)
    contains_ads = models.BooleanField(default=False)
    offers_iap = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    features = models.JSONField(default=list, blank=True)
    domain = models.ForeignKey(Domain, null=True, blank=True, on_delete=models.SET_NULL, related_name="apps")
    domain_source = models.CharField(max_length=10, choices=LABEL_SOURCE_CHOICES, default="", blank=True)
    skipped_reason = models.CharField(max_length=20, choices=SKIPPED_REASON_CHOICES, default="", blank=True)
    # Bản gốc extension gửi lên — giữ lại phòng khi sau này cần đọc thêm trường mới
    raw_payload = models.JSONField(default=dict, blank=True)
    last_crawled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["title"]
        verbose_name = "app"
        verbose_name_plural = "app"

    def __str__(self) -> str:
        return self.title


class Review(models.Model):
    """Một review 1–2★. Khóa chính là id review của Google nên gửi lại không bị trùng."""

    LANG_CHOICES = [("vi", "Lượt tiếng Việt"), ("en", "Lượt tiếng Anh")]

    id = models.CharField(primary_key=True, max_length=255)
    app = models.ForeignKey(App, on_delete=models.CASCADE, related_name="reviews")
    # Lượt cào đã lấy review này (vi = hl=vi&gl=VN, en = hl=en&gl=US), không phải ngôn ngữ thật của chữ
    lang = models.CharField(max_length=2, choices=LANG_CHOICES)
    score = models.PositiveSmallIntegerField()
    date = models.DateField()
    content = models.TextField()
    thumbs_up = models.PositiveIntegerField(default=0)
    pain_points = models.ManyToManyField(PainPoint, blank=True, related_name="reviews")
    wish = models.ForeignKey(Wish, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviews")
    labeled_at = models.DateTimeField(null=True, blank=True)
    label_source = models.CharField(max_length=10, choices=LABEL_SOURCE_CHOICES, default="", blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        # Index giúp câu hỏi "review mới nhất của app X ở lượt Y" (crawl-state) chạy nhanh
        indexes = [models.Index(fields=["app", "lang", "date"])]
        verbose_name = "review"
        verbose_name_plural = "review"

    def __str__(self) -> str:
        return f"{self.app_id} · {self.score}★ · {self.content[:40]}"


class CrawlRun(models.Model):
    """Nhật ký một lần bấm nút cào trong extension."""

    TRIGGER_CHOICES = [("studio", "Cào studio"), ("app", "Cào một app")]

    trigger = models.CharField(max_length=10, choices=TRIGGER_CHOICES)
    target = models.CharField(max_length=500)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    stats = models.JSONField(default=dict, blank=True)
    errors = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-started_at"]
        verbose_name = "lần cào"
        verbose_name_plural = "lần cào"

    def __str__(self) -> str:
        return f"{self.get_trigger_display()} · {self.target}"
