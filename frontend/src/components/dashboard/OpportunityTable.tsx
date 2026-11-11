"use client";

/**
 * ① Bảng xếp hạng lĩnh vực.
 *
 * Mỗi dòng là một lĩnh vực với 3 thanh ghi số thật:
 *   Lượt tải (người cần) · % đánh giá 1–2★ (đang chê) · % chê quảng cáo/giá (dễ sửa)
 * Mặc định xếp theo % 1–2★ (xem rankDomains trong lib/analytics.ts).
 * Bấm tiêu đề cột để sắp xếp lại, bấm một dòng để lọc cả trang.
 */
import { useState } from "react";
import type { Lookups, RankedDomain } from "@/lib/analytics";
import { formatCompact, formatInstalls, formatNumber, formatPercent } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";
import MetricBar from "./MetricBar";

interface OpportunityTableProps {
  domains: RankedDomain[];
  lookups: Lookups;
  selectedDomainId: string | null;
  onSelectDomain: (domainId: string) => void;
}

type SortKey = "rank" | "name" | "appCount" | "totalInstalls" | "lowStarRatio" | "easyFixShare" | "topPain" | "topWish";
type SortDirection = "asc" | "desc";

/** Cột chữ và cột hạng mặc định xếp tăng dần (A→Z, hạng 1 trước); cột số mặc định lớn → nhỏ. */
const ASCENDING_BY_DEFAULT: SortKey[] = ["rank", "name", "topPain", "topWish"];

