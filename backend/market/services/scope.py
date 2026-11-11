"""
scope.py — Quy tắc "app nào được tính" trên dashboard.

- Phạm vi: chỉ app của studio Việt Nam (tài khoản developer đã gán vào công ty Việt).
- Bị loại hẳn: app dưới 100K lượt tải hoặc là game.
"""

from market.models import App

MIN_INSTALLS = 100_000


def is_in_scope(app: App) -> bool:
    """True nếu app thuộc một công ty Việt Nam đã được gán."""
    developer = app.developer_account
    if developer.status != "assigned" or developer.company is None:
        return False
    return developer.company.is_vietnamese


def skipped_reason_for(min_installs: int, is_game: bool) -> str:
    """Lý do loại app: "game" (ưu tiên), "under_100k", hoặc "" nếu không bị loại."""
    if is_game:
        return "game"
    if min_installs < MIN_INSTALLS:
        return "under_100k"
    return ""
