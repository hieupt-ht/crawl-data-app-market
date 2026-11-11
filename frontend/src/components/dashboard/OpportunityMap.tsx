"use client";

import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import EChart from "@/components/charts/EChart";
import { CHART_FONT_SIZE, COLORS, FONT_FAMILY, TOOLTIP_STYLE, howCalculated } from "@/components/charts/chartTheme";
import type { RankedDomain } from "@/lib/analytics";
import { formatCompact, formatInstalls, formatNumber, formatPercent } from "@/lib/format";

interface OpportunityMapProps {
  domains: RankedDomain[];
  selectedDomainId: string | null;
  onSelectDomain: (domainId: string) => void;
}

/**
 * ② Bản đồ cơ hội (scatter).
 *   Trục X: nhu cầu = tổng lượt tải (thang log)
 *   Trục Y: mức bất mãn = tỉ lệ đánh giá 1–2★
 *   Kích thước chấm: số app
 * Góc trên bên phải (nhu cầu cao + bất mãn cao) được tô nhẹ và ghi "Cơ hội".
 */
export default function OpportunityMap({ domains, selectedDomainId, onSelectDomain }: OpportunityMapProps) {
  // useMemo: chỉ tính lại option khi dữ liệu hoặc lựa chọn thay đổi
  const option = useMemo<EChartsOption>(() => buildOption(domains, selectedDomainId), [domains, selectedDomainId]);

  return (
    <EChart
      option={option}
      height={430}
      ariaLabel="Biểu đồ phân tán: mỗi chấm là một lĩnh vực, trục ngang là tổng lượt tải, trục dọc là tỉ lệ đánh giá 1–2 sao"
      onClick={(params) => {
        if (params.seriesType === "scatter" && typeof params.dataIndex === "number") {
          onSelectDomain(domains[params.dataIndex].domain.id);
        }
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Đặt nhãn tránh đè nhau
// ---------------------------------------------------------------------------
type LabelPosition = "right" | "left" | "top" | "bottom";
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Kích thước vùng vẽ ƯỚC LƯỢNG (px) ở màn hình laptop. Chỉ cần gần đúng để so chỗ trống.
const PLOT_W = 480;
const PLOT_H = 350;
const CHAR_W = 7.4; // bề rộng trung bình 1 ký tự cỡ chữ 13px (Be Vietnam Pro hơi rộng)
const LABEL_H = 16;
const GAP = 5;

function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Với mỗi chấm, thử đặt nhãn lần lượt: phải → trái → trên → dưới,
 * chọn chỗ đầu tiên nằm trong vùng vẽ và không đè lên nhãn/chấm khác.
 * Lĩnh vực hạng cao được chọn chỗ trước (nhãn quan trọng ưu tiên chỗ đẹp).
 */
function placeLabels(
  domains: RankedDomain[],
  symbolSize: (d: RankedDomain) => number,
  axis: { xMin: number; xMax: number; yMin: number; yMax: number },
): LabelPosition[] {
  // Đổi toạ độ dữ liệu -> toạ độ pixel ước lượng (gốc ở góc trên bên trái)
  const toPixel = (d: RankedDomain) => ({
    px: ((Math.log10(d.totalInstalls) - Math.log10(axis.xMin)) / (Math.log10(axis.xMax) - Math.log10(axis.xMin))) * PLOT_W,
    py: ((axis.yMax - d.lowStarRatio * 100) / (axis.yMax - axis.yMin)) * PLOT_H,
  });

  // Coi mỗi chấm là một hộp vuông để tránh nhãn đè lên chấm
  const dotBoxes: Box[] = domains.map((d) => {
    const { px, py } = toPixel(d);
    const r = symbolSize(d) / 2;
    return { x: px - r, y: py - r, w: r * 2, h: r * 2 };
  });

  const placed: Box[] = [];
  const result: LabelPosition[] = new Array(domains.length).fill("right");
  const order = domains.map((_, i) => i).sort((a, b) => domains[a].rank - domains[b].rank);

  for (const i of order) {
    const d = domains[i];
    const { px, py } = toPixel(d);
    const r = symbolSize(d) / 2;
    const w = d.domain.name.length * CHAR_W;

    const candidates: Record<LabelPosition, Box> = {
      right: { x: px + r + GAP, y: py - LABEL_H / 2, w, h: LABEL_H },
      left: { x: px - r - GAP - w, y: py - LABEL_H / 2, w, h: LABEL_H },
      top: { x: px - w / 2, y: py - r - GAP - LABEL_H, w, h: LABEL_H },
      bottom: { x: px - w / 2, y: py + r + GAP, w, h: LABEL_H },
    };

    const insidePlot = (b: Box) => b.x >= 0 && b.x + b.w <= PLOT_W && b.y >= 0 && b.y + b.h <= PLOT_H;
    const isFree = (b: Box) =>
      insidePlot(b) &&
      !placed.some((p) => boxesOverlap(p, b)) &&
      !dotBoxes.some((dot, j) => j !== i && boxesOverlap(dot, b));

    const positions = Object.keys(candidates) as LabelPosition[];
    const best = positions.find((pos) => isFree(candidates[pos])) ?? positions.find((pos) => insidePlot(candidates[pos])) ?? "right";

    result[i] = best;
    placed.push(candidates[best]);
  }
  return result;
}

function buildOption(domains: RankedDomain[], selectedDomainId: string | null): EChartsOption {
  if (domains.length === 0) return {};

  const installs = domains.map((d) => d.totalInstalls);
  const ratiosPct = domains.map((d) => d.lowStarRatio * 100);

  // Đường chia góc phần tư = trung bình của các lĩnh vực.
  // Trục X là log nên dùng trung bình nhân (trung bình của log).
  const meanLog = installs.reduce((s, v) => s + Math.log10(v), 0) / installs.length;
  const midX = 10 ** meanLog;
  const midY = ratiosPct.reduce((s, v) => s + v, 0) / ratiosPct.length;

  // Biên trục: làm tròn ra các mốc đẹp
  const xMin = 10 ** Math.floor(Math.log10(Math.min(...installs)));
  const xMax = 10 ** Math.ceil(Math.log10(Math.max(...installs)));
  const yMin = Math.max(0, Math.floor((Math.min(...ratiosPct) - 3) / 5) * 5);
  const yMax = Math.ceil((Math.max(...ratiosPct) + 3) / 5) * 5;

  const hasSelection = selectedDomainId !== null;
  const symbolSize = (d: RankedDomain) => 10 + d.appCount * 3;
  const labelPositions = placeLabels(domains, symbolSize, { xMin, xMax, yMin, yMax });

  const points = domains.map((d, index) => {
    const inOpportunityZone = d.totalInstalls >= midX && d.lowStarRatio * 100 >= midY;
    const isSelected = d.domain.id === selectedDomainId;
    return {
      name: d.domain.name,
      value: [d.totalInstalls, d.lowStarRatio * 100, d.appCount],
      symbolSize: symbolSize(d),
      itemStyle: {
        // Chấm trong vùng cơ hội: xanh nhấn. Chấm ngoài vùng: xám có viền đậm để vẫn nhìn rõ trên nền trắng.
        color: inOpportunityZone ? COLORS.accent : COLORS.neutralMark,
        borderColor: isSelected ? COLORS.ink : inOpportunityZone ? COLORS.surface : COLORS.neutralMarkBorder,
        borderWidth: isSelected ? 2.5 : 1.5,
        opacity: hasSelection && !isSelected ? 0.35 : 1,
      },
      label: {
        position: labelPositions[index],
        // Nhãn trong vùng cơ hội (hoặc đang chọn) đậm hơn để mắt tìm thấy ngay
        color: isSelected || inOpportunityZone ? COLORS.ink : COLORS.inkSoft,
        fontWeight: isSelected || inOpportunityZone ? 600 : 400,
      },
    };
  });

  return {
    textStyle: { fontFamily: FONT_FAMILY },
    grid: { left: 56, right: 32, top: 24, bottom: 56 },
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: "item",
      formatter: (params: unknown) => {
        const { dataIndex } = params as { dataIndex: number };
        const d = domains[dataIndex];
        if (!d) return "";
        return (
          `<b>${d.domain.name}</b><br/>` +
          `Tổng lượt tải: <b>${formatInstalls(d.totalInstalls)}</b><br/>` +
          `Tỉ lệ đánh giá 1–2★: <b>${formatPercent(d.lowStarRatio)}</b><br/>` +
          `Số app: <b>${formatNumber(d.appCount)}</b><br/>` +
          `Chê quảng cáo/giá (dễ sửa): <b>${formatPercent(d.easyFixShare, 0)}</b><br/>` +
          `Hạng <b>${d.rank}</b> ở bảng ① (xếp theo % 1–2★)` +
          howCalculated(
            "X = tổng mốc lượt tải tối thiểu của các app (thang log). Y = tổng lượt chấm 1–2★ / tổng lượt chấm. " +
              "Đường đứt nét = trung bình các lĩnh vực. Bấm vào chấm để lọc trang.",
          )
        );
      },
    },
    xAxis: {
      type: "log",
      min: xMin,
      max: xMax,
      name: "Nhu cầu — tổng lượt tải (thang log)",
      nameLocation: "middle",
      nameGap: 32,
      nameTextStyle: { color: COLORS.ink2, fontSize: CHART_FONT_SIZE },
      axisLine: { lineStyle: { color: COLORS.axis } },
      axisLabel: { color: COLORS.muted, fontSize: CHART_FONT_SIZE, formatter: (value: number) => formatCompact(value) },
      splitLine: { lineStyle: { color: COLORS.line, type: "solid", width: 1 } },
    },
    yAxis: {
      type: "value",
      min: yMin,
      max: yMax,
      name: "Mức bất mãn — tỉ lệ 1–2★",
      nameLocation: "middle",
      nameGap: 40,
      nameTextStyle: { color: COLORS.ink2, fontSize: CHART_FONT_SIZE },
      axisLine: { show: false },
      axisLabel: { color: COLORS.muted, fontSize: CHART_FONT_SIZE, formatter: (value: number) => `${value}%` },
      splitLine: { lineStyle: { color: COLORS.line } },
    },
    series: [
      {
        type: "scatter",
        data: points,
        label: {
          show: true,
          distance: 6,
          formatter: "{b}",
          fontSize: CHART_FONT_SIZE,
        },
        emphasis: { scale: 1.1, label: { color: COLORS.ink } },
        cursor: "pointer",
        // Vùng "Cơ hội": từ đường trung bình tới góc trên bên phải
        markArea: {
          silent: true,
          itemStyle: { color: COLORS.opportunityZone },
          label: {
            show: true,
            position: "insideTopRight",
            formatter: "Cơ hội",
            color: COLORS.accentStrong, // xanh đậm: 7:1 trên nền vùng cơ hội (xanh thường chỉ 4,2:1)
            fontWeight: "bold",
            fontSize: 13,
            padding: 8,
          },
          data: [[{ xAxis: midX, yAxis: midY }, { xAxis: xMax, yAxis: yMax }]],
        },
        // Hai đường trung bình (đứt nét)
        markLine: {
          silent: true,
          symbol: "none",
          label: { show: false },
          lineStyle: { color: COLORS.axis, type: "dashed", width: 1 },
          data: [{ xAxis: midX }, { yAxis: midY }],
        },
      },
    ],
  };
}
