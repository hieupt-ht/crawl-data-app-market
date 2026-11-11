"""
serializers.py — Kiểm tra dữ liệu JSON gửi lên và chuyển bản ghi thành JSON trả về.

Serializer của Django REST Framework (DRF) làm hai việc:
- chiều vào: kiểm tra JSON (thiếu trường, sai kiểu…) rồi trả dict Python sạch trong `validated_data`;
- chiều ra: biến bản ghi model thành dict để trả JSON.
Lỗi kiểm tra được DRF tự trả về dạng `400 {"tên_trường": ["thông báo"]}`.
"""

from django.utils.text import slugify
from rest_framework import serializers

from market.models import App, Company, CrawlRun, DeveloperAccount

# ---------------------------------------------------------------------------
# Công ty và tài khoản developer
# ---------------------------------------------------------------------------


class CompanySerializer(serializers.ModelSerializer):
    """Một công ty trong danh sách chọn của popup extension."""

    class Meta:
        model = Company
        fields = ["id", "name", "is_vietnamese"]


class CompanyBriefSerializer(serializers.ModelSerializer):
    """Công ty rút gọn, lồng bên trong tài khoản developer."""

    class Meta:
        model = Company
        fields = ["id", "name"]


class DeveloperAccountSerializer(serializers.ModelSerializer):
    """Tài khoản developer kèm công ty đã gán (hoặc null)."""

    company = CompanyBriefSerializer(allow_null=True)

    class Meta:
        model = DeveloperAccount
        fields = ["play_developer_id", "display_name", "status", "company"]


class DeveloperAssignmentSerializer(serializers.Serializer):
    """
    Nhận câu trả lời của popup "Tài khoản này thuộc công ty nào?".
    Người dùng chọn đúng MỘT trong ba cách:
      - `company_id`: chọn công ty đã có;
      - `new_company_name`: gõ tên công ty mới;
      - `foreign: true`: không phải studio Việt (app vẫn lưu nhưng ẩn khỏi dashboard).
    """

    play_developer_id = serializers.CharField(max_length=255)
    display_name = serializers.CharField(max_length=255)
    play_url = serializers.URLField(max_length=500, required=False, allow_blank=True)
    company_id = serializers.CharField(required=False)
    new_company_name = serializers.CharField(max_length=100, required=False)
    foreign = serializers.BooleanField(required=False, default=False)

    def validate(self, data: dict) -> dict:
        """Kiểm tra người dùng chọn đúng một cách, và công ty được chọn có thật."""
        chosen_options = []
        if "company_id" in data:
            chosen_options.append("company_id")
        if "new_company_name" in data:
            chosen_options.append("new_company_name")
        if data["foreign"]:
            chosen_options.append("foreign")

        if len(chosen_options) != 1:
            raise serializers.ValidationError(
                "Cần chọn đúng một trong: company_id, new_company_name, foreign. "
                f"Đang có {len(chosen_options)} lựa chọn."
            )

        if "company_id" in data and not Company.objects.filter(id=data["company_id"]).exists():
            raise serializers.ValidationError({"company_id": f"Không có công ty với id '{data['company_id']}'."})

        if "new_company_name" in data and not slugify(data["new_company_name"]):
            raise serializers.ValidationError({"new_company_name": "Tên công ty phải có ít nhất một chữ cái hoặc số."})

        return data

    def save(self) -> DeveloperAccount:
        """Tạo mới hoặc cập nhật tài khoản developer theo lựa chọn đã kiểm tra."""
        data = self.validated_data
        company = self._resolve_company(data)
        status = "foreign" if company is None else "assigned"

        fields_to_save = {"display_name": data["display_name"], "company": company, "status": status}
        if "play_url" in data:
            fields_to_save["play_url"] = data["play_url"]

        # update_or_create: có rồi thì sửa các trường trong `defaults`, chưa có thì tạo mới
        developer, _ = DeveloperAccount.objects.update_or_create(
            play_developer_id=data["play_developer_id"], defaults=fields_to_save
        )
        return developer

    @staticmethod
    def _resolve_company(data: dict) -> Company | None:
        """Trả công ty theo lựa chọn; None nghĩa là tài khoản nước ngoài."""
        if "company_id" in data:
            return Company.objects.get(id=data["company_id"])
        if "new_company_name" in data:
            name = data["new_company_name"]
            # get_or_create: id (slug) đã có thì dùng lại công ty đó, tránh tạo "Apero" hai lần
            company, _ = Company.objects.get_or_create(
                id=slugify(name), defaults={"name": name, "is_vietnamese": True}
            )
            return company
        return None


