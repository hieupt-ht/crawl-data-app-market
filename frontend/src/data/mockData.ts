/**
 * mockData.ts — TOÀN BỘ DỮ LIỆU GIẢ của dashboard nằm ở đây.
 *
 * Phần vẽ giao diện (thư mục components/) KHÔNG biết dữ liệu là giả hay thật.
 * Nó chỉ đọc object `DATA` thông qua hàm `getDashboardData()` trong lib/dataSource.ts.
 * => Muốn đổi sang dữ liệu thật, chỉ cần sửa lib/dataSource.ts (xem ghi chú cuối file).
 */
import type { App, DashboardData } from "@/lib/types";
import { generateMockReviews } from "./reviewGenerator";

/** App viết tay chưa có số lượt 1★ / 2★ — hai số này được tính ra ở hàm addStarCounts() bên dưới. */
type HandwrittenApp = Omit<App, "oneStarRatings" | "twoStarRatings">;

// Phần dữ liệu "viết tay": công ty, lĩnh vực, nhãn, app.
// Review (khoảng 3.000 cái) được sinh tự động ở dòng `export const DATA` bên dưới.
const BASE: Omit<DashboardData, "reviews" | "apps"> & { apps: HandwrittenApp[] } = {
  meta: {
    updatedAt: "2026-11-10",
    source: "Google Play (dữ liệu giả để xem trước giao diện)",
  },

  companies: [
    { id: "roosterx", name: "RoosterX" },
    { id: "apero", name: "Apero" },
    { id: "ikame", name: "iKame" },
    { id: "lutech", name: "Lutech" },
    { id: "ecomobile", name: "Eco Mobile" },
    { id: "bravo", name: "Bravo Studio" },
    { id: "sunrise", name: "Sunrise Apps" },
    { id: "mango", name: "Mango Labs" },
  ],

  domains: [
    { id: "pdf", name: "Đọc PDF/tài liệu" },
    { id: "ai_photo", name: "Chỉnh ảnh AI" },
    { id: "cleaner", name: "Dọn rác/tăng tốc" },
    { id: "recovery", name: "Khôi phục dữ liệu" },
    { id: "scanner", name: "Quét QR/tài liệu" },
    { id: "notes_ai", name: "Ghi chú/ghi âm AI" },
    { id: "music", name: "Trình phát nhạc/nhạc chuông" },
    { id: "launcher", name: "Launcher/khóa màn hình" },
  ],

  painGroups: [
    { id: "business", name: "Mô hình kinh doanh (dễ sửa)" },
    { id: "technical", name: "Kỹ thuật" },
    { id: "experience", name: "Trải nghiệm/tính năng" },
  ],

  painPoints: [
    { id: "ads", name: "Quảng cáo quá nhiều", group: "business" },
    { id: "paywall", name: "Ép trả phí/subscription", group: "business" },
    { id: "locked", name: "Khóa tính năng cơ bản", group: "business" },
    { id: "billing", name: "Trừ tiền khó hủy", group: "business" },
    { id: "crash", name: "Crash/lỗi", group: "technical" },
    { id: "slow", name: "Chậm/tốn pin", group: "technical" },
    { id: "ai_bad", name: "Kết quả AI kém", group: "technical" },
    { id: "data_loss", name: "Mất dữ liệu", group: "technical" },
    { id: "ux", name: "Giao diện khó dùng", group: "experience" },
    { id: "missing", name: "Thiếu tính năng", group: "experience" },
  ],

  wishes: [
    { id: "one_time", name: "Mua một lần thay vì subscription" },
    { id: "offline", name: "Dùng được offline" },
    { id: "no_watermark", name: "Xuất file không bị watermark" },
    { id: "fewer_ads", name: "Ít quảng cáo hơn" },
    { id: "vietnamese", name: "Hỗ trợ tiếng Việt" },
    { id: "batch", name: "Xử lý hàng loạt" },
    { id: "clear_trial", name: "Dùng thử rõ ràng, dễ hủy" },
    { id: "preview", name: "Xem trước kết quả rồi mới trả phí" },
    { id: "faster", name: "Nhẹ máy, chạy nhanh hơn" },
    { id: "simple_ui", name: "Giao diện đơn giản hơn" },
    { id: "backup", name: "Tự động sao lưu" },
    { id: "better_ai", name: "AI chính xác hơn" },
    { id: "edit_file", name: "Sửa được nội dung file" },
    { id: "no_lock_ads", name: "Không quảng cáo ở màn hình khóa" },
    { id: "background_play", name: "Phát nhạc nền ổn định" },
  ],

  // 40 app giả. lowStarRatio = (số lượt 1★ + 2★) / tổng lượt chấm, lấy từ histogram.
  apps: [
    // --- Đọc PDF/tài liệu ---
    { id: "com.apero.pdfreader", title: "PDF Reader Pro: View & Edit", companyId: "apero", domainId: "pdf", installsLabel: "50.000.000+", minInstalls: 50_000_000, score: 4.1, ratings: 610_000, lowStarRatio: 0.26, containsAds: true, offersIAP: true, features: ["Xem PDF, Word, Excel", "Ghi chú & đánh dấu", "Chuyển ảnh sang PDF"] },
    { id: "com.ikame.alldocs", title: "All Document Reader", companyId: "ikame", domainId: "pdf", installsLabel: "10.000.000+", minInstalls: 10_000_000, score: 4.1, ratings: 220_000, lowStarRatio: 0.24, containsAds: true, offersIAP: true, features: ["Đọc mọi định dạng tài liệu", "Tìm file nhanh", "Chế độ đọc ban đêm"] },
    { id: "com.lutech.pdflite", title: "PDF Viewer Lite", companyId: "lutech", domainId: "pdf", installsLabel: "5.000.000+", minInstalls: 5_000_000, score: 4.0, ratings: 98_000, lowStarRatio: 0.26, containsAds: true, offersIAP: false, features: ["Xem PDF nhẹ", "Đánh dấu trang", "Chia sẻ file"] },
    { id: "com.roosterx.office", title: "Office Reader: Docs, Sheets", companyId: "roosterx", domainId: "pdf", installsLabel: "10.000.000+", minInstalls: 10_000_000, score: 4.2, ratings: 180_000, lowStarRatio: 0.22, containsAds: true, offersIAP: true, features: ["Xem Word, Excel, PowerPoint", "Chuyển sang PDF", "Quản lý file"] },
    { id: "com.ecomobile.easypdf", title: "Easy PDF Reader", companyId: "ecomobile", domainId: "pdf", installsLabel: "1.000.000+", minInstalls: 1_000_000, score: 3.9, ratings: 26_000, lowStarRatio: 0.28, containsAds: true, offersIAP: true, features: ["Xem PDF", "Ký tên lên PDF", "Nén file"] },
    { id: "com.mango.pdfmaster", title: "PDF Master - Merge & Split", companyId: "mango", domainId: "pdf", installsLabel: "500.000+", minInstalls: 500_000, score: 4.0, ratings: 12_000, lowStarRatio: 0.25, containsAds: true, offersIAP: true, features: ["Gộp & tách PDF", "Xoay trang", "Đặt mật khẩu"] },

    // --- Chỉnh ảnh AI ---
    { id: "com.apero.aienhancer", title: "AI Photo Enhancer: Sharp HD", companyId: "apero", domainId: "ai_photo", installsLabel: "50.000.000+", minInstalls: 50_000_000, score: 4.0, ratings: 640_000, lowStarRatio: 0.27, containsAds: true, offersIAP: true, features: ["Làm nét ảnh mờ", "Tô màu ảnh cũ", "Xóa vật thể"] },
    { id: "com.roosterx.aiart", title: "AI Art Generator: Dream Pic", companyId: "roosterx", domainId: "ai_photo", installsLabel: "5.000.000+", minInstalls: 5_000_000, score: 3.8, ratings: 120_000, lowStarRatio: 0.31, containsAds: true, offersIAP: true, features: ["Tạo ảnh từ chữ", "Biến ảnh thành anime", "Nhiều phong cách vẽ"] },
    { id: "com.ikame.bgeraser", title: "Background Eraser AI", companyId: "ikame", domainId: "ai_photo", installsLabel: "5.000.000+", minInstalls: 5_000_000, score: 4.1, ratings: 90_000, lowStarRatio: 0.24, containsAds: true, offersIAP: true, features: ["Xóa phông tự động", "Ghép nền mới", "Tạo sticker"] },
    { id: "com.lutech.faceswap", title: "AI Face Swap & Avatar", companyId: "lutech", domainId: "ai_photo", installsLabel: "1.000.000+", minInstalls: 1_000_000, score: 3.6, ratings: 30_000, lowStarRatio: 0.36, containsAds: true, offersIAP: true, features: ["Ghép mặt", "Tạo avatar AI", "Video face swap"] },
    { id: "com.sunrise.retouch", title: "Photo Editor AI - Retouch", companyId: "sunrise", domainId: "ai_photo", installsLabel: "1.000.000+", minInstalls: 1_000_000, score: 3.9, ratings: 21_000, lowStarRatio: 0.29, containsAds: true, offersIAP: true, features: ["Làm đẹp da", "Bộ lọc màu", "Cắt ghép ảnh"] },
    { id: "com.bravo.oldphoto", title: "Old Photo Restore AI", companyId: "bravo", domainId: "ai_photo", installsLabel: "500.000+", minInstalls: 500_000, score: 3.7, ratings: 9_000, lowStarRatio: 0.33, containsAds: true, offersIAP: true, features: ["Phục hồi ảnh cũ", "Tô màu ảnh đen trắng", "Làm nét khuôn mặt"] },

    // --- Dọn rác/tăng tốc ---
    { id: "com.ikame.cleaner", title: "Phone Cleaner - Junk Booster", companyId: "ikame", domainId: "cleaner", installsLabel: "50.000.000+", minInstalls: 50_000_000, score: 4.4, ratings: 900_000, lowStarRatio: 0.15, containsAds: true, offersIAP: true, features: ["Dọn file rác", "Tăng tốc RAM", "Quản lý ứng dụng"] },
    { id: "com.ecomobile.smartclean", title: "Smart Cleaner & Battery", companyId: "ecomobile", domainId: "cleaner", installsLabel: "10.000.000+", minInstalls: 10_000_000, score: 4.2, ratings: 150_000, lowStarRatio: 0.19, containsAds: true, offersIAP: true, features: ["Dọn rác", "Tiết kiệm pin", "Làm mát CPU"] },
    { id: "com.lutech.booster", title: "Speed Booster Master", companyId: "lutech", domainId: "cleaner", installsLabel: "10.000.000+", minInstalls: 10_000_000, score: 4.1, ratings: 130_000, lowStarRatio: 0.2, containsAds: true, offersIAP: false, features: ["Tăng tốc 1 chạm", "Dọn bộ nhớ đệm", "Tắt app chạy ngầm"] },
    { id: "com.bravo.storage", title: "Storage Cleaner Pro", companyId: "bravo", domainId: "cleaner", installsLabel: "5.000.000+", minInstalls: 5_000_000, score: 4.0, ratings: 70_000, lowStarRatio: 0.22, containsAds: true, offersIAP: true, features: ["Tìm file trùng", "Dọn ảnh trùng", "Phân tích bộ nhớ"] },
    { id: "com.sunrise.cpucooler", title: "CPU Cooler & Cleaner", companyId: "sunrise", domainId: "cleaner", installsLabel: "1.000.000+", minInstalls: 1_000_000, score: 3.9, ratings: 18_000, lowStarRatio: 0.24, containsAds: true, offersIAP: false, features: ["Làm mát máy", "Dọn rác", "Theo dõi nhiệt độ"] },

    // --- Khôi phục dữ liệu ---
    { id: "com.roosterx.photorecovery", title: "Photo Recovery: Restore Deleted", companyId: "roosterx", domainId: "recovery", installsLabel: "10.000.000+", minInstalls: 10_000_000, score: 3.6, ratings: 210_000, lowStarRatio: 0.38, containsAds: true, offersIAP: true, features: ["Khôi phục ảnh đã xóa", "Quét sâu bộ nhớ", "Xem trước ảnh"] },
    { id: "com.apero.filerecovery", title: "File Recovery - Data Restore", companyId: "apero", domainId: "recovery", installsLabel: "5.000.000+", minInstalls: 5_000_000, score: 3.5, ratings: 110_000, lowStarRatio: 0.4, containsAds: true, offersIAP: true, features: ["Khôi phục file, video, nhạc", "Thùng rác thông minh", "Quét theo loại file"] },
    { id: "com.ecomobile.videorecovery", title: "Video Recovery & Undelete", companyId: "ecomobile", domainId: "recovery", installsLabel: "1.000.000+", minInstalls: 1_000_000, score: 3.4, ratings: 24_000, lowStarRatio: 0.42, containsAds: true, offersIAP: true, features: ["Khôi phục video", "Quét thẻ nhớ", "Lưu vào thư mục riêng"] },
    { id: "com.mango.msgrecovery", title: "Deleted Messages Recovery", companyId: "mango", domainId: "recovery", installsLabel: "1.000.000+", minInstalls: 1_000_000, score: 3.3, ratings: 26_000, lowStarRatio: 0.44, containsAds: true, offersIAP: true, features: ["Xem tin nhắn đã thu hồi", "Lưu thông báo", "Khôi phục ảnh chat"] },
    { id: "com.bravo.recyclebin", title: "Recycle Bin Restore", companyId: "bravo", domainId: "recovery", installsLabel: "500.000+", minInstalls: 500_000, score: 3.7, ratings: 7_000, lowStarRatio: 0.35, containsAds: true, offersIAP: false, features: ["Thùng rác cho Android", "Khôi phục 1 chạm", "Tự xóa sau 30 ngày"] },

    // --- Quét QR/tài liệu ---
    { id: "com.apero.docscanner", title: "Doc Scanner - PDF Scan", companyId: "apero", domainId: "scanner", installsLabel: "10.000.000+", minInstalls: 10_000_000, score: 4.3, ratings: 170_000, lowStarRatio: 0.18, containsAds: true, offersIAP: true, features: ["Quét tài liệu ra PDF", "Cắt viền tự động", "Nhận dạng chữ (OCR)"] },
    { id: "com.ikame.qrscanner", title: "QR & Barcode Scanner", companyId: "ikame", domainId: "scanner", installsLabel: "50.000.000+", minInstalls: 50_000_000, score: 4.5, ratings: 700_000, lowStarRatio: 0.11, containsAds: true, offersIAP: true, features: ["Quét QR & mã vạch", "Tạo mã QR", "Lịch sử quét"] },
    { id: "com.lutech.camscan", title: "CamScan Lite: Scan to PDF", companyId: "lutech", domainId: "scanner", installsLabel: "5.000.000+", minInstalls: 5_000_000, score: 4.1, ratings: 65_000, lowStarRatio: 0.22, containsAds: true, offersIAP: true, features: ["Scan nhiều trang", "Bộ lọc làm rõ chữ", "Xuất PDF/JPG"] },
    { id: "com.sunrise.ocr", title: "Text Scanner OCR", companyId: "sunrise", domainId: "scanner", installsLabel: "1.000.000+", minInstalls: 1_000_000, score: 4.0, ratings: 15_000, lowStarRatio: 0.24, containsAds: true, offersIAP: true, features: ["Chụp ảnh ra chữ", "Dịch văn bản", "Sao chép nhanh"] },
    { id: "com.mango.idscanner", title: "ID Card Scanner", companyId: "mango", domainId: "scanner", installsLabel: "500.000+", minInstalls: 500_000, score: 3.9, ratings: 6_000, lowStarRatio: 0.25, containsAds: true, offersIAP: true, features: ["Scan CCCD 2 mặt", "Ghép 1 trang A4", "In trực tiếp"] },

    // --- Ghi chú/ghi âm AI ---
    { id: "com.roosterx.voicerecorder", title: "AI Voice Recorder & Transcribe", companyId: "roosterx", domainId: "notes_ai", installsLabel: "1.000.000+", minInstalls: 1_000_000, score: 3.7, ratings: 18_000, lowStarRatio: 0.33, containsAds: true, offersIAP: true, features: ["Ghi âm chất lượng cao", "Chuyển giọng nói thành chữ", "Tóm tắt bằng AI"] },
    { id: "com.apero.meetingnotes", title: "Meeting Notes AI", companyId: "apero", domainId: "notes_ai", installsLabel: "1.000.000+", minInstalls: 1_000_000, score: 3.8, ratings: 14_000, lowStarRatio: 0.31, containsAds: true, offersIAP: true, features: ["Ghi biên bản cuộc họp", "Tóm tắt ý chính", "Xuất ra Word"] },
    { id: "com.ikame.voicetotext", title: "Voice to Text Notes", companyId: "ikame", domainId: "notes_ai", installsLabel: "500.000+", minInstalls: 500_000, score: 3.9, ratings: 8_000, lowStarRatio: 0.28, containsAds: true, offersIAP: true, features: ["Nói thành chữ", "Ghi chú nhanh", "Đồng bộ đám mây"] },
    { id: "com.sunrise.smartnotes", title: "Smart Notes - AI Summary", companyId: "sunrise", domainId: "notes_ai", installsLabel: "100.000+", minInstalls: 100_000, score: 3.6, ratings: 2_100, lowStarRatio: 0.35, containsAds: true, offersIAP: true, features: ["Ghi chú", "AI tóm tắt", "Nhắc việc"] },

    // --- Trình phát nhạc/nhạc chuông ---
    { id: "com.lutech.musicplayer", title: "Music Player - MP3 Offline", companyId: "lutech", domainId: "music", installsLabel: "50.000.000+", minInstalls: 50_000_000, score: 4.5, ratings: 1_100_000, lowStarRatio: 0.1, containsAds: true, offersIAP: true, features: ["Phát MP3 offline", "Equalizer", "Hẹn giờ tắt"] },
    { id: "com.ecomobile.ringtone", title: "Ringtone Maker & Cutter", companyId: "ecomobile", domainId: "music", installsLabel: "10.000.000+", minInstalls: 10_000_000, score: 4.3, ratings: 140_000, lowStarRatio: 0.15, containsAds: true, offersIAP: false, features: ["Cắt nhạc chuông", "Ghép nhạc", "Đặt nhạc chuông"] },
    { id: "com.bravo.equalizer", title: "Equalizer & Bass Booster", companyId: "bravo", domainId: "music", installsLabel: "10.000.000+", minInstalls: 10_000_000, score: 4.2, ratings: 120_000, lowStarRatio: 0.16, containsAds: true, offersIAP: true, features: ["Chỉnh âm 10 dải", "Tăng bass", "Hiệu ứng âm thanh"] },
    { id: "com.mango.ringtones", title: "Free Ringtones 2026", companyId: "mango", domainId: "music", installsLabel: "5.000.000+", minInstalls: 5_000_000, score: 4.0, ratings: 60_000, lowStarRatio: 0.2, containsAds: true, offersIAP: false, features: ["Kho nhạc chuông", "Âm báo tin nhắn", "Tải về miễn phí"] },
    { id: "com.roosterx.audioplayer", title: "Audio Player Pro", companyId: "roosterx", domainId: "music", installsLabel: "1.000.000+", minInstalls: 1_000_000, score: 4.1, ratings: 13_000, lowStarRatio: 0.18, containsAds: true, offersIAP: true, features: ["Phát nhạc chất lượng cao", "Lời bài hát", "Playlist thông minh"] },

    // --- Launcher/khóa màn hình ---
    { id: "com.ikame.launcherios", title: "Launcher iOS 18 Style", companyId: "ikame", domainId: "launcher", installsLabel: "10.000.000+", minInstalls: 10_000_000, score: 4.0, ratings: 200_000, lowStarRatio: 0.24, containsAds: true, offersIAP: true, features: ["Giao diện kiểu iPhone", "Widget", "Trung tâm điều khiển"] },
    { id: "com.ecomobile.lockscreen", title: "Lock Screen & Wallpapers", companyId: "ecomobile", domainId: "launcher", installsLabel: "10.000.000+", minInstalls: 10_000_000, score: 3.9, ratings: 160_000, lowStarRatio: 0.26, containsAds: true, offersIAP: true, features: ["Màn hình khóa đẹp", "Hình nền động", "Mật khẩu hình vẽ"] },
    { id: "com.sunrise.theme3d", title: "Theme Launcher 3D", companyId: "sunrise", domainId: "launcher", installsLabel: "5.000.000+", minInstalls: 5_000_000, score: 3.8, ratings: 75_000, lowStarRatio: 0.28, containsAds: true, offersIAP: true, features: ["Chủ đề 3D", "Bộ icon", "Hiệu ứng vuốt"] },
    { id: "com.lutech.smartlauncher", title: "Smart Launcher Lite", companyId: "lutech", domainId: "launcher", installsLabel: "1.000.000+", minInstalls: 1_000_000, score: 4.0, ratings: 15_000, lowStarRatio: 0.23, containsAds: true, offersIAP: false, features: ["Launcher nhẹ", "Sắp xếp app tự động", "Ẩn ứng dụng"] },
  ],
};

