"use client";

/**
 * ③ Heatmap lĩnh vực × pain point.
 *
 * Vẽ bằng bảng HTML thay vì ECharts vì:
 *  - Cần tiêu đề nhóm cột (3 nhóm pain point) — bảng HTML làm việc này rất dễ bằng colSpan.
 *  - Mỗi ô là một <button> nên bấm được bằng bàn phím, dễ truy cập hơn.
 */
import { useState } from "react";
import { BLUE_RAMP, BLUE_RAMP_WHITE_TEXT_FROM, COLORS } from "@/components/charts/chartTheme";
import { painShare, type RankedDomain } from "@/lib/analytics";
import { formatNumber, formatPercent } from "@/lib/format";
import type { PainGroup, PainPoint } from "@/lib/types";

interface PainHeatmapProps {
  domains: RankedDomain[];
  painGroups: PainGroup[];
  painPoints: PainPoint[];
  selectedDomainId: string | null;
  onSelectDomain: (domainId: string) => void;
  onOpenCell: (domainId: string, painId: string) => void;
}

interface HoverInfo {
  x: number;
  y: number;
  domain: RankedDomain;
  pain: PainPoint;
}

/**
 * Chọn màu trong dải xanh theo giá trị (0..max). Trả về màu nền và màu chữ.
 * Nền đậm -> chữ trắng, nền nhạt -> chữ gần đen, để chữ luôn đạt tương phản ≥ 4,5:1.
 * Ô trống (0%) chỉ hiện dấu "–" màu xám nhạt cho đỡ rối mắt.
 */
function cellColors(share: number, maxShare: number): { background: string; color: string } {
  const level = maxShare > 0 ? Math.round((share / maxShare) * (BLUE_RAMP.length - 1)) : 0;
  if (share === 0) return { background: BLUE_RAMP[0], color: COLORS.neutralMark };
  return { background: BLUE_RAMP[level], color: level >= BLUE_RAMP_WHITE_TEXT_FROM ? COLORS.surface : COLORS.ink };
}

export default function PainHeatmap({
  domains,
  painGroups,
  painPoints,
  selectedDomainId,
  onSelectDomain,
  onOpenCell,
}: PainHeatmapProps) {
  const [hover, setHover] = useState<HoverInfo | null>(null);

  // Sắp cột theo nhóm, sắp dòng theo hạng ở bảng ① (bị chê nhiều nhất lên đầu)
  const groups = painGroups.map((group) => ({ group, pains: painPoints.filter((p) => p.group === group.id) }));
  const columns = groups.flatMap((g) => g.pains);
  const rows = [...domains].sort((a, b) => a.rank - b.rank);

  const maxShare = Math.max(0, ...rows.flatMap((row) => columns.map((pain) => painShare(row, pain.id))));

  return (
    <div className="relative">
      <table className="w-full table-fixed border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th className="w-40" />
            {groups.map(({ group, pains }) => (
              <th
                key={group.id}
                colSpan={pains.length}
                className={`border-b-2 px-1 pb-1 text-left align-bottom text-xs font-semibold ${
                  group.id === "business" ? "border-accent text-accent-strong" : "border-line text-ink-2"
                }`}
              >
                {group.name}
              </th>
            ))}
          </tr>
          <tr>
            <th />
            {columns.map((pain) => (
              <th
                key={pain.id}
                className="h-14 px-0.5 pb-1 align-bottom text-xs font-medium leading-tight text-ink-2 [overflow-wrap:anywhere]"
              >
                {/* Thêm chỗ xuống dòng sau dấu "/" để tên dài như "Ép trả phí/subscription" không tràn */}
                {pain.name.replaceAll("/", "/​")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = row.domain.id === selectedDomainId;
            const dimmed = selectedDomainId !== null && !isSelected;
            return (
              <tr key={row.domain.id} className={dimmed ? "opacity-45" : ""}>
                <th className="pr-2 text-left font-normal">
                  <button
                    type="button"
                    onClick={() => onSelectDomain(row.domain.id)}
                    className={`w-full truncate rounded px-1 py-1 text-left text-xs hover:text-accent ${
                      isSelected ? "bg-accent-soft font-semibold text-accent-strong" : "text-ink"
                    }`}
                    title={`Lọc trang theo ${row.domain.name}`}
                  >
                    {row.domain.name}
                  </button>
                </th>
                {columns.map((pain) => {
                  const share = painShare(row, pain.id);
                  const colors = cellColors(share, maxShare);
                  return (
                    <td key={pain.id} className="p-0">
                      <button
                        type="button"
                        onClick={() => onOpenCell(row.domain.id, pain.id)}
                        onMouseMove={(event) => setHover({ x: event.clientX, y: event.clientY, domain: row, pain })}
                        onMouseLeave={() => setHover(null)}
                        className="tabular h-9 w-full rounded-sm text-xs font-semibold outline-offset-1 hover:outline-2 hover:outline-ink"
                        style={colors}
                        aria-label={`${row.domain.name} – ${pain.name}: ${formatPercent(share, 0)} review`}
                      >
                        {share > 0 ? formatPercent(share, 0) : "–"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Chú giải dải màu */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <span>0%</span>
        <div className="flex h-2 w-40 overflow-hidden rounded-full">
          {BLUE_RAMP.map((color) => (
            <span key={color} className="flex-1" style={{ background: color }} />
          ))}
        </div>
        <span>{formatPercent(maxShare, 0)}</span>
        <span className="ml-2">
          % review 1–2★ của lĩnh vực có nhắc tới pain point. Một review có thể mang nhiều nhãn nên tổng một dòng có thể &gt; 100%.
        </span>
      </div>

      {hover && <HeatmapTooltip hover={hover} />}
    </div>
  );
}

function HeatmapTooltip({ hover }: { hover: HoverInfo }) {
  const count = hover.domain.painCounts[hover.pain.id] ?? 0;
  const share = painShare(hover.domain, hover.pain.id);
  return (
    <div
      className="pointer-events-none fixed z-40 w-64 rounded-lg border border-line bg-white p-3 text-xs text-ink-2 shadow-lg"
      style={{ left: hover.x + 14, top: hover.y + 14 }}
    >
      <p className="font-semibold text-ink">
        {hover.domain.domain.name} × {hover.pain.name}
      </p>
      <p className="mt-1">
        <b className="text-ink">{formatPercent(share)}</b> review nhắc tới
      </p>
      <p className="tabular">
        = {formatNumber(count)} / {formatNumber(hover.domain.reviewCount)} review 1–2★ của lĩnh vực
      </p>
      <p className="mt-2 border-t border-line pt-2 text-muted">Bấm để xem 10 review gốc.</p>
    </div>
  );
}
