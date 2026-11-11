"""
serializers.py — Kiểm tra dữ liệu JSON gửi lên và chuyển bản ghi thành JSON trả về.

Serializer của Django REST Framework (DRF) làm hai việc:
- chiều vào: kiểm tra JSON (thiếu trường, sai kiểu…) rồi trả dict Python sạch trong `validated_data`;
- chiều ra: biến bản ghi model thành dict để trả JSON.
Lỗi kiểm tra được DRF tự trả về dạng `400 {"tên_trường": ["thông báo"]}`.
"""

from django.utils.text import slugify
from rest_framework import serializers

from market.models import Company, CrawlRun, DeveloperAccount

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
