"""
0003_remove_ambiguous_keywords.py — Bỏ hai từ khóa gây gắn nhãn nhầm khỏi database đã có.

- "ad" (pain point `ads`): người Việt hay gọi quản trị viên là "Ad ơi…", không phải chê quảng cáo.
- "ui" (pain point `ux`): "ui" còn là tiếng cảm thán ("ui, hay quá").
`taxonomy_seed.py` cũng đã bỏ hai từ này, nên database mới tạo không có chúng.
Chỉ xóa đúng hai từ đó; từ khóa bạn tự thêm trong admin được giữ nguyên.
"""

from django.db import migrations

AMBIGUOUS_KEYWORDS = {"ads": "ad", "ux": "ui"}


def remove_ambiguous_keywords(apps, schema_editor):
    PainPoint = apps.get_model("market", "PainPoint")
    for pain_point_id, keyword in AMBIGUOUS_KEYWORDS.items():
        pain_point = PainPoint.objects.filter(id=pain_point_id).first()
        if pain_point is None or keyword not in pain_point.keywords:
            continue
        pain_point.keywords = [existing for existing in pain_point.keywords if existing != keyword]
        pain_point.save(update_fields=["keywords"])


class Migration(migrations.Migration):
    dependencies = [("market", "0002_seed_taxonomy")]

    # reverse = noop: quay lại migration trước thì không cần thêm lại hai từ khóa gây nhầm
    operations = [migrations.RunPython(remove_ambiguous_keywords, migrations.RunPython.noop)]