# ---------------------------------------------------------------------------
# Lần cào (crawl run) và trạng thái cào
# ---------------------------------------------------------------------------

STAR_LEVELS = 5


def validate_run_exists(run_id: int) -> int:
    """Mọi dữ liệu cào gửi lên phải thuộc một lần cào đã mở bằng POST /api/crawl-runs/."""
    if not CrawlRun.objects.filter(id=run_id).exists():
        raise serializers.ValidationError(f"Không có lần cào với id {run_id}. Hãy mở lần cào trước.")
    return run_id


class CrawlRunCreateSerializer(serializers.ModelSerializer):
    """Mở một lần cào: cào cả studio hay một app, và đích là gì (link hoặc appId)."""

    class Meta:
        model = CrawlRun
        fields = ["trigger", "target"]


class CrawlRunUpdateSerializer(serializers.Serializer):
    """Extension gửi thống kê, lỗi, và báo đã cào xong."""

    stats = serializers.DictField(required=False)
    errors = serializers.ListField(required=False)
    finished = serializers.BooleanField(required=False, default=False)


class CrawlStateQuerySerializer(serializers.Serializer):
    """Tham số trên URL của GET /api/crawl-state/."""

    app_id = serializers.CharField(max_length=255)
    lang = serializers.ChoiceField(choices=["vi", "en"])
    score = serializers.ChoiceField(choices=[1, 2], required=False)


# ---------------------------------------------------------------------------
# Nhận thông tin app
# ---------------------------------------------------------------------------


class DeveloperPayloadSerializer(serializers.Serializer):
    """Phần "developer" — dòng chữ xanh dưới tên app trên Google Play."""

    play_developer_id = serializers.CharField(max_length=255)
    display_name = serializers.CharField(max_length=255)
    play_url = serializers.URLField(max_length=500, required=False, allow_blank=True)


class AppPayloadSerializer(serializers.Serializer):
    """Phần "app" — thông tin đọc được trên trang chi tiết app."""

    id = serializers.CharField(max_length=255)
    title = serializers.CharField(max_length=255)
    category = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    is_game = serializers.BooleanField()
    installs_label = serializers.CharField(max_length=50)
    min_installs = serializers.IntegerField(min_value=0)
    score = serializers.FloatField(min_value=0, max_value=5)
    ratings = serializers.IntegerField(min_value=0)
    # Gửi một trong hai: số lượt thật của 5 mức sao, hoặc % độ dài 5 thanh (phần tử [0] là 1★)
    star_histogram = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        min_length=STAR_LEVELS,
        max_length=STAR_LEVELS,
        required=False,
    )
    star_percentages = serializers.ListField(
        child=serializers.FloatField(min_value=0, max_value=100),
        min_length=STAR_LEVELS,
        max_length=STAR_LEVELS,
        required=False,
    )
    contains_ads = serializers.BooleanField()
    offers_iap = serializers.BooleanField()
    description = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, data: dict) -> dict:
        if "star_histogram" not in data and "star_percentages" not in data:
            raise serializers.ValidationError("Cần gửi star_histogram (5 số lượt) hoặc star_percentages (5 số %).")
        return data


class IngestAppSerializer(serializers.Serializer):
    """Toàn bộ body của POST /api/ingest/app/."""

    run_id = serializers.IntegerField(validators=[validate_run_exists])
    developer = DeveloperPayloadSerializer()
    app = AppPayloadSerializer()


