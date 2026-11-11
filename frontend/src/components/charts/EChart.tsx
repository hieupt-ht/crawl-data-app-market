"use client";

/**
 * EChart — Component bọc thư viện ECharts để dùng trong React.
 *
 * ECharts không phải thư viện React: nó cần một thẻ <div> thật để vẽ vào.
 * Vì vậy ta:
 *   1. Dùng useRef để lấy thẻ <div>.
 *   2. Trong useEffect (chỉ chạy trên trình duyệt) gọi echarts.init(div).
 *   3. Mỗi khi prop `option` đổi -> gọi chart.setOption(option) để vẽ lại.
 *   4. Khi component bị gỡ khỏi trang -> chart.dispose() để giải phóng bộ nhớ.
 */
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import { useEffect, useRef } from "react";

interface EChartProps {
  option: EChartsOption;
  height: number;
  /** Gọi khi người dùng click vào một điểm/cột trên biểu đồ. */
  onClick?: (params: echarts.ECElementEvent) => void;
  /** Mô tả ngắn cho trình đọc màn hình. */
  ariaLabel: string;
}

export default function EChart({ option, height, onClick, ariaLabel }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  // Lưu hàm onClick mới nhất vào ref, để không phải gắn lại sự kiện mỗi lần render.
  const onClickRef = useRef(onClick);

  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  // Khởi tạo biểu đồ một lần
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = echarts.init(container, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    chart.on("click", (params) => onClickRef.current?.(params));

    // Tự co giãn khi khung chứa đổi kích thước (vd mở/đóng panel bên phải)
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  // Vẽ lại khi option đổi. notMerge: true = thay hẳn option cũ, tránh "dính" dữ liệu cũ.
  useEffect(() => {
    const container = containerRef.current;
    const chart = chartRef.current;
    if (!container || !chart) return;

    const draw = () => chart.setOption(withPageFont(option, container), { notMerge: true });
    draw();
    // Font web (Be Vietnam Pro) có thể tải xong SAU lần vẽ đầu -> vẽ lại một lần khi font sẵn sàng
    document.fonts.ready.then(() => {
      if (!chart.isDisposed()) draw();
    });
  }, [option]);

  return <div ref={containerRef} style={{ height }} className="w-full" role="img" aria-label={ariaLabel} />;
}

/**
 * Canvas không tự dùng font của CSS, nên đọc font thật của trang (getComputedStyle)
 * rồi gắn vào chữ trên biểu đồ và hộp tooltip. Trả về option mới, không sửa option gốc.
 */
function withPageFont(option: EChartsOption, container: HTMLElement): EChartsOption {
  const fontFamily = getComputedStyle(container).fontFamily;
  const tooltip = option.tooltip && !Array.isArray(option.tooltip) ? option.tooltip : undefined;
  return {
    ...option,
    textStyle: { ...option.textStyle, fontFamily },
    ...(tooltip ? { tooltip: { ...tooltip, textStyle: { ...tooltip.textStyle, fontFamily } } } : {}),
  };
}
