import PeriodFilter from "@/components/ui/PeriodFilter";
import type { Filters } from "@/lib/analytics";
import { formatDate } from "@/lib/format";
import type { Company } from "@/lib/types";

interface HeaderBarProps {
  companies: Company[];
  updatedAt: string;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  activeDomainName: string | null;
  onClearDomain: () => void;
}

/** Thanh trên cùng: tên dashboard, ngày cập nhật, bộ lọc chung, và chip "đang lọc lĩnh vực". */
export default function HeaderBar({
  companies,
  updatedAt,
  filters,
  onFiltersChange,
  activeDomainName,
  onClearDomain,
}: HeaderBarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-360 flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <div className="mr-auto">
          <h1 className="text-lg font-semibold text-ink">App Opportunity Finder</h1>
          <p className="text-xs text-muted">
            Cập nhật dữ liệu: {formatDate(updatedAt)} · Review 1–2★ trên Google Play · App ≥ 100.000 lượt tải, không gồm game
          </p>
        </div>

        {activeDomainName && (
          <div className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft py-1 pl-3 pr-1 text-sm">
            <span className="text-ink-2">Đang lọc:</span>
            <span className="font-medium text-accent-strong">{activeDomainName}</span>
            <button
              type="button"
              onClick={onClearDomain}
              className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-ink-2 hover:text-ink"
            >
              ✕ Bỏ lọc
            </button>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-ink-2">
          Công ty
          <select
            value={filters.companyId}
            onChange={(event) => onFiltersChange({ ...filters, companyId: event.target.value })}
            className="rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink"
          >
            <option value="all">Tất cả công ty</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>

        <PeriodFilter filters={filters} onChange={onFiltersChange} />
      </div>
    </header>
  );
}
