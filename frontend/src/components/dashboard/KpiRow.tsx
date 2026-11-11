import type { RankedDomain } from "@/lib/analytics";
import { formatCompact, formatNumber, formatPercent } from "@/lib/format";

interface KpiRowProps {
  appCount: number;
  reviewCount: number;
  months: number;
  domains: RankedDomain[];
}

/** Hàng 4 ô số liệu tổng quan. */
export default function KpiRow({ appCount, reviewCount, months, domains }: KpiRowProps) {
  const best = domains.find((d) => d.rank === 1);

  return (
    <div className="grid grid-cols-4 gap-4">
      <KpiTile label="Số app phân tích" value={formatNumber(appCount)} note="App ≥ 100.000 lượt tải" />
      <KpiTile label="Số review đã đọc" value={formatNumber(reviewCount)} note={`Review 1–2★ trong ${months} tháng gần nhất`} />
      <KpiTile label="Số lĩnh vực" value={formatNumber(domains.length)} note="Phân loại theo chức năng chính của app" />
      <div className="rounded-xl border border-accent/40 bg-accent-soft p-4 shadow-card">
        <p className="text-sm text-accent-strong">Lĩnh vực bị chê nhiều nhất (hạng 1)</p>
        <p className="mt-1 truncate text-2xl font-bold text-ink">{best ? best.domain.name : "—"}</p>
        <p className="mt-1 text-xs text-ink-2">
          {best
            ? `${formatCompact(best.totalInstalls)} lượt tải · ${formatPercent(best.lowStarRatio)} chê · ${formatPercent(best.easyFixShare, 0)} dễ sửa`
            : "Không có dữ liệu"}
        </p>
      </div>
    </div>
  );
}

function KpiTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <p className="text-sm text-ink-2">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  );
}
