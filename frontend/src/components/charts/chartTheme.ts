/**
 * chartTheme.ts — Màu sắc và kiểu chữ dùng chung cho mọi biểu đồ.
 * Giữ ở một chỗ để các biểu đồ trông như cùng một bộ.
 * (Giá trị trùng với biến CSS trong globals.css — ECharts vẽ trên canvas nên không đọc được CSS.)
 */
export const COLORS = {
  accent: "#2563eb",
  accentStrong: "#1e40af",
  accentSoftFill: "rgba(37, 99, 235, 0.08)", // nền nhạt dưới đường xu hướng
  opportunityZone: "#dbeafe", // vùng "Cơ hội" trên bản đồ ②
  ink: "#0f172a",
  inkSoft: "#334155", // nhãn tên lĩnh vực trên bản đồ
  ink2: "#475569",
  muted: "#64748b", // nhãn trục, chú thích nhỏ
  line: "#e2e8f0",
  axis: "#cbd5e1",
  neutralMark: "#94a3b8", // chấm/lát "không nổi bật" (ngoài vùng cơ hội, lát "Khác")
  neutralMarkBorder: "#64748b",
  surface: "#ffffff",
};

/** Cỡ chữ tối thiểu trên biểu đồ: nhãn trục/chú thích 13px. */
export const CHART_FONT_SIZE = 13;

/** Dải màu tuần tự xanh dương (nhạt #eff6ff -> đậm #1e3a8a) cho heatmap. */
export const BLUE_RAMP = [
  "#eff6ff",
  "#dbeafe",
  "#bfdbfe",
  "#93c5fd",
  "#60a5fa",
  "#3b82f6",
  "#2563eb",
  "#1d4ed8",
  "#1e40af",
  "#1e3a8a",
];

/** Từ bậc này trở đi nền đủ đậm để dùng chữ trắng (trắng trên #2563eb = 5,2:1). */
export const BLUE_RAMP_WHITE_TEXT_FROM = 6;

/** 5 sắc xanh phân biệt rõ cho donut (lát lớn nhất đậm nhất). */
export const DONUT_COLORS = ["#1e3a8a", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"];

/** Kiểu tooltip chung: nền trắng, viền mảnh, chữ đậm nhạt rõ ràng. */
export const TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  borderColor: COLORS.line,
  borderWidth: 1,
  padding: [8, 12] as [number, number],
  textStyle: { color: COLORS.ink, fontSize: CHART_FONT_SIZE },
  extraCssText: "box-shadow: 0 4px 16px rgba(15,23,42,0.10); border-radius: 8px; max-width: 320px; white-space: normal;",
};

/**
 * Font dự phòng cho biểu đồ. Khi chạy trên trình duyệt, EChart.tsx thay bằng đúng font
 * đang dùng trên trang (Be Vietnam Pro), vì canvas không tự thừa hưởng font từ CSS.
 */
export const FONT_FAMILY = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

/** Dòng ghi chú "cách tính" nhỏ, xám, ở cuối tooltip. */
export function howCalculated(text: string): string {
  return `<div style="margin-top:6px;padding-top:6px;border-top:1px solid ${COLORS.line};color:${COLORS.muted};font-size:12px;line-height:1.45">${text}</div>`;
}
