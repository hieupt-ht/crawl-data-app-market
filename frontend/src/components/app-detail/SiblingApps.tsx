import Link from "next/link";
import type { AppSummary, Lookups } from "@/lib/analytics";
import { formatStars } from "@/lib/format";

interface SiblingAppsProps {
  summaries: AppSummary[]; // các app KHÁC cùng lĩnh vực
  lookups: Lookups;
  appHref: (appId: string) => string;
}

/** ⑤ Danh sách app khác cùng lĩnh vực — bấm để chuyển nhanh sang app đó. */
export default function SiblingApps({ summaries, lookups, appHref }: SiblingAppsProps) {
  if (summaries.length === 0) {
    return <p className="text-sm text-muted">Không có app nào khác trong lĩnh vực này.</p>;
  }

  return (
    <ul className="space-y-2">
      {summaries.map(({ app, mainPainId }) => (
        <li key={app.id}>
          <Link
            href={appHref(app.id)}
            className="block rounded-lg border border-line p-3 hover:border-accent hover:bg-accent-soft/40"
          >
            <p className="font-medium text-ink">{app.title}</p>
            <p className="mt-0.5 text-xs text-ink-2">
              {lookups.companyNameById.get(app.companyId)} · {app.installsLabel} · {formatStars(app.score)}★
            </p>
            <p className="mt-1 text-xs text-muted">
              Điểm yếu chính: <span className="text-ink-2">{mainPainId ? lookups.painById.get(mainPainId)?.name : "—"}</span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
