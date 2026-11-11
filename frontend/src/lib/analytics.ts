/**
 * analytics.ts — Toàn bộ phép tính của dashboard, KHÔNG dính tới giao diện.
 *
 * Mọi hàm ở đây là "hàm thuần" (pure function): nhận dữ liệu vào -> trả kết quả ra,
 * không sửa dữ liệu gốc, không gọi API. Nhờ vậy dễ đọc, dễ test, dễ chuyển
 * sang Python/Django sau này nếu muốn tính ở backend.
 */
import type { App, DashboardData, Domain, PainPoint, Review, ReviewLang, Wish } from "./types";

// ===========================================================================
// Kiểu dữ liệu cho bộ lọc
// ===========================================================================

export type MonthsRange = 3 | 6 | 12;

export interface Filters {
  companyId: string; // "all" hoặc id công ty
  months: MonthsRange;
  lang: "all" | ReviewLang;
}

export const DEFAULT_FILTERS: Filters = { companyId: "all", months: 12, lang: "all" };

// ===========================================================================
// Tra cứu nhanh theo id (thay vì .find() lặp đi lặp lại)
// ===========================================================================

export interface Lookups {
  domainById: Map<string, Domain>;
  painById: Map<string, PainPoint>;
  wishById: Map<string, Wish>;
  companyNameById: Map<string, string>;
  appById: Map<string, App>;
}

export function createLookups(data: DashboardData): Lookups {
  return {
    domainById: new Map(data.domains.map((d) => [d.id, d])),
    painById: new Map(data.painPoints.map((p) => [p.id, p])),
    wishById: new Map(data.wishes.map((w) => [w.id, w])),
    companyNameById: new Map(data.companies.map((c) => [c.id, c.name])),
    appById: new Map(data.apps.map((a) => [a.id, a])),
  };
}

// ===========================================================================
// Lọc dữ liệu theo bộ lọc chung ở header
// ===========================================================================

export function filterApps(apps: App[], companyId: string): App[] {
  if (companyId === "all") return apps;
  return apps.filter((app) => app.companyId === companyId);
}

