"use client";

/**
 * AppDetail — nội dung trang chi tiết một app (/apps/[appId]).
 *
 * Bố cục:
 *   Thanh trên: đường dẫn quay lại + bộ lọc thời gian/ngôn ngữ
 *   Thông tin app
 *   ① So sánh pain point với trung bình lĩnh vực   ② Mong muốn của người dùng
 *   ③ Xu hướng review 1–2★ theo tháng
 *   ④ Review gốc (lọc, tìm, phân trang)              ⑤ App khác cùng lĩnh vực
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import TrendChart from "@/components/charts/TrendChart";
import WishesChart from "@/components/dashboard/WishesChart";
import Card from "@/components/ui/Card";
import PeriodFilter from "@/components/ui/PeriodFilter";
import {
  DEFAULT_REVIEW_QUERY,
  comparePainPoints,
  countWishes,
  filterReviews,
  monthlyTrend,
  summarizeApp,
  type Filters,
  type ReviewQuery,
} from "@/lib/analytics";
import { getDashboardData, getLookups } from "@/lib/dataSource";
import { formatNumber, formatPercent, formatStars } from "@/lib/format";
import type { App } from "@/lib/types";
import { appDetailHref, overviewHref, parseViewState, updateViewInUrl } from "@/lib/viewState";
import PainComparison from "./PainComparison";
import ReviewExplorer from "./ReviewExplorer";
import SiblingApps from "./SiblingApps";

const data = getDashboardData();
const lookups = getLookups();

export default function AppDetail({ app }: { app: App }) {
  // ---------------- 1. Trạng thái ----------------
  const searchParams = useSearchParams();
  const view = useMemo(() => parseViewState(searchParams), [searchParams]);
  const { months, lang } = view.filters;

  const [reviewQuery, setReviewQuery] = useState<ReviewQuery>(DEFAULT_REVIEW_QUERY);
  const [reviewPage, setReviewPage] = useState(1);
  const reviewSectionRef = useRef<HTMLDivElement>(null);

  // ---------------- 2. Dữ liệu phái sinh ----------------
  // Review trong khoảng thời gian + ngôn ngữ đang chọn, của MỌI công ty
  // (để "trung bình lĩnh vực" so với toàn bộ đối thủ, không bị bộ lọc công ty làm lệch)
  const periodReviews = useMemo(
    () => filterReviews(data.reviews, data.apps, { companyId: "all", months, lang }, data.meta.updatedAt),
    [months, lang],
  );
  const appReviews = useMemo(() => periodReviews.filter((r) => r.appId === app.id), [periodReviews, app.id]);
  const domainReviews = useMemo(
    () => periodReviews.filter((r) => lookups.appById.get(r.appId)?.domainId === app.domainId),
    [periodReviews, app.domainId],
  );

  const painRows = useMemo(() => comparePainPoints(data.painPoints, appReviews, domainReviews), [appReviews, domainReviews]);
  const wishCounts = useMemo(() => countWishes(appReviews), [appReviews]);
  const trend = useMemo(() => monthlyTrend(appReviews, data.meta.updatedAt, months), [appReviews, months]);
  const siblings = useMemo(
    () =>
      data.apps
        .filter((other) => other.domainId === app.domainId && other.id !== app.id)
        .map((other) => summarizeApp(other, periodReviews))
        .sort((a, b) => b.app.minInstalls - a.app.minInstalls),
    [app.domainId, app.id, periodReviews],
  );

  const domainName = lookups.domainById.get(app.domainId)?.name ?? app.domainId;
  const domainLowStarRatio = averageLowStarRatio(data.apps.filter((a) => a.domainId === app.domainId));
  const painOptions = painRows.filter((row) => row.appCount > 0).map((row) => row.pain);

  // ---------------- 3. Xử lý sự kiện ----------------
  const changePeriod = (filters: Filters) => updateViewInUrl({ filters });

  const changeReviewQuery = useCallback((query: ReviewQuery) => {
    setReviewQuery(query);
    setReviewPage(1); // đổi bộ lọc thì quay về trang 1
  }, []);

  /** Bấm một pain point ở ① -> lọc review theo pain đó và cuộn xuống khu vực review. */
  const showReviewsForPain = (painId: string) => {
    changeReviewQuery({ ...reviewQuery, painId });
    reviewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const siblingHref = useCallback((appId: string) => appDetailHref(appId, view), [view]);

  // ---------------- 4. Giao diện ----------------
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-360 flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
          <nav className="mr-auto flex items-center gap-2 text-sm" aria-label="Đường dẫn">
            <Link href={overviewHref(view)} className="font-medium text-accent hover:underline">
              ← Overview
            </Link>
            <span className="text-muted">/</span>
            <Link href={overviewHref({ ...view, domainId: app.domainId })} className="text-ink-2 hover:text-accent">
              {domainName}
            </Link>
            <span className="text-muted">/</span>
            <span className="text-ink">{app.title}</span>
          </nav>
          <PeriodFilter filters={view.filters} onChange={changePeriod} />
        </div>
      </header>

      <main className="mx-auto max-w-360 space-y-5 px-6 py-5">
        {/* Thông tin app */}
        <section className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-semibold text-ink">{app.title}</h1>
              <p className="mt-1 text-sm text-ink-2">
                {lookups.companyNameById.get(app.companyId)} · {domainName} · <span className="text-muted">{app.id}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                <Tag>{app.containsAds ? "Có quảng cáo" : "Không quảng cáo"}</Tag>
                <Tag>{app.offersIAP ? "Có mua trong app" : "Không mua trong app"}</Tag>
                {app.features.map((feature) => (
                  <Tag key={feature}>{feature}</Tag>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center">
              <Stat label="Lượt tải" value={app.installsLabel} />
              <Stat label="Điểm sao" value={`${formatStars(app.score)}★`} />
              <Stat
                label="Tỉ lệ 1–2★"
                value={formatPercent(app.lowStarRatio)}
                note={`TB lĩnh vực ${formatPercent(domainLowStarRatio)}`}
              />
              <Stat label="Review đã đọc" value={formatNumber(appReviews.length)} note={`trong ${months} tháng`} />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-12 gap-5">
          <Card
            badge="①"
            title="Pain point: app này so với trung bình lĩnh vực"
            subtitle="App bị chê nhiều hơn đối thủ cùng mảng ở đâu? Chỗ “nặng hơn” là điểm yếu riêng của app — cơ hội để mình làm tốt hơn."
            className="col-span-7"
          >
            <PainComparison rows={painRows} appReviewCount={appReviews.length} domainName={domainName} onSelectPain={showReviewsForPain} />
          </Card>

          <Card badge="②" title="Mong muốn của người dùng" subtitle="Người dùng app này nói họ cần gì" className="col-span-5">
            <WishesChart wishCounts={wishCounts} totalReviews={appReviews.length} lookups={lookups} />
          </Card>
        </div>

        <Card badge="③" title="Xu hướng review 1–2★ theo tháng" subtitle="Số review tiêu cực mỗi tháng tăng hay giảm?">
          <TrendChart points={trend} height={240} />
        </Card>

        <div className="grid grid-cols-12 items-start gap-5">
          <div ref={reviewSectionRef} className="col-span-8 scroll-mt-20">
            <Card badge="④" title="Review gốc" subtitle="Đọc chính lời người dùng — lọc, tìm từ khóa, sắp xếp">
              <ReviewExplorer
                reviews={appReviews}
                painOptions={painOptions}
                lookups={lookups}
                query={reviewQuery}
                onQueryChange={changeReviewQuery}
                page={reviewPage}
                onPageChange={setReviewPage}
              />
            </Card>
          </div>

          <Card badge="⑤" title="App khác cùng lĩnh vực" subtitle={domainName} className="col-span-4">
            <SiblingApps summaries={siblings} lookups={lookups} appHref={siblingHref} />
          </Card>
        </div>
      </main>
    </div>
  );
}

/** Tỉ lệ 1–2★ chung của nhiều app = trung bình có trọng số theo số lượt chấm. */
function averageLowStarRatio(apps: App[]): number {
  const totalRatings = apps.reduce((sum, a) => sum + a.ratings, 0);
  if (totalRatings === 0) return 0;
  return apps.reduce((sum, a) => sum + a.lowStarRatio * a.ratings, 0) / totalRatings;
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-28 rounded-lg bg-page px-3 py-2">
      <p className="text-xs text-ink-2">{label}</p>
      <p className="tabular text-lg font-bold text-ink">{value}</p>
      {note && <p className="text-xs text-ink-2">{note}</p>}
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded border border-line-strong bg-page px-1.5 py-0.5 text-ink-soft">{children}</span>;
}
