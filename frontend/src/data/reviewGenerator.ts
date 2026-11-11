/**
 * reviewGenerator.ts — Sinh khoảng 3.000 review 1–2★ GIẢ nhưng có "câu chuyện".
 *
 * File này chỉ dùng trong giai đoạn mockup. Khi có dữ liệu thật thì bỏ file này đi.
 *
 * Ý tưởng:
 *  - Mỗi lĩnh vực có một "hồ sơ pain point" (PAIN_PROFILE): pain nào hay gặp hơn.
 *    Ví dụ app PDF đau nhất vì quảng cáo, app ảnh AI đau vì paywall,
 *    app khôi phục dữ liệu đau vì "quét mãi không ra file" (nhãn Chậm/tốn pin).
 *  - Nội dung review ghép từ các câu mẫu (template) để đọc cho tự nhiên.
 *  - Dùng bộ sinh số ngẫu nhiên CÓ SEED: cùng seed thì kết quả luôn giống nhau.
 *    Điều này quan trọng vì Next.js render trên server rồi lại render trên trình duyệt,
 *    nếu dữ liệu khác nhau giữa 2 lần sẽ bị lỗi "hydration mismatch".
 */
import type { App, Review, ReviewLang } from "@/lib/types";

// ---------------------------------------------------------------------------
// 1. Bộ sinh số ngẫu nhiên có seed (thuật toán mulberry32, rất ngắn và đủ tốt)
// ---------------------------------------------------------------------------
type RandomFn = () => number; // trả về số thực trong [0, 1)

