import type { ReactNode } from "react";

/**
 * MetricBar — một thanh ngang ghi số thật (vd "27,6%"), rê chuột hoặc Tab vào thì hiện hộp số cụ thể.
 * Dùng cho 3 cột thanh của bảng xếp hạng lĩnh vực (①).
 * Chỉ dùng CSS (group-hover) nên không cần state — giống components/ui/InfoTip.tsx.
 */

interface MetricBarProps {
  /** Độ dài thanh, 0..1 (1 = lĩnh vực có giá trị lớn nhất trong bảng). */
  fill: number;
  /** Chữ ghi trên thanh, vd "62,5 triệu" hoặc "27,6%". */
  label: string;
  /** Nội dung hộp hiện ra khi rê chuột. */
  details: ReactNode;
}

/**
 * Thanh dài từ mức này trở lên thì số nằm TRONG thanh (chữ trắng trên xanh đậm, 5,2:1).
 * Thanh ngắn hơn không đủ chỗ cho chữ -> số nằm NGAY SAU đầu thanh (chữ đậm trên rãnh xám nhạt).
 * Nhờ vậy chữ không bao giờ nằm vắt ngang ranh giới xanh/xám (nửa chữ khó đọc).
 */
const LABEL_INSIDE_MIN_FILL = 0.45;

export default function MetricBar({ fill, label, details }: MetricBarProps) {
  // Giữ thanh tối thiểu 2% để giá trị rất nhỏ vẫn nhìn thấy được
  const widthPercent = Math.max(fill * 100, 2);
  const isLabelInside = fill >= LABEL_INSIDE_MIN_FILL;

  return (
    <div tabIndex={0} className="group/metric relative outline-none">
      <div className="relative h-6 overflow-hidden rounded bg-line">
        <div className="absolute inset-y-0 left-0 rounded bg-accent" style={{ width: `${widthPercent}%` }} />
        <span
          className={`tabular absolute inset-y-0 flex items-center text-xs font-semibold whitespace-nowrap ${
            isLabelInside ? "left-2 text-white" : "text-ink"
          }`}
          style={isLabelInside ? undefined : { left: `calc(${widthPercent}% + 6px)` }}
        >
          {label}
        </span>
      </div>

      <div
        role="tooltip"
        className="pointer-events-none absolute left-0 top-8 z-30 hidden w-72 rounded-lg border border-line bg-white p-3 text-xs leading-relaxed text-ink-2 shadow-lg group-hover/metric:block group-focus/metric:block"
      >
        {details}
      </div>
    </div>
  );
}
