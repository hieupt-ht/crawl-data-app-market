"""
taxonomy_seed.py — Bộ nhãn khởi đầu (lĩnh vực, nhóm pain, pain point, mong muốn) kèm từ khóa.

- id và tên chép đúng từ `frontend/src/data/mockData.ts` để dashboard hiện đúng như bản dữ liệu giả.
- Migration `0002_seed_taxonomy` đọc file này để nạp vào database một lần.
- Sau đó muốn thêm/sửa từ khóa hay lĩnh vực thì sửa trong trang admin, KHÔNG cần sửa file này.

Từ khóa viết có dấu cũng được: bộ gắn nhãn sẽ bỏ dấu cả từ khóa lẫn review trước khi so sánh.
"""

DOMAINS = [
    {"id": "pdf", "name": "Đọc PDF/tài liệu",
     "keywords": ["pdf", "document", "documents", "tài liệu", "word", "excel", "office", "docx"]},
    {"id": "ai_photo", "name": "Chỉnh ảnh AI",
     "keywords": ["photo editor", "ai photo", "enhancer", "face swap", "ai art", "chỉnh ảnh", "retouch", "background eraser"]},
    {"id": "cleaner", "name": "Dọn rác/tăng tốc",
     "keywords": ["cleaner", "junk", "booster", "dọn rác", "tăng tốc", "clean", "storage cleaner"]},
    {"id": "recovery", "name": "Khôi phục dữ liệu",
     "keywords": ["recovery", "recover", "restore deleted", "khôi phục", "deleted photos", "undelete"]},
    {"id": "scanner", "name": "Quét QR/tài liệu",
     "keywords": ["scanner", "scan", "qr", "barcode", "quét", "cam scanner"]},
    {"id": "notes_ai", "name": "Ghi chú/ghi âm AI",
     "keywords": ["notes", "note", "voice recorder", "ghi chú", "ghi âm", "transcribe", "recorder"]},
    {"id": "music", "name": "Trình phát nhạc/nhạc chuông",
     "keywords": ["music player", "mp3", "ringtone", "nhạc chuông", "nghe nhạc", "music", "audio player"]},
    {"id": "launcher", "name": "Launcher/khóa màn hình",
     "keywords": ["launcher", "lock screen", "wallpaper", "khóa màn hình", "hình nền", "theme"]},
]

PAIN_GROUPS = [
    {"id": "business", "name": "Mô hình kinh doanh (dễ sửa)"},
    {"id": "technical", "name": "Kỹ thuật"},
    {"id": "experience", "name": "Trải nghiệm/tính năng"},
]

PAIN_POINTS = [
    {"id": "ads", "name": "Quảng cáo quá nhiều", "group": "business",
     "keywords": ["quảng cáo", "ads", "ad", "advertisement", "advertisements", "qc"]},
    {"id": "paywall", "name": "Ép trả phí/subscription", "group": "business",
     "keywords": ["trả phí", "subscription", "premium", "pay", "paywall", "mất phí", "tính phí"]},
    {"id": "locked", "name": "Khóa tính năng cơ bản", "group": "business",
     "keywords": ["khóa tính năng", "locked", "phải mua", "pro version", "bản pro", "unlock"]},
    {"id": "billing", "name": "Trừ tiền khó hủy", "group": "business",
     "keywords": ["trừ tiền", "charged", "refund", "hoàn tiền", "cancel subscription", "hủy gói", "scam", "lừa đảo"]},
    {"id": "crash", "name": "Crash/lỗi", "group": "technical",
     "keywords": ["crash", "crashes", "văng", "lỗi", "bug", "đơ", "not working", "không mở được", "force close"]},
    {"id": "slow", "name": "Chậm/tốn pin", "group": "technical",
     "keywords": ["chậm", "slow", "lag", "lag quá", "tốn pin", "battery", "nóng máy", "laggy"]},
    {"id": "ai_bad", "name": "Kết quả AI kém", "group": "technical",
     "keywords": ["ai kém", "ai tệ", "blurry", "mờ", "bad result", "kết quả tệ", "inaccurate"]},
    {"id": "data_loss", "name": "Mất dữ liệu", "group": "technical",
     "keywords": ["mất dữ liệu", "mất file", "lost", "deleted my", "mất hết", "data loss", "mất ảnh"]},
    {"id": "ux", "name": "Giao diện khó dùng", "group": "experience",
     "keywords": ["khó dùng", "khó sử dụng", "confusing", "giao diện", "interface", "ui", "complicated", "rối"]},
    {"id": "missing", "name": "Thiếu tính năng", "group": "experience",
     "keywords": ["thiếu", "missing", "không có tính năng", "no option", "can't edit", "lack"]},
]

# Thứ tự quan trọng: một review chỉ nhận MỘT mong muốn — mong muốn đứng trước được ưu tiên.
WISHES = [
    {"id": "one_time", "name": "Mua một lần thay vì subscription",
     "keywords": ["mua một lần", "one time", "one-time", "lifetime", "trọn đời"]},
    {"id": "offline", "name": "Dùng được offline",
     "keywords": ["offline", "không cần mạng", "without internet", "không có mạng"]},
    {"id": "no_watermark", "name": "Xuất file không bị watermark",
     "keywords": ["watermark", "logo", "hình mờ"]},
    {"id": "fewer_ads", "name": "Ít quảng cáo hơn",
     "keywords": ["ít quảng cáo", "bớt quảng cáo", "less ads", "fewer ads", "remove ads", "too many ads"]},
    {"id": "vietnamese", "name": "Hỗ trợ tiếng Việt",
     "keywords": ["tiếng việt", "vietnamese"]},
    {"id": "batch", "name": "Xử lý hàng loạt",
     "keywords": ["hàng loạt", "batch", "nhiều file cùng lúc", "multiple files"]},
    {"id": "clear_trial", "name": "Dùng thử rõ ràng, dễ hủy",
     "keywords": ["dùng thử", "free trial", "trial", "dễ hủy", "easy to cancel"]},
    {"id": "preview", "name": "Xem trước kết quả rồi mới trả phí",
     "keywords": ["xem trước", "preview", "before paying", "trước khi trả"]},
    {"id": "faster", "name": "Nhẹ máy, chạy nhanh hơn",
     "keywords": ["nhẹ hơn", "nhanh hơn", "faster", "lighter"]},
    {"id": "simple_ui", "name": "Giao diện đơn giản hơn",
     "keywords": ["đơn giản hơn", "simpler", "simple ui", "dễ dùng hơn"]},
    {"id": "backup", "name": "Tự động sao lưu",
     "keywords": ["sao lưu", "backup", "back up", "cloud sync"]},
    {"id": "better_ai", "name": "AI chính xác hơn",
     "keywords": ["chính xác hơn", "more accurate", "better ai", "ai tốt hơn"]},
    {"id": "edit_file", "name": "Sửa được nội dung file",
     "keywords": ["chỉnh sửa", "edit pdf", "edit text", "sửa nội dung", "edit file"]},
    {"id": "no_lock_ads", "name": "Không quảng cáo ở màn hình khóa",
     "keywords": ["màn hình khóa", "lock screen ads", "lockscreen"]},
    {"id": "background_play", "name": "Phát nhạc nền ổn định",
     "keywords": ["phát nền", "background play", "chạy nền", "background"]},
]
