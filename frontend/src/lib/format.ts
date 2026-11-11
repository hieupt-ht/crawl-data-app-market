/**
 * format.ts — Các hàm định dạng hiển thị theo kiểu Việt Nam.
 * Ví dụ: 1234567 -> "1.234.567", 0.215 -> "21,5%".
 */

const numberFormatter = new Intl.NumberFormat("vi-VN");

/** 1234567 -> "1.234.567" */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Lượt tải: 10000000 -> "10.000.000+" (Google Play chỉ cho biết mốc tối thiểu). */
export function formatInstalls(value: number): string {
  return `${formatNumber(value)}+`;
}

/** Tỉ lệ 0..1 -> phần trăm. 0.215 -> "21,5%" */
export function formatPercent(ratio: number, digits = 1): string {
  const percent = ratio * 100;
  return `${percent.toLocaleString("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

/** Số lớn viết gọn cho trục biểu đồ: 10000000 -> "10 triệu", 500000 -> "500 nghìn". */
export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${formatNumber(value / 1_000_000_000)} tỷ`;
  if (value >= 1_000_000) return `${formatNumber(value / 1_000_000)} triệu`;
  if (value >= 1_000) return `${formatNumber(value / 1_000)} nghìn`;
  return formatNumber(value);
}

/** "2026-11-10" -> "10/11/2026" */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/** Điểm sao: 4.25 -> "4,3" */
export function formatStars(score: number): string {
  return score.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