function createRandom(seed: number): RandomFn {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Chọn ngẫu nhiên 1 phần tử trong mảng. */
function pickOne<T>(random: RandomFn, items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

/** Chọn 1 key theo trọng số. Vd { ads: 50, crash: 10 } => "ads" có khả năng gấp 5 lần. */
function pickWeighted(random: RandomFn, weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let threshold = random() * total;
  for (const [key, weight] of entries) {
    threshold -= weight;
    if (threshold <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

// ---------------------------------------------------------------------------
// 2. "Câu chuyện" của từng lĩnh vực: tỉ trọng các pain point
// ---------------------------------------------------------------------------
const PAIN_PROFILE: Record<string, Record<string, number>> = {
  pdf: { ads: 50, locked: 12, paywall: 8, crash: 10, slow: 6, ux: 6, missing: 8 },
  ai_photo: { paywall: 40, billing: 15, locked: 12, ai_bad: 20, ads: 8, crash: 5 },
  cleaner: { ads: 42, slow: 20, paywall: 8, ux: 12, crash: 6, missing: 4, billing: 4 },
  recovery: { slow: 35, paywall: 22, data_loss: 12, crash: 10, ads: 10, ux: 5 },
  scanner: { locked: 30, ads: 18, ai_bad: 15, paywall: 12, crash: 8, ux: 7, missing: 10 },
  notes_ai: { ai_bad: 28, paywall: 22, billing: 14, data_loss: 12, crash: 8, missing: 10 },
  music: { ads: 35, crash: 20, missing: 18, ux: 10, slow: 8, paywall: 5 },
  launcher: { ads: 38, slow: 22, data_loss: 10, crash: 12, ux: 10, paywall: 4 },
};

/** Từ vựng riêng của từng lĩnh vực, dùng để điền vào chỗ {action}, {noun}... trong câu mẫu. */
const VOCAB: Record<string, { action: string; noun: string; actionVi: string; nounVi: string }> = {
  pdf: { action: "open a PDF", noun: "documents", actionVi: "mở file PDF", nounVi: "tài liệu" },
  ai_photo: { action: "edit a photo", noun: "photos", actionVi: "chỉnh ảnh", nounVi: "ảnh" },
  cleaner: { action: "clean my phone", noun: "storage", actionVi: "dọn máy", nounVi: "bộ nhớ" },
  recovery: { action: "recover my deleted photos", noun: "files", actionVi: "khôi phục ảnh đã xóa", nounVi: "file" },
  scanner: { action: "scan a document", noun: "scans", actionVi: "quét tài liệu", nounVi: "bản scan" },
  notes_ai: { action: "transcribe a recording", noun: "recordings", actionVi: "chuyển giọng nói thành chữ", nounVi: "bản ghi âm" },
  music: { action: "play my songs", noun: "songs", actionVi: "nghe nhạc", nounVi: "bài hát" },
  launcher: { action: "unlock my phone", noun: "home screen", actionVi: "mở khóa máy", nounVi: "màn hình chính" },
};

// ---------------------------------------------------------------------------
// 3. Câu mẫu
// ---------------------------------------------------------------------------
type Templates = { en: string[]; vi: string[] };

/** Câu mẫu dùng chung cho mọi lĩnh vực. */
const GENERIC: Record<string, Templates> = {
  ads: {
    en: [
      "Ads after every single tap. I just wanted to {action} and had to close three ads first.",
      "Way too many ads. Full screen video ads you can't skip for 30 seconds.",
      "An ad pops up every time I press back. It's ridiculous.",
      "More ads than actual content. Can't even {action} in peace.",
    ],
    vi: [
      "Quảng cáo quá nhiều, bấm gì cũng hiện quảng cáo.",
      "Mở app lên là quảng cáo toàn màn hình, chờ mãi mới tắt được.",
      "Muốn {actionVi} thôi mà phải xem 3 cái quảng cáo.",
    ],
  },
  paywall: {
    en: [
      "Everything is behind a paywall. The free version does basically nothing.",
      "It asks me to subscribe before I can even {action}.",
      "Premium popup every few seconds. $9.99 a week is insane.",
    ],
    vi: [
      "Cái gì cũng bắt trả phí, bản miễn phí gần như không dùng được.",
      "Vừa mở app đã đòi đăng ký gói tuần, quá đắt.",
    ],
  },
  locked: {
    en: [
      "Basic features are locked behind premium. You can't even save your {noun} for free.",
      "Export is a premium feature?? That's the whole point of the app.",
    ],
    vi: ["Tính năng cơ bản cũng khóa, muốn lưu {nounVi} phải mua bản Pro."],
  },
  billing: {
    en: [
      "Charged me after the free trial even though I cancelled. I want a refund.",
      "There is no way to cancel the subscription inside the app. They took my money twice.",
      "Started a 'free' trial and got charged the yearly price immediately.",
    ],
    vi: ["Đã hủy dùng thử mà vẫn bị trừ tiền.", "Không tìm thấy chỗ hủy gói, bị trừ tiền 2 lần."],
  },
  crash: {
    en: [
      "Crashes every time I try to {action}.",
      "Keeps crashing since the last update on my Samsung.",
      "Freezes and closes by itself. Unusable.",
    ],
    vi: ["App bị văng liên tục sau khi cập nhật.", "Cứ {actionVi} là app tự thoát."],
  },
  slow: {
    en: ["Very slow and drains my battery like crazy.", "Takes forever to load and my phone gets hot."],
    vi: ["App chạy rất chậm, tốn pin kinh khủng.", "Mở app mất cả phút, máy nóng ran."],
  },
  ai_bad: {
    en: [
      "The AI results are useless, nothing like the screenshots in the store.",
      "The AI gets it wrong half the time.",
    ],
    vi: ["Kết quả AI rất tệ, không giống quảng cáo."],
  },
  data_loss: {
    en: ["Lost all my {noun} after the update!", "My files just disappeared. No backup, nothing."],
    vi: ["Mất hết {nounVi} sau khi cập nhật."],
  },
  ux: {
    en: [
      "Confusing interface, too many buttons, I can't find anything.",
      "The UI is cluttered and hard to use. Took me 10 minutes to {action}.",
    ],
    vi: ["Giao diện rối, khó dùng.", "Nút bấm lộn xộn, tìm mãi không thấy chức năng."],
  },
  missing: {
    en: ["Missing basic features that every other app has.", "Nice idea but too limited. Lots of features missing."],
    vi: ["Thiếu nhiều tính năng cơ bản."],
  },
};

/** Câu mẫu đặc trưng của từng lĩnh vực — đây là phần tạo nên "câu chuyện". */
const SPECIAL: Record<string, Partial<Record<string, Templates>>> = {
  pdf: {
    ads: {
      en: [
        "An ad shows up every time I open a PDF, even when I'm offline.",
        "I open a document for work and get a 30 second video ad. Embarrassing in meetings.",
      ],
      vi: ["Mở file PDF nào cũng hiện quảng cáo, kể cả khi không có mạng."],
    },
    missing: {
      en: ["Can't edit text in the PDF, only view it.", "No way to merge or sign PDFs."],
      vi: ["Không sửa được chữ trong file PDF."],
    },
  },
  ai_photo: {
    paywall: {
      en: [
        "Every filter shows PRO. You pay a weekly subscription just to try the AI.",
        "It processes the photo and then asks for money to save it. Waste of time.",
      ],
      vi: ["Chỉnh xong ảnh thì bắt trả phí mới cho lưu."],
    },
    locked: { en: ["Watermark on every photo unless you pay."], vi: ["Ảnh xuất ra dính watermark to đùng."] },
    ai_bad: {
      en: ["Faces come out plastic and distorted.", "The enhanced photo looks nothing like my mom anymore."],
      vi: ["Ảnh sau khi làm nét bị biến dạng mặt."],
    },
  },
  cleaner: {
    ads: {
      en: [
        "After every 'clean' you get two full screen ads.",
        "Ads disguised as system warnings saying my phone has a virus.",
      ],
      vi: ["Dọn xong là quảng cáo, còn giả cảnh báo virus."],
    },
    slow: {
      en: [
        "After cleaning my phone is actually slower. This app itself drains the battery.",
        "Says I have 2GB of junk every single time. Fake numbers.",
      ],
      vi: ["Dọn xong máy còn chậm hơn, app chạy ngầm tốn pin."],
    },
  },
  recovery: {
    slow: {
      en: [
        "Scanned for 2 hours and found nothing.",
        "The scan goes on forever and never finds my deleted photos.",
        "Stuck at 99% scanning for an hour.",
      ],
      vi: ["Quét mãi không ra file nào.", "Quét cả tiếng vẫn không thấy ảnh đã xóa."],
    },
    paywall: {
      en: [
        "It shows my deleted photos and then asks me to pay to restore them.",
        "Found the files, but restoring needs a subscription.",
      ],
      vi: ["Quét ra ảnh rồi bắt trả tiền mới cho khôi phục."],
    },
    data_loss: {
      en: ["Restored files are corrupted and won't open."],
      vi: ["Khôi phục xong file bị lỗi, không mở được."],
    },
  },
  scanner: {
    locked: {
      en: [
        "Exporting to PDF is locked. And the free version adds a watermark to every page.",
        "Can only scan 3 pages for free.",
      ],
      vi: ["Xuất PDF phải trả phí, bản free có watermark."],
    },
    ai_bad: {
      en: ["OCR is terrible, the text comes out as gibberish.", "Edge detection cuts off half the page."],
      vi: ["Nhận dạng chữ tiếng Việt sai be bét."],
    },
  },
  notes_ai: {
    ai_bad: {
      en: ["The transcript is full of mistakes, it can't handle accents.", "The summary misses the main points of the meeting."],
      vi: ["Chuyển giọng nói tiếng Việt sai gần hết."],
    },
    paywall: { en: ["Only 3 minutes of transcription for free. Seriously?"], vi: ["Miễn phí có 3 phút chuyển giọng nói, quá ít."] },
    data_loss: {
      en: ["Lost a 1 hour recording when the app crashed. Never again."],
      vi: ["Đang ghi âm cuộc họp thì app văng, mất sạch."],
    },
  },
  music: {
    ads: { en: ["Ads between every song. It's like a radio.", "Music stops so an ad can play."], vi: ["Cứ hết bài là quảng cáo."] },
    crash: {
      en: ["Music stops when I lock the screen.", "Player stops in the background after a few minutes."],
      vi: ["Tắt màn hình là nhạc tắt."],
    },
    missing: { en: ["No equalizer, no playlists, no lyrics."], vi: ["Không có chỉnh âm, không tạo được playlist."] },
  },
  launcher: {
    ads: {
      en: [
        "Ads on my LOCK SCREEN. Who thought that was okay?",
        "Random ads appear on the home screen even when I'm not using the app.",
      ],
      vi: ["Hiện quảng cáo ngay trên màn hình khóa, quá khó chịu."],
    },
    slow: { en: ["Laggy when swiping between pages and the battery drains fast."], vi: ["Vuốt màn hình bị giật, hao pin."] },
    data_loss: { en: ["Lost my whole home screen layout after the update."], vi: ["Cập nhật xong mất hết bố cục màn hình chính."] },
  },
};

/** Câu nói thể hiện mong muốn, gắn với id trong DATA.wishes. */
const WISH_TEXT: Record<string, Templates> = {
  one_time: { en: ["I would happily pay once, but not a weekly subscription."], vi: ["Cho mua một lần thì mình mua ngay, chứ thuê bao tuần thì không."] },
  offline: { en: ["Please make it work offline."], vi: ["Mong app dùng được khi không có mạng."] },
  no_watermark: { en: ["Just remove the watermark from exports."], vi: ["Mong xuất file không dính watermark."] },
  fewer_ads: { en: ["I'd keep it if there were fewer ads."], vi: ["Giảm quảng cáo đi thì mình dùng tiếp."] },
  vietnamese: { en: ["Please support Vietnamese properly."], vi: ["Mong hỗ trợ tiếng Việt tốt hơn."] },
  batch: { en: ["Let me process many files at once."], vi: ["Mong có chức năng xử lý nhiều file một lúc."] },
  clear_trial: { en: ["Make the trial and cancellation clear."], vi: ["Mong dùng thử rõ ràng, hủy gói dễ dàng."] },
  preview: { en: ["Show me the result before asking me to pay."], vi: ["Cho xem trước kết quả rồi hãy bắt trả tiền."] },
  faster: { en: ["It should be lighter and faster."], vi: ["Mong app nhẹ và nhanh hơn."] },
  simple_ui: { en: ["A simpler interface would help a lot."], vi: ["Mong giao diện đơn giản hơn."] },
  backup: { en: ["Please add automatic backup."], vi: ["Mong có sao lưu tự động."] },
  better_ai: { en: ["The AI needs to be much more accurate."], vi: ["Mong AI chính xác hơn."] },
  edit_file: { en: ["I just need to edit the file, not only view it."], vi: ["Mong sửa được nội dung file."] },
  no_lock_ads: { en: ["Keep ads off my lock screen."], vi: ["Đừng chèn quảng cáo vào màn hình khóa."] },
  background_play: { en: ["Music should keep playing with the screen off."], vi: ["Mong phát nhạc nền ổn định khi tắt màn hình."] },
};

/** Pain point nào thường đi kèm mong muốn nào. */
const WISH_BY_PAIN: Record<string, string[]> = {
  ads: ["fewer_ads"],
  paywall: ["one_time", "preview"],
  locked: ["no_watermark", "one_time"],
  billing: ["clear_trial", "one_time"],
  crash: ["faster"],
  slow: ["faster"],
  ai_bad: ["better_ai"],
  data_loss: ["backup"],
  ux: ["simple_ui"],
  missing: [],
};

/** Mong muốn đặc trưng của từng lĩnh vực. */
const WISH_BY_DOMAIN: Record<string, string[]> = {
  pdf: ["edit_file", "offline"],
  ai_photo: ["batch", "no_watermark", "preview"],
  cleaner: ["simple_ui"],
  recovery: ["preview"],
  scanner: ["batch", "vietnamese", "no_watermark"],
  notes_ai: ["vietnamese", "offline"],
  music: ["background_play", "offline"],
  launcher: ["no_lock_ads"],
};

const OPENERS: Templates = {
  en: ["Used to be a good app.", "Very disappointed.", "Worst app ever.", "I really wanted to like this app."],
  vi: ["Thất vọng.", "Trước dùng ổn, giờ tệ hẳn."],
};
const CLOSERS: Templates = {
  en: ["Uninstalled.", "Please fix this.", "1 star until fixed.", "Don't waste your time."],
  vi: ["Gỡ luôn.", "Mong nhà phát triển sửa sớm.", "Không nên tải."],
};

// ---------------------------------------------------------------------------
// 4. Hàm ghép câu
// ---------------------------------------------------------------------------

/** Thay {action}, {noun}, {actionVi}, {nounVi} bằng từ vựng của lĩnh vực. */
function fillTemplate(template: string, domainId: string): string {
  const vocab = VOCAB[domainId];
  return template
    .replaceAll("{action}", vocab.action)
    .replaceAll("{noun}", vocab.noun)
    .replaceAll("{actionVi}", vocab.actionVi)
    .replaceAll("{nounVi}", vocab.nounVi);
}

/** Lấy 1 câu cho pain point. 70% dùng câu đặc trưng của lĩnh vực (nếu có). */
function sentenceForPain(random: RandomFn, domainId: string, painId: string, lang: ReviewLang): string {
  const special = SPECIAL[domainId]?.[painId];
  const useSpecial = special && special[lang].length > 0 && random() < 0.7;
  const pool = useSpecial ? special[lang] : GENERIC[painId][lang];
  return fillTemplate(pickOne(random, pool), domainId);
}

/** Chọn mong muốn: ưu tiên mong muốn gắn với pain chính, đôi khi lấy mong muốn của lĩnh vực. */
function pickWish(random: RandomFn, domainId: string, mainPainId: string): string | null {
  if (random() > 0.55) return null; // khoảng 45% review không nói mong muốn gì
  const fromPain = WISH_BY_PAIN[mainPainId];
  const fromDomain = WISH_BY_DOMAIN[domainId];
  if (fromPain.length > 0 && random() < 0.6) return pickOne(random, fromPain);
  return pickOne(random, fromDomain);
}

/**
 * Hồ sơ pain point riêng của 1 app = hồ sơ của lĩnh vực + 1 "điểm yếu riêng" được nhân 2,5 lần.
 * Nhờ vậy các app cùng lĩnh vực không giống hệt nhau, và trang chi tiết app
 * có chỗ "nặng hơn trung bình lĩnh vực" để hiển thị.
 */
function createAppProfile(random: RandomFn, domainProfile: Record<string, number>): Record<string, number> {
  const painIds = Object.keys(domainProfile);
  const signaturePain = pickOne(random, painIds);
  return { ...domainProfile, [signaturePain]: domainProfile[signaturePain] * 2.5 };
}

/** Ngày "YYYY-MM-DD" cách ngày cập nhật `daysAgo` ngày. */
function dateDaysAgo(updatedAt: string, daysAgo: number): string {
  const base = new Date(`${updatedAt}T00:00:00Z`).getTime();
  return new Date(base - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// 5. Hàm chính
// ---------------------------------------------------------------------------
interface GenerateOptions {
  apps: App[];
  updatedAt: string;
  totalReviews: number;
  seed: number;
}

export function generateMockReviews({ apps, updatedAt, totalReviews, seed }: GenerateOptions): Review[] {
  const random = createRandom(seed);

  // App càng nhiều lượt tải thì càng nhiều review. Dùng log10 để app 50 triệu
  // không "nuốt" hết review của app 500 nghìn. (100K -> 1, 1M -> 2, 10M -> 3, 100M -> 4)
  const weights = apps.map((app) => Math.log10(app.minInstalls) - 4);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const reviews: Review[] = [];

  apps.forEach((app, appIndex) => {
    const count = Math.round((totalReviews * weights[appIndex]) / totalWeight);
    const profile = createAppProfile(random, PAIN_PROFILE[app.domainId]);

    for (let i = 0; i < count; i++) {
      const lang: ReviewLang = random() < 0.15 ? "vi" : "en";

      // Pain chính + 35% có thêm pain phụ
      const mainPain = pickWeighted(random, profile);
      const painPoints = [mainPain];
      if (random() < 0.35) {
        const secondPain = pickWeighted(random, profile);
        if (secondPain !== mainPain) painPoints.push(secondPain);
      }

      const wishId = pickWish(random, app.domainId, mainPain);

      // Ghép nội dung: [câu mở đầu?] + câu pain chính + [câu pain phụ?] + [câu mong muốn?] + [câu kết?]
      const sentences: string[] = [];
      if (random() < 0.25) sentences.push(pickOne(random, OPENERS[lang]));
      painPoints.forEach((painId) => sentences.push(sentenceForPain(random, app.domainId, painId, lang)));
      if (wishId) sentences.push(pickOne(random, WISH_TEXT[wishId][lang]));
      if (random() < 0.3) sentences.push(pickOne(random, CLOSERS[lang]));

      // Ngày review trong 12 tháng gần nhất.
      // Câu chuyện xu hướng: phàn nàn "ép trả phí" ở app ảnh AI tăng dần về gần đây
      // (lấy min của 2 số ngẫu nhiên => thiên về số nhỏ => ngày gần hơn).
      const isRisingTrend = app.domainId === "ai_photo" && painPoints.includes("paywall");
      const position = isRisingTrend ? Math.min(random(), random()) : random();
      const daysAgo = Math.floor(position * 364);

      reviews.push({
        id: `r${reviews.length + 1}`,
        appId: app.id,
        score: random() < 0.65 ? 1 : 2,
        date: dateDaysAgo(updatedAt, daysAgo),
        lang,
        content: sentences.join(" "),
        painPoints,
        wishId,
        thumbsUp: Math.floor(random() ** 3 * 300), // đa số ít like, một số ít rất nhiều like
      });
    }
  });

  return reviews;
}
