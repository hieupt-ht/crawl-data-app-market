"""
0002_seed_taxonomy.py — Nạp bộ nhãn khởi đầu từ `market/taxonomy_seed.py` vào database.

Dùng data migration (thay vì fixture) để database nào chạy `migrate` cũng có sẵn nhãn,
kể cả database tạm của test.
"""

from django.db import migrations

from market.taxonomy_seed import DOMAINS, PAIN_GROUPS, PAIN_POINTS, WISHES


def seed_taxonomy(apps, schema_editor):
    # Dùng apps.get_model thay vì import model trực tiếp: migration phải chạy với
    # "phiên bản bảng" tại thời điểm migration này, không phải bản mới nhất trong models.py.
    Domain = apps.get_model("market", "Domain")
    PainGroup = apps.get_model("market", "PainGroup")
    PainPoint = apps.get_model("market", "PainPoint")
    Wish = apps.get_model("market", "Wish")

    for order, item in enumerate(DOMAINS):
        Domain.objects.create(id=item["id"], name=item["name"], keywords=item["keywords"], order=order)
    for order, item in enumerate(PAIN_GROUPS):
        PainGroup.objects.create(id=item["id"], name=item["name"], order=order)
    for order, item in enumerate(PAIN_POINTS):
        PainPoint.objects.create(
            id=item["id"], name=item["name"], group_id=item["group"], keywords=item["keywords"], order=order
        )
    for order, item in enumerate(WISHES):
        Wish.objects.create(id=item["id"], name=item["name"], keywords=item["keywords"], order=order)


def remove_taxonomy(apps, schema_editor):
    """Chạy khi lùi migration: xóa đúng những nhãn đã nạp."""
    for model_name, items in [("Wish", WISHES), ("PainPoint", PAIN_POINTS), ("PainGroup", PAIN_GROUPS), ("Domain", DOMAINS)]:
        apps.get_model("market", model_name).objects.filter(id__in=[item["id"] for item in items]).delete()


class Migration(migrations.Migration):
    dependencies = [("market", "0001_initial")]

    operations = [migrations.RunPython(seed_taxonomy, remove_taxonomy)]