export default function OpportunityTable({ domains, lookups, selectedDomainId, onSelectDomain }: OpportunityTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [direction, setDirection] = useState<SortDirection>("asc");

  // Giá trị lớn nhất của từng cột -> thanh của lĩnh vực đó dài kín ô, các lĩnh vực khác tỉ lệ theo
  const maxInstalls = Math.max(1, ...domains.map((d) => d.totalInstalls));
  const maxLowStar = Math.max(0.0001, ...domains.map((d) => d.lowStarRatio));
  const maxEasyFix = Math.max(0.0001, ...domains.map((d) => d.easyFixShare));

  // Lấy giá trị dùng để so sánh cho từng cột
  const sortValue = (row: RankedDomain): string | number => {
    switch (sortKey) {
      case "name":
        return row.domain.name;
      case "topPain":
        return row.topPainId ? (lookups.painById.get(row.topPainId)?.name ?? "") : "";
      case "topWish":
        return row.topWishId ? (lookups.wishById.get(row.topWishId)?.name ?? "") : "";
      default:
        return row[sortKey];
    }
  };

  const sorted = [...domains].sort((a, b) => {
    const va = sortValue(a);
    const vb = sortValue(b);
    const result = typeof va === "string" ? va.localeCompare(vb as string, "vi") : va - (vb as number);
    return direction === "asc" ? result : -result;
  });

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setDirection(ASCENDING_BY_DEFAULT.includes(key) ? "asc" : "desc");
    }
  };

  const headerProps = { sortKey, direction, onSort: handleSort };

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs font-semibold text-ink-2">
          <SortHeader label="#" column="rank" {...headerProps} />
          <SortHeader label="Lĩnh vực" column="name" {...headerProps} />
          <SortHeader label="Số app" column="appCount" align="right" {...headerProps} />
          <SortHeader
            label="Lượt tải (người cần)"
            column="totalInstalls"
            {...headerProps}
            help="Cộng mốc lượt tải tối thiểu (vd 10.000.000+) của mọi app trong lĩnh vực. Nhiều lượt tải = nhiều người đang cần loại app này."
          />
          <SortHeader
            label="% 1–2★ (đang chê)"
            column="lowStarRatio"
            {...headerProps}
            help="Số lượt chấm 1★ + 2★ chia cho tổng lượt chấm sao của mọi app trong lĩnh vực. Bảng mặc định xếp theo cột này: bị chê nhiều nhất đứng đầu."
          />
          <SortHeader
            label="% chê quảng cáo/giá (dễ sửa)"
            column="easyFixShare"
            {...headerProps}
            help="Trong các lời chê (review 1–2★), bao nhiêu % là về quảng cáo, giá, gói trả phí… Loại lời chê này dễ sửa vì nằm ở cách kiếm tiền của app, không cần công nghệ khó."
          />
          <SortHeader
            label="Pain point lớn nhất"
            column="topPain"
            {...headerProps}
            help="Nhãn xuất hiện trong nhiều review 1–2★ nhất của lĩnh vực (theo bộ lọc thời gian & ngôn ngữ)."
            alignTip="right"
          />
          <SortHeader label="Mong muốn top 1" column="topWish" {...headerProps} alignTip="right" />
        </tr>
      </thead>
      <tbody className="font-medium">
        {sorted.map((row) => {
          const isSelected = row.domain.id === selectedDomainId;
          const isTop = row.rank === 1;
          const topPainName = row.topPainId ? (lookups.painById.get(row.topPainId)?.name ?? null) : null;
          const topWishName = row.topWishId ? (lookups.wishById.get(row.topWishId)?.name ?? null) : null;
          // % review 1–2★ của lĩnh vực có nhắc tới pain point lớn nhất
          const topPainShare = row.topPainId ? (row.painCounts[row.topPainId] ?? 0) / Math.max(row.reviewCount, 1) : 0;
          return (
            <tr
              key={row.domain.id}
              onClick={() => onSelectDomain(row.domain.id)}
              className={`cursor-pointer border-b border-line last:border-0 ${
                isSelected ? "bg-accent-soft" : "hover:bg-page"
              }`}
            >
              <td className="w-10 py-2.5 pr-2">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isTop ? "bg-accent text-white" : "bg-page text-ink-2"
                  }`}
                >
                  {row.rank}
                </span>
              </td>
              {/* Các ô chữ tối đa 2 dòng (line-clamp-2) để tên/nhãn dài từ dữ liệu thật không làm dòng cao vọt;
                  title = rê chuột vào thì trình duyệt hiện đủ chữ. */}
              <td className="max-w-56 py-2.5 pr-4">
                <button
                  type="button"
                  title={row.domain.name}
                  className="line-clamp-2 text-left font-medium text-ink hover:text-accent"
                >
                  {row.domain.name}
                </button>
              </td>
              <td className="tabular py-2.5 pr-4 text-right">{formatNumber(row.appCount)}</td>
              <td className="w-44 py-2.5 pr-4">
                <MetricBar
                  fill={row.totalInstalls / maxInstalls}
                  label={formatCompact(row.totalInstalls)}
                  details={<InstallsDetails row={row} />}
                />
              </td>
              <td className="w-44 py-2.5 pr-4">
                <MetricBar
                  fill={row.lowStarRatio / maxLowStar}
                  label={formatPercent(row.lowStarRatio)}
                  details={<LowStarDetails row={row} />}
                />
              </td>
              <td className="w-44 py-2.5 pr-4">
                <MetricBar
                  fill={row.easyFixShare / maxEasyFix}
                  label={formatPercent(row.easyFixShare, 0)}
                  details={<EasyFixDetails row={row} />}
                />
              </td>
              <td className="max-w-64 py-2.5 pr-4 text-ink-2">
                {topPainName ? (
                  <p className="line-clamp-2" title={topPainName}>
                    {topPainName}{" "}
                    <span className="tabular text-muted">
                      ({formatPercent(topPainShare, 0)})
                    </span>
                  </p>
                ) : (
                  "—"
                )}
              </td>
              <td className="max-w-64 py-2.5 text-ink-2">
                <p className="line-clamp-2" title={topWishName ?? undefined}>
                  {topWishName ?? "—"}
                </p>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Nội dung hộp "số cụ thể" khi rê chuột vào từng thanh
// ---------------------------------------------------------------------------

function InstallsDetails({ row }: { row: RankedDomain }) {
  return (
    <>
      <p className="font-medium text-ink">{row.domain.name}</p>
      <p className="tabular">
        Tổng lượt tải của {formatNumber(row.appCount)} app: <b className="text-ink">{formatInstalls(row.totalInstalls)}</b>
      </p>
      <p className="mt-1 text-muted">Google Play chỉ công bố mốc tối thiểu (vd 10.000.000+), nên đây là con số tối thiểu.</p>
    </>
  );
}

function LowStarDetails({ row }: { row: RankedDomain }) {
  const lowStarRatings = row.oneStarRatings + row.twoStarRatings;
  return (
    <>
      <p className="font-medium text-ink">{row.domain.name}</p>
      <p className="tabular">
        <b className="text-ink">{formatNumber(lowStarRatings)}</b> lượt chấm 1–2★ / {formatNumber(row.totalRatings)} lượt chấm
      </p>
      <p className="tabular text-muted">
        (1★: {formatNumber(row.oneStarRatings)} · 2★: {formatNumber(row.twoStarRatings)})
      </p>
    </>
  );
}

function EasyFixDetails({ row }: { row: RankedDomain }) {
  return (
    <>
      <p className="font-medium text-ink">{row.domain.name}</p>
      <p className="tabular">
        <b className="text-ink">{formatNumber(row.businessLabelCount)}</b> / {formatNumber(row.totalLabelCount)} lời chê là về
        quảng cáo, giá hoặc gói trả phí
      </p>
      <p className="mt-1 text-muted">Đếm theo nhãn pain point: một review có thể chê nhiều thứ cùng lúc.</p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tiêu đề cột bấm để sắp xếp
// ---------------------------------------------------------------------------

interface SortHeaderProps {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
  help?: string;
  alignTip?: "left" | "right";
}

function SortHeader({ label, column, sortKey, direction, onSort, align = "left", help, alignTip }: SortHeaderProps) {
  const active = sortKey === column;
  const arrow = active ? (direction === "asc" ? "▲" : "▼") : "↕";
  return (
    <th className={`py-2 pr-4 font-semibold ${align === "right" ? "text-right" : "text-left"}`}>
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {help && <InfoTip align={alignTip}>{help}</InfoTip>}
        <button
          type="button"
          onClick={() => onSort(column)}
          className={`inline-flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}
        >
          {label}
          <span className={`text-xs ${active ? "text-accent" : "text-muted"}`}>{arrow}</span>
        </button>
      </span>
    </th>
  );
}
