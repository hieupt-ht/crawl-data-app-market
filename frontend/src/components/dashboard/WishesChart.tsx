"use client";

/**
 * Biểu đồ donut "Top mong muốn": mỗi lát = tỉ trọng một mong muốn trên tổng số review có nêu mong muốn.
 * Dùng ở Overview (④) và trang chi tiết app (②).
 *
 * Chỉ giữ TOP_COUNT lát lớn nhất + 1 lát "Khác", vì donut nhiều lát thì mắt không so được.
 * Chú thích là danh sách HTML bên dưới (không dùng legend của ECharts) để tên dài tự xuống dòng.
 */
import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import EChart from "@/components/charts/EChart";
import { COLORS, DONUT_COLORS, FONT_FAMILY, TOOLTIP_STYLE, howCalculated } from "@/components/charts/chartTheme";
import { splitTopWishes, type Lookups, type WishCount } from "@/lib/analytics";
import { formatNumber, formatPercent } from "@/lib/format";

interface WishesChartProps {
  wishCounts: WishCount[]; // đã sắp giảm dần (kết quả của countWishes)
  totalReviews: number; // tổng review trong phạm vi đang xem (để tính "x% review có nêu mong muốn")
  lookups: Lookups;
}

const TOP_COUNT = 5;

// Lát lớn hơn = xanh đậm hơn (5 sắc xanh phân biệt rõ, theo quy tắc "chỉ một màu nhấn").
// "Khác" dùng xám để không bị đọc nhầm là một mong muốn cụ thể.
const SLICE_COLORS = DONUT_COLORS;
const OTHER_COLOR = COLORS.neutralMark;

const DONUT_HEIGHT = 200;

/** Một lát donut, cũng là một dòng chú thích. */
interface Slice {
  key: string;
  name: string;
  count: number;
  color: string;
  /** Chỉ có ở lát "Khác": các mong muốn đã gộp vào. */
  members?: WishCount[];
}

export default function WishesChart({ wishCounts, totalReviews, lookups }: WishesChartProps) {
  const shares = useMemo(() => splitTopWishes(wishCounts, TOP_COUNT), [wishCounts]);

  const slices = useMemo<Slice[]>(() => {
    const wishName = (wishId: string) => lookups.wishById.get(wishId)?.name ?? wishId;
    const topSlices: Slice[] = shares.top.map((wish, index) => ({
      key: wish.wishId,
      name: wishName(wish.wishId),
      count: wish.count,
      color: SLICE_COLORS[index],
    }));
    if (shares.others.length === 0) return topSlices;
    return [
      ...topSlices,
      {
        key: "other",
        name: `Khác (${shares.others.length} mong muốn)`,
        count: shares.otherCount,
        color: OTHER_COLOR,
        members: shares.others,
      },
    ];
  }, [shares, lookups]);

  const option = useMemo<EChartsOption>(
    () => buildOption(slices, shares.total, lookups),
    [slices, shares.total, lookups],
  );

  if (shares.total === 0) {
    return <p className="py-10 text-center text-sm text-muted">Không có review nào nêu mong muốn trong phạm vi này.</p>;
  }

  const mentionRatio = shares.total / Math.max(totalReviews, 1);

  return (
    <div>
      {/* Donut + con số ở giữa (đặt chồng lên bằng absolute) */}
      <div className="relative">
        <EChart
          option={option}
          height={DONUT_HEIGHT}
          ariaLabel="Biểu đồ donut: tỉ trọng các mong muốn trong số review có nêu mong muốn"
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-2xl font-semibold text-ink">{formatPercent(mentionRatio, 0)}</span>
          <span className="text-center text-xs leading-tight text-muted">
            review có nêu
            <br />
            mong muốn
          </span>
        </div>
      </div>

      {/* Chú thích: màu · tên · % — cũng là "bảng số" cho ai không phân biệt được màu */}
      <ul className="mt-3 space-y-1.5 text-sm">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-start gap-2">
            <span className="mt-1 h-3 w-3 flex-none rounded-sm" style={{ backgroundColor: slice.color }} />
            <span className="flex-1 text-ink-2">{slice.name}</span>
            <span className="tabular font-medium text-ink">{formatPercent(slice.count / shares.total)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        % tính trên {formatNumber(shares.total)} review có nêu mong muốn. Rê chuột vào lát để xem số cụ thể.
      </p>
    </div>
  );
}

function buildOption(slices: Slice[], total: number, lookups: Lookups): EChartsOption {
  return {
    textStyle: { fontFamily: FONT_FAMILY },
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: "item",
      // Giữ hộp trong khung biểu đồ: khối ④ nằm sát mép trái màn hình, nếu không giữ thì hộp
      // của lát "Khác" (danh sách dài) bị đẩy ra ngoài màn hình.
      confine: true,
      formatter: (params: unknown) => {
        const { dataIndex } = params as { dataIndex: number };
        const slice = slices[dataIndex];
        if (!slice) return "";
        // Lát "Khác": liệt kê luôn các mong muốn đã gộp để không bị "che mất"
        const memberLines = (slice.members ?? [])
          .map((m) => `${lookups.wishById.get(m.wishId)?.name ?? m.wishId}: ${formatNumber(m.count)}`)
          .join("<br/>");
        return (
          `<b>${slice.name}</b><br/>` +
          `<b>${formatNumber(slice.count)}</b> / ${formatNumber(total)} review = <b>${formatPercent(slice.count / total)}</b>` +
          (memberLines ? `<div style="margin-top:6px;color:${COLORS.ink2}">${memberLines}</div>` : "") +
          howCalculated("Đếm review 1–2★ có gắn mong muốn này (mỗi review gắn tối đa 1 mong muốn).")
        );
      },
    },
    series: [
      {
        type: "pie",
        radius: ["62%", "92%"],
        center: ["50%", "50%"],
        startAngle: 90, // lát lớn nhất bắt đầu từ "12 giờ", đi theo chiều kim đồng hồ
        label: { show: false }, // % đã có ở chú thích bên dưới, không ghi lên lát cho đỡ rối
        itemStyle: { borderColor: COLORS.surface, borderWidth: 2 }, // khe 2px giữa các lát
        emphasis: { scale: true, scaleSize: 4 },
        data: slices.map((slice) => ({ name: slice.name, value: slice.count, itemStyle: { color: slice.color } })),
      },
    ],
  };
}