/**
 * Tách tổng lượt chấm 1–2★ thành số 1★ và số 2★ (dữ liệu thật sẽ lấy thẳng từ histogram).
 * Trên Google Play, người đang bực thường chấm hẳn 1★, nên giả định 1★ chiếm 70%.
 * Vd ratings 610.000, lowStarRatio 0,26 -> 158.600 lượt 1–2★ -> 1★: 111.020 · 2★: 47.580
 */
function addStarCounts(app: HandwrittenApp): App {
  const lowStarRatings = Math.round(app.ratings * app.lowStarRatio);
  const oneStarRatings = Math.round(lowStarRatings * 0.7);
  return { ...app, oneStarRatings, twoStarRatings: lowStarRatings - oneStarRatings };
}

const APPS: App[] = BASE.apps.map(addStarCounts);

/** Object dữ liệu chính mà cả dashboard dùng. */
export const DATA: DashboardData = {
  ...BASE,
  apps: APPS,
  reviews: generateMockReviews({
    apps: APPS,
    updatedAt: BASE.meta.updatedAt,
    totalReviews: 3000,
    seed: 2026, // cùng seed => lần nào chạy cũng ra đúng bộ review giống nhau
  }),
};

/* =============================================================================
 * GHI CHÚ: CẤU TRÚC `DATA` VÀ CÁCH THAY BẰNG DỮ LIỆU THẬT
 * =============================================================================
 *
 * 1) Cấu trúc DATA (chi tiết từng trường xem lib/types.ts)
 *    DATA = {
 *      meta:       { updatedAt, source }
 *      companies:  [{ id, name }]
 *      domains:    [{ id, name }]                      // 8 lĩnh vực
 *      painGroups: [{ id, name }]                      // 3 nhóm
 *      painPoints: [{ id, name, group }]               // 10 nhãn
 *      wishes:     [{ id, name }]                      // 15 mong muốn
 *      apps:       [{ id, title, companyId, domainId, installsLabel, minInstalls,
 *                     score, ratings, lowStarRatio, oneStarRatings, twoStarRatings,
 *                     containsAds, offersIAP, features[] }]
 *      reviews:    [{ id, appId, score, date, lang, content,
 *                     painPoints[], wishId, thumbsUp }]
 *    }
 *
 * 2) Ánh xạ từ apps.csv  ->  DATA.apps
 *      app_id          -> id
 *      title           -> title
 *      company         -> companyId (đổi tên công ty thành id, vd "Eco Mobile" -> "ecomobile",
 *                         đồng thời thêm vào DATA.companies)
 *      domain          -> domainId  (cột do LLM gán; cột `genre` của Google quá chung chung)
 *      installs_label  -> installsLabel
 *      min_installs    -> minInstalls
 *      score           -> score
 *      ratings         -> ratings
 *      contains_ads    -> containsAds  ("True"/"False" -> true/false)
 *      offers_iap      -> offersIAP
 *      (cần thêm cột)  -> lowStarRatio   = (histogram[0] + histogram[1]) / tổng histogram
 *      (cần thêm cột)  -> oneStarRatings = histogram[0],  twoStarRatings = histogram[1]
 *      (cần thêm cột)  -> features     = 3–5 tính năng do LLM tóm tắt từ `description`
 *
 * 3) Ánh xạ từ reviews.csv  ->  DATA.reviews
 *      review_id   -> id
 *      app_id      -> appId
 *      score       -> score        (chỉ giữ 1 và 2)
 *      at          -> date         (cắt lấy "YYYY-MM-DD")
 *      lang        -> lang         ("en" | "vi")
 *      content     -> content
 *      pain_points -> painPoints   (vd "ads|paywall" -> ["ads", "paywall"], dùng đúng id ở trên)
 *      wish        -> wishId       (rỗng -> null)
 *      domain      -> không cần, vì đã biết domain qua app
 *      (thumbsUpCount của google-play-scraper) -> thumbsUp
 *      country     -> hiện chưa dùng
 *
 * 4) Cách thay: KHÔNG sửa component nào. Chỉ sửa lib/dataSource.ts:
 *      - Bước đầu: viết script đọc 2 file CSV -> xuất ra data/realData.json đúng cấu trúc trên,
 *        rồi trong dataSource.ts đổi `return DATA` thành `return realData`.
 *      - Khi có Django: tạo API GET /api/dashboard trả về JSON đúng cấu trúc trên,
 *        và dataSource.ts gọi fetch() tới API đó.
 * ========================================================================== */