/** Ngày bắt đầu của khoảng thời gian. Vd updatedAt 2026-11-10, 3 tháng -> "2026-08-10". */
export function getStartDate(updatedAt: string, months: number): string {
  const date = new Date(`${updatedAt}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}

/**
 * Lọc review theo: app còn lại sau lọc công ty + khoảng thời gian + ngôn ngữ.
 * (So sánh chuỗi "YYYY-MM-DD" trực tiếp được vì định dạng này sắp theo thứ tự thời gian.)
 */
export function filterReviews(reviews: Review[], apps: App[], filters: Filters, updatedAt: string): Review[] {
  const appIds = new Set(apps.map((app) => app.id));
  const startDate = getStartDate(updatedAt, filters.months);
  return reviews.filter(
    (review) =>
      appIds.has(review.appId) &&
      review.date > startDate &&
      (filters.lang === "all" || review.lang === filters.lang),
  );
}

// ===========================================================================
// Đếm pain point và mong muốn
// ===========================================================================

/** Đếm mỗi pain point xuất hiện trong bao nhiêu review. Kết quả: { ads: 120, crash: 30, ... } */
export function countPainPoints(reviews: Review[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const review of reviews) {
    for (const painId of review.painPoints) {
      counts[painId] = (counts[painId] ?? 0) + 1;
    }
  }
  return counts;
}

export interface WishCount {
  wishId: string;
  count: number;
}

/** Đếm mong muốn, sắp xếp giảm dần. */
export function countWishes(reviews: Review[]): WishCount[] {
  const counts = new Map<string, number>();
  for (const review of reviews) {
    if (review.wishId) counts.set(review.wishId, (counts.get(review.wishId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([wishId, count]) => ({ wishId, count }))
    .sort((a, b) => b.count - a.count);
}

export interface WishShares {
  top: WishCount[]; // các mong muốn lớn nhất, giữ nguyên thứ tự giảm dần
  others: WishCount[]; // phần còn lại, gộp thành lát "Khác"
  otherCount: number; // tổng count của `others`
  total: number; // tổng số review có nêu mong muốn (= 100% của donut)
}

/**
 * Chia danh sách mong muốn (đã sắp giảm dần) thành top N + "Khác" để vẽ donut.
 * Donut quá nhiều lát thì mắt không so được, nên chỉ giữ vài lát lớn.
 * Vd 15 mong muốn, topCount 5 -> 5 lát riêng + 1 lát "Khác" gộp 10 mục.
 */
export function splitTopWishes(wishCounts: WishCount[], topCount: number): WishShares {
  const top = wishCounts.slice(0, topCount);
  const others = wishCounts.slice(topCount);
  return {
    top,
    others,
    otherCount: sum(others.map((w) => w.count)),
    total: sum(wishCounts.map((w) => w.count)),
  };
}

/** Trả về key có giá trị lớn nhất, hoặc null nếu rỗng. */
function keyOfMax(counts: Record<string, number>): string | null {
  let bestKey: string | null = null;
  let bestValue = 0;
  for (const [key, value] of Object.entries(counts)) {
    if (value > bestValue) {
      bestKey = key;
      bestValue = value;
    }
  }
  return bestKey;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

// ===========================================================================
// Số liệu theo lĩnh vực
// ===========================================================================

export interface DomainStat {
  domain: Domain;
  appCount: number;
  totalInstalls: number;
  /** Tổng lượt chấm sao (1★ → 5★) của mọi app trong lĩnh vực. */
  totalRatings: number;
  oneStarRatings: number;
  twoStarRatings: number;
  /** Tỉ lệ 1–2★ = (lượt 1★ + lượt 2★) / tổng lượt chấm. App nhiều lượt chấm tự nhiên ảnh hưởng nhiều hơn. */
  lowStarRatio: number;
  reviewCount: number;
  painCounts: Record<string, number>;
  topPainId: string | null;
  topWishId: string | null;
  /** Tổng số nhãn pain point (1 review có thể có nhiều nhãn). */
  totalLabelCount: number;
  /** Số nhãn thuộc nhóm "mô hình kinh doanh" (quảng cáo, giá, gói trả phí…) — loại pain dễ sửa. */
  businessLabelCount: number;
  /** businessLabelCount / totalLabelCount */
  easyFixShare: number;
}

export function computeDomainStats(data: DashboardData, apps: App[], reviews: Review[]): DomainStat[] {
  const domainIdOfApp = new Map(apps.map((app) => [app.id, app.domainId]));
  const businessPainIds = new Set(data.painPoints.filter((p) => p.group === "business").map((p) => p.id));

  const stats: DomainStat[] = [];

  for (const domain of data.domains) {
    const domainApps = apps.filter((app) => app.domainId === domain.id);
    if (domainApps.length === 0) continue; // lĩnh vực không còn app nào sau khi lọc công ty

    const domainReviews = reviews.filter((review) => domainIdOfApp.get(review.appId) === domain.id);
    const painCounts = countPainPoints(domainReviews);

    const totalRatings = sum(domainApps.map((app) => app.ratings));
    const oneStarRatings = sum(domainApps.map((app) => app.oneStarRatings));
    const twoStarRatings = sum(domainApps.map((app) => app.twoStarRatings));

    const totalLabels = sum(Object.values(painCounts));
    const businessLabels = sum(
      Object.entries(painCounts)
        .filter(([painId]) => businessPainIds.has(painId))
        .map(([, count]) => count),
    );

    stats.push({
      domain,
      appCount: domainApps.length,
      totalInstalls: sum(domainApps.map((app) => app.minInstalls)),
      totalRatings,
      oneStarRatings,
      twoStarRatings,
      lowStarRatio: totalRatings > 0 ? (oneStarRatings + twoStarRatings) / totalRatings : 0,
      reviewCount: domainReviews.length,
      painCounts,
      topPainId: keyOfMax(painCounts),
      topWishId: countWishes(domainReviews)[0]?.wishId ?? null,
      totalLabelCount: totalLabels,
      businessLabelCount: businessLabels,
      easyFixShare: totalLabels > 0 ? businessLabels / totalLabels : 0,
    });
  }

  return stats;
}

// ===========================================================================
// Xếp hạng lĩnh vực
// ===========================================================================

export interface RankedDomain extends DomainStat {
  rank: number; // 1 = tỉ lệ 1–2★ cao nhất (bị chê nhiều nhất)
}

/**
 * Xếp hạng lĩnh vực theo tỉ lệ đánh giá 1–2★, cao nhất = hạng 1.
 * Chọn cách xếp đơn giản này (thay cho công thức điểm có trọng số) để ai đọc bảng
 * cũng giải thích được ngay: "lĩnh vực bị chê nhiều nhất đứng đầu".
 * Trả về mảng mới, giữ nguyên thứ tự đầu vào; chỉ gắn thêm trường `rank`.
 */
export function rankDomains(stats: DomainStat[]): RankedDomain[] {
  const rankById = new Map(
    [...stats]
      .sort((a, b) => b.lowStarRatio - a.lowStarRatio)
      .map((stat, index) => [stat.domain.id, index + 1]),
  );
  return stats.map((stat) => ({ ...stat, rank: rankById.get(stat.domain.id) ?? 0 }));
}

/** % review của lĩnh vực có nhắc tới pain point này (dùng cho heatmap). */
export function painShare(stat: DomainStat, painId: string): number {
  if (stat.reviewCount === 0) return 0;
  return (stat.painCounts[painId] ?? 0) / stat.reviewCount;
}

// ===========================================================================
// Theo app (bảng đối thủ + panel chi tiết)
// ===========================================================================

export interface AppSummary {
  app: App;
  reviewCount: number;
  painCounts: Record<string, number>;
  mainPainId: string | null; // điểm yếu chính
  wishCounts: WishCount[];
  topReview: Review | null; // review tiêu biểu: nói về điểm yếu chính và được nhiều like nhất
}

export function summarizeApp(app: App, reviews: Review[]): AppSummary {
  const appReviews = reviews.filter((review) => review.appId === app.id);
  const painCounts = countPainPoints(appReviews);
  const mainPainId = keyOfMax(painCounts);

  const candidates = mainPainId ? appReviews.filter((r) => r.painPoints.includes(mainPainId)) : appReviews;
  const topReview = [...candidates].sort((a, b) => b.thumbsUp - a.thumbsUp)[0] ?? null;

  return {
    app,
    reviewCount: appReviews.length,
    painCounts,
    mainPainId,
    wishCounts: countWishes(appReviews),
    topReview,
  };
}

export interface PainComparisonRow {
  pain: PainPoint;
  appCount: number;
  appShare: number; // % review của app có nhắc pain này (0..1)
  domainShare: number; // % review của CẢ lĩnh vực có nhắc pain này (0..1)
}

/**
 * So sánh từng pain point: app này bị chê nhiều hơn hay ít hơn mức chung của lĩnh vực?
 * Ví dụ: app PDF có 63% review chê quảng cáo, cả lĩnh vực PDF là 55% -> app này nặng hơn 8 điểm.
 * Kết quả sắp theo appShare giảm dần, bỏ các pain mà cả app lẫn lĩnh vực đều = 0.
 */
export function comparePainPoints(
  painPoints: PainPoint[],
  appReviews: Review[],
  domainReviews: Review[],
): PainComparisonRow[] {
  const appCounts = countPainPoints(appReviews);
  const domainCounts = countPainPoints(domainReviews);
  const share = (count: number, total: number) => (total > 0 ? count / total : 0);

  return painPoints
    .map((pain) => ({
      pain,
      appCount: appCounts[pain.id] ?? 0,
      appShare: share(appCounts[pain.id] ?? 0, appReviews.length),
      domainShare: share(domainCounts[pain.id] ?? 0, domainReviews.length),
    }))
    .filter((row) => row.appShare > 0 || row.domainShare > 0)
    .sort((a, b) => b.appShare - a.appShare);
}

export type ReviewSort = "helpful" | "newest";

export interface ReviewQuery {
  painId: string; // "all" hoặc id pain point
  score: "all" | "1" | "2";
  keyword: string;
  sort: ReviewSort;
}

export const DEFAULT_REVIEW_QUERY: ReviewQuery = { painId: "all", score: "all", keyword: "", sort: "helpful" };

/** Lọc + sắp xếp danh sách review theo các ô chọn trong khu vực "Review gốc". */
export function queryReviews(reviews: Review[], query: ReviewQuery): Review[] {
  const keyword = query.keyword.trim().toLowerCase();

  const matched = reviews.filter(
    (review) =>
      (query.painId === "all" || review.painPoints.includes(query.painId)) &&
      (query.score === "all" || review.score === Number(query.score)) &&
      (keyword === "" || review.content.toLowerCase().includes(keyword)),
  );

  // Sắp trên bản sao ([...matched]) để không làm đổi thứ tự mảng gốc
  return [...matched].sort((a, b) =>
    query.sort === "newest" ? b.date.localeCompare(a.date) : b.thumbsUp - a.thumbsUp,
  );
}

export interface MonthPoint {
  month: string; // "2026-11"
  label: string; // "11/2026"
  count: number;
}

/** Số review 1–2★ theo từng tháng, từ tháng bắt đầu bộ lọc tới tháng cập nhật. */
export function monthlyTrend(reviews: Review[], updatedAt: string, months: number): MonthPoint[] {
  const end = new Date(`${updatedAt}T00:00:00Z`);
  const points: MonthPoint[] = [];

  // Tạo sẵn danh sách tháng (kể cả tháng không có review nào => count = 0)
  for (let offset = months; offset >= 0; offset--) {
    const date = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - offset, 1));
    const month = date.toISOString().slice(0, 7);
    const [year, mm] = month.split("-");
    points.push({ month, label: `${mm}/${year}`, count: 0 });
  }

  const indexByMonth = new Map(points.map((point, index) => [point.month, index]));
  for (const review of reviews) {
    const index = indexByMonth.get(review.date.slice(0, 7));
    if (index !== undefined) points[index].count += 1;
  }
  return points;
}
