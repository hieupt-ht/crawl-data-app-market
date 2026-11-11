import type { PainComparisonRow } from "@/lib/analytics";
import { formatNumber, formatPercent } from "@/lib/format";

interface PainComparisonProps {
  rows: PainComparisonRow[];
  appReviewCount: number;
  domainName: string;
  /** Bấm một dòng -> lọc danh sách review theo pain point đó. */
  onSelectPain: (painId: string) => void;
}

/** Chênh lệch từ 5 điểm % trở lên mới coi là "khác biệt rõ"; nhỏ hơn coi như ngang nhau. */
const NOTABLE_GAP = 0.05;

/**
 * ① So sánh pain point của app với trung bình lĩnh vực.
 * Vẽ bằng HTML: mỗi dòng có 2 thanh — thanh xanh (app này) và thanh xám mảnh (cả lĩnh vực).
 */
export default function PainComparison({ rows, appReviewCount, domainName, onSelectPain }: PainComparisonProps) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">Không có review nào trong khoảng thời gian này.</p>;
  }

  // Thanh dài nhất = giá trị lớn nhất, các thanh khác tỉ lệ theo
  const maxShare = Math.max(...rows.flatMap((row) => [row.appShare, row.domainShare]));

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-accent" /> App này
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-4 rounded-sm bg-muted/60" /> Trung bình lĩnh vực {domainName}
        </span>
      </div>

      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.pain.id}>
            <button
              type="button"
              onClick={() => onSelectPain(row.pain.id)}
              className="grid w-full grid-cols-[150px_1fr_110px] items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-page"
              title={`${formatNumber(row.appCount)} / ${formatNumber(appReviewCount)} review của app có nhắc "${row.pain.name}". Bấm để đọc các review này.`}
            >
              <span className="text-sm text-ink">{row.pain.name}</span>

              <span className="space-y-1">
                <BarWithLabel share={row.appShare} maxShare={maxShare} variant="app" />
                <BarWithLabel share={row.domainShare} maxShare={maxShare} variant="domain" />
              </span>

              <GapLabel gap={row.appShare - row.domainShare} />
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-muted">
        % = số review 1–2★ có nhắc pain point / tổng review 1–2★ (một review có thể nhắc nhiều pain point). Bấm một dòng để đọc
        review tương ứng ở phía dưới.
      </p>
    </div>
  );
}

function BarWithLabel({ share, maxShare, variant }: { share: number; maxShare: number; variant: "app" | "domain" }) {
  const width = maxShare > 0 ? (share / maxShare) * 100 : 0;
  const isApp = variant === "app";
  return (
    <span className="flex items-center gap-2">
      <span className={`block rounded-sm ${isApp ? "h-2.5 bg-accent" : "h-1.5 bg-muted/60"}`} style={{ width: `${width}%` }} />
      <span className={`tabular shrink-0 text-xs ${isApp ? "font-semibold text-ink" : "text-muted"}`}>{formatPercent(share, 0)}</span>
    </span>
  );
}

/** Chữ mô tả chênh lệch so với lĩnh vực, vd "+12 điểm · nặng hơn". */
function GapLabel({ gap }: { gap: number }) {
  const points = Math.round(gap * 100);
  if (gap >= NOTABLE_GAP) {
    // App bị chê NHIỀU hơn đối thủ cùng mảng = điểm yếu riêng của app = cơ hội -> dùng màu nhấn
    return <span className="text-right text-xs font-semibold text-accent-strong">+{points} điểm · nặng hơn</span>;
  }
  if (gap <= -NOTABLE_GAP) {
    return <span className="text-right text-xs text-ink-2">{points} điểm · nhẹ hơn</span>;
  }
  return <span className="text-right text-xs text-muted">≈ ngang mặt bằng</span>;
}