# ---------------------------------------------------------------------------
# Nhận review theo đợt
# ---------------------------------------------------------------------------

MAX_REVIEWS_PER_BATCH = 100


class ReviewItemSerializer(serializers.Serializer):
    """Một review 1–2★ extension đọc được trên trang "Xem tất cả bài đánh giá"."""

    id = serializers.CharField(max_length=255)
    score = serializers.ChoiceField(
        choices=[1, 2], error_messages={"invalid_choice": "score phải là 1 hoặc 2 (đang là {input})."}
    )
    # Chỉ nhận dạng "YYYY-MM-DD", để "03/11/2026" (3/11 hay 11/3?) không bị hiểu sai
    date = serializers.DateField(
        input_formats=["%Y-%m-%d"], error_messages={"invalid": "date phải có dạng YYYY-MM-DD."}
    )
    content = serializers.CharField(allow_blank=True, trim_whitespace=False)
    thumbs_up = serializers.IntegerField(min_value=0, required=False, default=0)

    def to_internal_value(self, data: dict) -> dict:
        """Kiểm tra như bình thường, rồi đính kèm bản gốc để lưu vào `raw_payload`."""
        validated = super().to_internal_value(data)
        validated["raw_payload"] = dict(data)
        return validated


class IngestReviewsSerializer(serializers.Serializer):
    """
    Body của POST /api/ingest/reviews/.
    Chỉ một review sai là CẢ ĐỢT bị từ chối, để database không bao giờ lưu một nửa đợt.
    """

    run_id = serializers.IntegerField(validators=[validate_run_exists])
    app_id = serializers.CharField(max_length=255)
    lang = serializers.ChoiceField(choices=["vi", "en"])
    # many=True: "reviews" là một danh sách, mỗi phần tử được kiểm tra bằng ReviewItemSerializer
    reviews = ReviewItemSerializer(
        many=True,
        allow_empty=False,
        max_length=MAX_REVIEWS_PER_BATCH,
        error_messages={
            "max_length": "Mỗi đợt tối đa {max_length} review. Hãy chia nhỏ đợt gửi.",
            "empty": "Đợt gửi phải có ít nhất một review.",
        },
    )

    def to_internal_value(self, data: dict) -> dict:
        try:
            return super().to_internal_value(data)
        except serializers.ValidationError as error:
            raise serializers.ValidationError(number_review_errors(error.detail))

    def validate(self, data: dict) -> dict:
        """Kiểm tra app có thật và chưa bị loại; đặt sẵn bản ghi App vào `data["app"]` cho view dùng."""
        app = App.objects.filter(id=data["app_id"]).first()
        if app is None:
            raise serializers.ValidationError(
                {"app_id": f"Chưa có app '{data['app_id']}'. Hãy gửi /api/ingest/app/ trước."}
            )
        if app.skipped_reason:
            raise serializers.ValidationError(
                {"app_id": f"App đã bị loại: {app.get_skipped_reason_display()}. Không nhận review."}
            )
        data["app"] = app
        return data


def number_review_errors(detail: dict) -> dict:
    """
    Đổi lỗi DRF của danh sách review sang câu tiếng Việt có số thứ tự, để biết sai ở phần tử nào.
    Ví dụ: {"reviews": [{}, {}, {"score": ["..."]}]} -> {"reviews": ["Review thứ 3 – score: ..."]}.
    """
    review_errors = detail.get("reviews")
    # Lỗi của từng phần tử có dạng list (mỗi phần tử một dict lỗi); lỗi chung (vd quá 100) thì giữ nguyên
    if not isinstance(review_errors, list):
        return detail

    messages = []
    for index, item_errors in enumerate(review_errors):
        if not isinstance(item_errors, dict):
            continue
        for field_name, field_messages in item_errors.items():
            for message in field_messages:
                messages.append(f"Review thứ {index + 1} – {field_name}: {message}")
    return {**detail, "reviews": messages}
