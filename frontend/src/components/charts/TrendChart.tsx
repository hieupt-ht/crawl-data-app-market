"use client";

import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import EChart from "./EChart";
import { CHART_FONT_SIZE, COLORS, FONT_FAMILY, TOOLTIP_STYLE, howCalculated } from "./chartTheme";
import type { MonthPoint } from "@/lib/analytics";
import { formatNumber } from "@/lib/format";

interface TrendChartProps {
  points: MonthPoint[];
  height?: number;
}

/** Biểu đồ đường: số review 1–2★ theo từng tháng. */
export default function TrendChart({ points, height = 240 }: TrendChartProps) {
  const option = useMemo<EChartsOption>(
    () => ({
      textStyle: { fontFamily: FONT_FAMILY },
      grid: { left: 8, right: 28, top: 12, bottom: 4, containLabel: true }, // chừa chỗ cho nhãn tháng cuối
      tooltip: {
        ...TOOLTIP_STYLE,
        trigger: "axis",
        axisPointer: { type: "line", lineStyle: { color: COLORS.axis } },
        formatter: (params: unknown) => {
          // Với trigger "axis", ECharts truyền vào một MẢNG (mỗi series 1 phần tử); ở đây chỉ có 1 series
          const [first] = params as { dataIndex: number }[];
          const point = points[first.dataIndex];
          return (
            `<b>Tháng ${point.label}</b><br/>${formatNumber(point.count)} review 1–2★` +
            howCalculated(
              "Đếm số review 1–2★ có ngày đăng trong tháng (theo bộ lọc ngôn ngữ). Tháng đầu và tháng cuối có thể chưa đủ ngày.",
            )
          );
        },
      },
      xAxis: {
        type: "category",
        data: points.map((p) => p.label),
        boundaryGap: false,
        axisLine: { lineStyle: { color: COLORS.axis } },
        axisTick: { show: false },
        axisLabel: { color: COLORS.muted, fontSize: CHART_FONT_SIZE },
      },
      yAxis: {
        type: "value",
        minInterval: 1, // số review là số nguyên, không hiện 0,5
        axisLabel: { color: COLORS.muted, fontSize: CHART_FONT_SIZE },
        splitLine: { lineStyle: { color: COLORS.line } },
      },
      series: [
        {
          type: "line",
          data: points.map((p) => p.count),
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { color: COLORS.accent, width: 2 },
          itemStyle: { color: COLORS.accent },
          areaStyle: { color: COLORS.accentSoftFill },
        },
      ],
    }),
    [points],
  );

  return <EChart option={option} height={height} ariaLabel="Biểu đồ đường: số review 1–2 sao theo tháng" />;
}
