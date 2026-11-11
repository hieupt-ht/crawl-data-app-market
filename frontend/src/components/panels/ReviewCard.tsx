import type { Lookups } from "@/lib/analytics";
import { formatDate, formatNumber } from "@/lib/format";
import type { Review } from "@/lib/types";

interface ReviewCardProps {
  review: Review;
  lookups: Lookups;
  showAppName?: boolean;
  /** Pain point đang xem — nhãn này được tô màu nhấn. */
  highlightPainId?: string;
}

/** Thẻ hiển thị 1 review gốc. */
export default function ReviewCard({ review, lookups, showAppName = true, highlightPainId }: ReviewCardProps) {
  const app = lookups.appById.get(review.appId);
  const wish = review.wishId ? lookups.wishById.get(review.wishId) : null;

  return (
    <article className="rounded-lg border border-line p-3">
      <div className="mb-1.5 flex items-center gap-2 text-xs text-muted">
        <span className="font-semibold text-ink" aria-label={`${review.score} sao`}>
          {"★".repeat(review.score)}
          <span className="text-muted">{"☆".repeat(5 - review.score)}</span>
        </span>
        <span>{formatDate(review.date)}</span>
        <span className="rounded bg-page px-1.5 text-ink-2 uppercase">{review.lang}</span>
        <span className="ml-auto">👍 {formatNumber(review.thumbsUp)}</span>
      </div>
      {showAppName && app && <p className="mb-1 text-xs font-medium text-ink-2">{app.title}</p>}
      {/* wrap-break-word: cho phép ngắt giữa chừng một "từ" quá dài (link, "AAAAA…") để không tràn khỏi thẻ */}
      <p className="text-sm leading-relaxed text-ink wrap-break-word">{review.content}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {review.painPoints.map((painId) => (
          <span
            key={painId}
            className={`rounded px-1.5 py-0.5 text-xs ${
              painId === highlightPainId ? "bg-accent text-white" : "bg-page text-ink-2"
            }`}
          >
            {lookups.painById.get(painId)?.name}
          </span>
        ))}
        {wish && <span className="rounded border border-accent/40 px-1.5 py-0.5 text-xs text-accent-strong">Mong muốn: {wish.name}</span>}
      </div>
    </article>
  );
}
