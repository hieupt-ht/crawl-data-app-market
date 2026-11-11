import ReviewCard from "@/components/panels/ReviewCard";
import { queryReviews, type Lookups, type ReviewQuery } from "@/lib/analytics";
import { formatNumber } from "@/lib/format";
import type { PainPoint, Review } from "@/lib/types";

interface ReviewExplorerProps {
  reviews: Review[]; // toàn bộ review 1–2★ của app (đã qua bộ lọc thời gian & ngôn ngữ)
  painOptions: PainPoint[]; // các pain point có xuất hiện trong review của app
  lookups: Lookups;
  query: ReviewQuery;
  onQueryChange: (query: ReviewQuery) => void;
  page: number; // bắt đầu từ 1
  onPageChange: (page: number) => void;
}

const PAGE_SIZE = 10;

/**
 * ④ Khu vực đọc review gốc: lọc theo pain point / số sao, tìm từ khóa, sắp xếp, phân trang.
 * Component này KHÔNG tự giữ state — cha (AppDetail) giữ, để khi bấm một dòng ở
 * "So sánh pain point" thì cha đổi được bộ lọc ở đây.
 */
export default function ReviewExplorer({
  reviews,
  painOptions,
  lookups,
  query,
  onQueryChange,
  page,
  onPageChange,
}: ReviewExplorerProps) {
  const matched = queryReviews(reviews, query);
  const pageCount = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount); // phòng khi lọc làm số trang giảm
  const shown = matched.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const update = (patch: Partial<ReviewQuery>) => onQueryChange({ ...query, ...patch });
  const selectClass = "rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink";

  return (
    <div>
      {/* Hàng điều khiển */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={query.painId} onChange={(e) => update({ painId: e.target.value })} className={selectClass} aria-label="Lọc theo pain point">
          <option value="all">Mọi pain point</option>
          {painOptions.map((pain) => (
            <option key={pain.id} value={pain.id}>
              {pain.name}
            </option>
          ))}
        </select>

        <select value={query.score} onChange={(e) => update({ score: e.target.value as ReviewQuery["score"] })} className={selectClass} aria-label="Lọc theo số sao">
          <option value="all">1★ và 2★</option>
          <option value="1">Chỉ 1★</option>
          <option value="2">Chỉ 2★</option>
        </select>

        <input
          type="search"
          value={query.keyword}
          onChange={(e) => update({ keyword: e.target.value })}
          placeholder="Tìm trong nội dung… (vd: ads, watermark)"
          className="min-w-56 flex-1 rounded-md border border-line bg-white px-3 py-1.5 text-sm"
        />

        <select value={query.sort} onChange={(e) => update({ sort: e.target.value as ReviewQuery["sort"] })} className={selectClass} aria-label="Sắp xếp">
          <option value="helpful">Nhiều “hữu ích” nhất</option>
          <option value="newest">Mới nhất</option>
        </select>
      </div>

      <p className="mb-3 text-sm text-ink-2">
        {matched.length === 0
          ? "Không có review nào khớp."
          : `Hiện ${formatNumber((currentPage - 1) * PAGE_SIZE + 1)}–${formatNumber((currentPage - 1) * PAGE_SIZE + shown.length)} trên ${formatNumber(matched.length)} review`}
      </p>

      <div className="space-y-3">
        {shown.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            lookups={lookups}
            showAppName={false}
            highlightPainId={query.painId === "all" ? undefined : query.painId}
          />
        ))}
      </div>

      {pageCount > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-3 text-sm" aria-label="Phân trang">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-md border border-line bg-white px-3 py-1.5 disabled:opacity-40"
          >
            ← Trước
          </button>
          <span className="tabular text-ink-2">
            Trang {currentPage} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === pageCount}
            className="rounded-md border border-line bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Sau →
          </button>
        </nav>
      )}
    </div>
  );
}
