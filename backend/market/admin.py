"""
admin.py — Cấu hình trang quản trị /admin/.

Đây là nơi người dùng:
- gán tài khoản developer vào công ty (mục "Tài khoản chưa gán": lọc status = Chưa gán);
- thêm lĩnh vực mới / sửa từ khóa mà không cần sửa code;
- sửa tay lĩnh vực của app hoặc nhãn của review. Sửa tay thì nhãn được đánh dấu "manual"
  để lệnh `label_data` không ghi đè.
"""

from django.contrib import admin
from django.utils import timezone

from .models import App, Company, CrawlRun, DeveloperAccount, Domain, PainPoint, Review, Wish

# Các trường nhãn của review: người dùng sửa một trong số này thì coi là gắn nhãn tay
REVIEW_LABEL_FIELDS = {"pain_points", "wish"}


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ["name", "id", "is_vietnamese"]
    list_filter = ["is_vietnamese"]


@admin.register(DeveloperAccount)
class DeveloperAccountAdmin(admin.ModelAdmin):
    list_display = ["display_name", "play_developer_id", "status", "company"]
    list_filter = ["status", "company"]
    search_fields = ["display_name", "play_developer_id"]


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ["name", "id", "order"]


@admin.register(PainPoint)
class PainPointAdmin(admin.ModelAdmin):
    list_display = ["name", "id", "group", "order"]
    list_filter = ["group"]


@admin.register(Wish)
class WishAdmin(admin.ModelAdmin):
    list_display = ["name", "id", "order"]


class MissingDomainFilter(admin.SimpleListFilter):
    """Bộ lọc "Chưa có lĩnh vực" — để tìm app mà bộ gắn nhãn chưa nhận ra và gán tay."""

    title = "lĩnh vực"
    parameter_name = "has_domain"

    def lookups(self, request, model_admin):
        return [("no", "Chưa có lĩnh vực"), ("yes", "Đã có lĩnh vực")]

    def queryset(self, request, queryset):
        if self.value() == "no":
            return queryset.filter(domain__isnull=True)
        if self.value() == "yes":
            return queryset.filter(domain__isnull=False)
        return queryset


@admin.register(App)
class AppAdmin(admin.ModelAdmin):
    list_display = ["title", "id", "developer_account", "domain", "domain_source", "installs_label", "skipped_reason"]
    list_filter = [MissingDomainFilter, "domain", "skipped_reason"]
    search_fields = ["title", "id"]

    def save_model(self, request, obj, form, change):
        # form.changed_data = danh sách tên trường người dùng vừa sửa trong form
        if "domain" in form.changed_data:
            obj.domain_source = "manual"
        super().save_model(request, obj, form, change)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["id", "app", "lang", "score", "date", "label_source"]
    list_filter = ["lang", "score", "label_source", "app"]
    search_fields = ["content"]
    filter_horizontal = ["pain_points"]

    def save_model(self, request, obj, form, change):
        if REVIEW_LABEL_FIELDS & set(form.changed_data):
            obj.label_source = "manual"
            # Đặt luôn labeled_at: review chưa từng qua label_data mà sửa tay thì vẫn phải lên dashboard
            # (dashboard chỉ lấy review có labeled_at, còn label_data bỏ qua review "manual")
            obj.labeled_at = timezone.now()
        super().save_model(request, obj, form, change)


@admin.register(CrawlRun)
class CrawlRunAdmin(admin.ModelAdmin):
    list_display = ["started_at", "trigger", "target", "finished_at"]
    list_filter = ["trigger"]
