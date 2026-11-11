import type { Lookups } from "@/lib/analytics";
import { formatNumber, formatPercent } from "@/lib/format";
import type { Review } from "@/lib/types";
import ReviewCard from "./ReviewCard";
import SidePanel from "./SidePanel";

interface CellReviewsPanelProps {
  domainId: string;
  painId: string;
  reviews: Review[]; // review đã qua bộ lọc chung
  lookups: Lookups;
  onClose: () => void;
}

const MAX_REVIEWS = 10;

/** Panel mở khi bấm 1 ô heatmap: 10 review gốc khớp lĩnh vực + pain point. */
export default function CellReviewsPanel({ domainId, painId, reviews, lookups, onClose }: CellReviewsPanelProps) {
  const domainReviews = reviews.filter((r) => lookups.appById.get(r.appId)?.domainId === domainId);
  const matching = domainReviews.filter((r) => r.painPoints.includes(painId));
  // Ưu tiên review được nhiều người bấm "hữu ích" nhất
  const shown = [...matching].sort((a, b) => b.thumbsUp - a.thumbsUp).slice(0, MAX_REVIEWS);

  const domainName = lookups.domainById.get(domainId)?.name ?? domainId;
  const painName = lookups.painById.get(painId)?.name ?? painId;

  return (
    <SidePanel
      title={`${domainName} × ${painName}`}
      subtitle={
        <>
          {formatNumber(matching.length)} / {formatNumber(domainReviews.length)} review 1–2★ (
          {formatPercent(matching.length / Math.max(domainReviews.length, 1))}) · đang hiện {formatNumber(shown.length)} review
          nhiều lượt “hữu ích” nhất
        </>
      }
      onClose={onClose}
    >
      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Không có review nào khớp.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((review) => (
            <ReviewCard key={review.id} review={review} lookups={lookups} highlightPainId={painId} />
          ))}
        </div>
      )}
    </SidePanel>
  );
}
