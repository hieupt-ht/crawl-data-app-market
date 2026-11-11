/**
 * viewState.ts — Lưu "đang xem gì" (bộ lọc, lĩnh vực đang chọn) TRÊN URL.
 *
 * Ví dụ: /?months=6&lang=vi&domain=pdf
 *
 * Vì sao để trên URL thay vì useState?
 *  - Sang trang chi tiết app rồi bấm "← Overview" thì vẫn giữ nguyên lựa chọn.
 *  - Copy link gửi sếp là sếp thấy đúng màn hình bạn đang xem.
 *  - Bấm F5 không bị mất lựa chọn.
 * Giá trị nào bằng mặc định thì không ghi lên URL cho gọn.
 */
import { DEFAULT_FILTERS, type Filters, type MonthsRange } from "./analytics";

export interface ViewState {
  filters: Filters;
  domainId: string | null; // lĩnh vực đang chọn ở Overview
}

/** Kiểu tối thiểu cần để đọc tham số — cả URLSearchParams và kết quả useSearchParams() đều có hàm get(). */
interface ReadableParams {
  get(name: string): string | null;
}

const VALID_MONTHS: MonthsRange[] = [3, 6, 12];

/** Đọc URL -> ViewState. Giá trị sai/thiếu thì dùng mặc định (không bao giờ làm trang lỗi). */
export function parseViewState(params: ReadableParams): ViewState {
  const monthsParam = Number(params.get("months"));
  const months = VALID_MONTHS.includes(monthsParam as MonthsRange) ? (monthsParam as MonthsRange) : DEFAULT_FILTERS.months;

  const langParam = params.get("lang");
  const lang = langParam === "en" || langParam === "vi" ? langParam : DEFAULT_FILTERS.lang;

  return {
    filters: {
      companyId: params.get("company") ?? DEFAULT_FILTERS.companyId,
      months,
      lang,
    },
    domainId: params.get("domain"),
  };
}

/** ViewState -> chuỗi query, vd "?months=6&domain=pdf". Trả "" nếu mọi thứ là mặc định. */
export function buildQuery(view: ViewState): string {
  const params = new URLSearchParams();
  const { filters, domainId } = view;

  if (filters.companyId !== DEFAULT_FILTERS.companyId) params.set("company", filters.companyId);
  if (filters.months !== DEFAULT_FILTERS.months) params.set("months", String(filters.months));
  if (filters.lang !== DEFAULT_FILTERS.lang) params.set("lang", filters.lang);
  if (domainId) params.set("domain", domainId);

  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * Cập nhật một phần trạng thái xem trên thanh địa chỉ, KHÔNG tải lại trang.
 *
 * - Đọc trạng thái MỚI NHẤT ngay từ window.location (không dùng biến `view` của lần render trước).
 *   Lý do: nếu người dùng bấm 2 thứ thật nhanh, React chưa kịp vẽ lại giữa 2 lần bấm,
 *   biến `view` cũ sẽ làm lần bấm sau ghi đè mất lựa chọn của lần bấm trước.
 * - Dùng history.replaceState (API có sẵn của trình duyệt); Next.js tự đồng bộ với useSearchParams().
 * - Dùng "replace" thay vì "push" để đổi bộ lọc liên tục không tạo ra hàng chục mục trong nút Back.
 */
export function updateViewInUrl(patch: Partial<ViewState>): void {
  const current = parseViewState(new URLSearchParams(window.location.search));
  const url = `${window.location.pathname}${buildQuery({ ...current, ...patch })}`;
  window.history.replaceState(null, "", url);
}

/** Link tới trang chi tiết app, mang theo trạng thái đang xem. */
export function appDetailHref(appId: string, view: ViewState): string {
  return `/apps/${encodeURIComponent(appId)}${buildQuery(view)}`;
}

/** Link quay về Overview, mang theo trạng thái đang xem. */
export function overviewHref(view: ViewState): string {
  return `/${buildQuery(view)}`;
}
