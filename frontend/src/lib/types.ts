/**
 * types.ts — "Bản mô tả hình dạng" của dữ liệu.
 *
 * TypeScript dùng các interface này để kiểm tra lúc viết code:
 * nếu bạn gõ sai tên trường (vd. `app.instals`), editor sẽ báo đỏ ngay.
 *
 * Khi có dữ liệu thật từ backend Django, API chỉ cần trả JSON đúng hình dạng
 * `DashboardData` dưới đây là toàn bộ giao diện chạy được, không phải sửa gì thêm.
 */

/** 3 nhóm pain point. "business" = mô hình kinh doanh (dễ sửa nhất). */
export type PainGroupId = "business" | "technical" | "experience";

export type ReviewLang = "en" | "vi";

export interface Company {
  id: string;
  name: string;
}

/** Lĩnh vực app, ví dụ "Đọc PDF/tài liệu". */
export interface Domain {
  id: string;
  name: string;
}

export interface PainGroup {
  id: PainGroupId;
  name: string;
}

/** Một nhãn pain point, ví dụ "Quảng cáo quá nhiều". */
export interface PainPoint {
  id: string;
  name: string;
  group: PainGroupId;
}

/** Một mong muốn lặp lại của người dùng, ví dụ "Dùng được offline". */
export interface Wish {
  id: string;
  name: string;
}

/** Một app trên Google Play (tương ứng 1 dòng trong apps.csv). */
export interface App {
  id: string; // appId trên Google Play, vd "com.example.pdfreader"
  title: string;
  companyId: string;
  domainId: string;
  installsLabel: string; // mốc hiển thị, vd "10.000.000+"
  minInstalls: number; // số tối thiểu của mốc, vd 10000000
  score: number; // điểm sao trung bình, vd 4.2
  ratings: number; // tổng số lượt chấm sao
  lowStarRatio: number; // tỉ lệ lượt chấm 1–2★ trên tổng (0..1), tính từ histogram
  oneStarRatings: number; // số lượt chấm 1★ (histogram[0] của google-play-scraper)
  twoStarRatings: number; // số lượt chấm 2★ (histogram[1])
  containsAds: boolean;
  offersIAP: boolean; // có mua trong app (in-app purchase) hay không
  features: string[]; // tính năng chính (sau này do LLM tóm tắt từ mô tả app)
}

/** Một review 1–2★ (tương ứng 1 dòng trong reviews.csv). */
export interface Review {
  id: string;
  appId: string;
  score: 1 | 2;
  date: string; // định dạng "YYYY-MM-DD"
  lang: ReviewLang;
  content: string;
  painPoints: string[]; // danh sách id pain point, 1 review có thể có nhiều nhãn
  wishId: string | null; // mong muốn (nếu người dùng có nói)
  thumbsUp: number; // số người bấm "hữu ích"
}

/** Toàn bộ dữ liệu mà dashboard cần. */
export interface DashboardData {
  meta: {
    updatedAt: string; // ngày cào dữ liệu, "YYYY-MM-DD"
    source: string;
  };
  companies: Company[];
  domains: Domain[];
  painGroups: PainGroup[];
  painPoints: PainPoint[];
  wishes: Wish[];
  apps: App[];
  reviews: Review[];
}
