import Link from "next/link";
import type { AppSummary, Lookups } from "@/lib/analytics";
import { formatStars } from "@/lib/format";

interface CompetitorTableProps {
  summaries: AppSummary[];
  lookups: Lookups;
  /** Tạo đường dẫn tới trang chi tiết app (đã kèm bộ lọc hiện tại). */
  appHref: (appId: string) => string;
  /** Bấm vào chỗ trống trong dòng cũng mở trang app. */
  onOpenApp: (appId: string) => void;
}

/** ⑤ Bảng app đối thủ. Bấm 1 dòng để sang trang chi tiết app. */
export default function CompetitorTable({ summaries, lookups, appHref, onOpenApp }: CompetitorTableProps) {
  if (summaries.length === 0) {
    return <p className="py-10 text-center text-sm text-muted">Không có app nào khớp bộ lọc.</p>;
  }

  return (
    <div className="max-h-140 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b border-line text-left text-xs font-semibold text-ink-2">
            <th className="py-2 pr-3">Tên app</th>
            <th className="py-2 pr-3">Công ty</th>
            <th className="py-2 pr-3 text-right">Lượt tải</th>
            <th className="py-2 pr-3 text-right">Sao</th>
            <th className="py-2 pr-3">Tính năng chính</th>
            <th className="py-2 pr-3">Điểm yếu chính</th>
            <th className="py-2">Review tiêu biểu</th>
          </tr>
        </thead>
        <tbody className="font-medium">
          {summaries.map(({ app, mainPainId, topReview }) => (
            <tr
              key={app.id}
              onClick={() => onOpenApp(app.id)}
              className="cursor-pointer border-b border-line align-top last:border-0 hover:bg-page"
            >
              <td className="py-2.5 pr-3">
                {/* Dùng <Link> cho tên app: chuột giữa / Ctrl+click mở tab mới được, Next.js tải trước trang */}
                <Link
                  href={appHref(app.id)}
                  onClick={(event) => event.stopPropagation()}
                  className="font-medium text-ink hover:text-accent"
                >
                  {app.title}
                </Link>
                <p className="text-xs text-muted">{lookups.domainById.get(app.domainId)?.name}</p>
              </td>
              <td className="py-2.5 pr-3 text-ink-2">{lookups.companyNameById.get(app.companyId)}</td>
              <td className="tabular py-2.5 pr-3 text-right whitespace-nowrap">{app.installsLabel}</td>
              <td className="tabular py-2.5 pr-3 text-right">{formatStars(app.score)}★</td>
              <td className="py-2.5 pr-3">
                <div className="flex max-w-56 flex-wrap gap-1">
                  {app.features.map((feature) => (
                    <span key={feature} className="rounded border border-line-strong bg-page px-1.5 py-0.5 text-xs text-ink-soft">
                      {feature}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-2.5 pr-3 font-medium whitespace-nowrap text-ink">
                {mainPainId ? lookups.painById.get(mainPainId)?.name : "—"}
              </td>
              <td className="py-2.5 text-ink-2">
                {topReview ? <p className="line-clamp-2 max-w-80 font-normal text-ink-soft italic">“{topReview.content}”</p> : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
