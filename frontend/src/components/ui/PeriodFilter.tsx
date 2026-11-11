import type { Filters, MonthsRange } from "@/lib/analytics";

interface PeriodFilterProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const MONTH_OPTIONS: MonthsRange[] = [3, 6, 12];

/**
 * Bộ lọc "Thời gian" + "Ngôn ngữ review". Dùng chung cho trang Overview và trang chi tiết app,
 * nên tách thành component riêng thay vì viết lặp lại ở 2 nơi.
 */
export default function PeriodFilter({ filters, onChange }: PeriodFilterProps) {
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <>
      <div className="flex items-center gap-2 text-sm text-ink-2">
        Thời gian
        <div className="flex overflow-hidden rounded-md border border-line bg-white" role="group" aria-label="Khoảng thời gian">
          {MONTH_OPTIONS.map((months) => {
            const isActive = filters.months === months;
            return (
              <button
                key={months}
                type="button"
                onClick={() => update({ months })}
                aria-pressed={isActive}
                className={`px-3 py-1.5 text-sm ${isActive ? "bg-ink text-white" : "text-ink-2 hover:bg-page"}`}
              >
                {months} tháng
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-2">
        Ngôn ngữ review
        <select
          value={filters.lang}
          onChange={(event) => update({ lang: event.target.value as Filters["lang"] })}
          className="rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink"
        >
          <option value="all">Tất cả</option>
          <option value="en">Tiếng Anh</option>
          <option value="vi">Tiếng Việt</option>
        </select>
      </label>
    </>
  );
}
