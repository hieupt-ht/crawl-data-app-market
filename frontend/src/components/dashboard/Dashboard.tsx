"use client";

/**
 * Dashboard — component "chỉ huy" của trang Overview.
 *
 * Nhiệm vụ:
 *   1. Đọc TRẠNG THÁI XEM từ URL (bộ lọc, lĩnh vực đang chọn) — xem lib/viewState.ts.
 *   2. Tính DỮ LIỆU PHÁI SINH từ trạng thái đó (bằng các hàm trong lib/analytics.ts).
 *   3. Truyền dữ liệu + hàm xử lý sự kiện xuống các component con.
 *
 * Luồng dữ liệu một chiều: URL -> view -> props xuống con -> con gọi callback -> ghi URL -> vẽ lại.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import CellReviewsPanel from "@/components/panels/CellReviewsPanel";
import {
  computeDomainStats,
  countWishes,
  filterApps,
  filterReviews,
  rankDomains,
  summarizeApp,
} from "@/lib/analytics";
import { getDashboardData, getLookups } from "@/lib/dataSource";
import { appDetailHref, parseViewState, updateViewInUrl } from "@/lib/viewState";
import CompetitorTable from "./CompetitorTable";
import HeaderBar from "./HeaderBar";
import KpiRow from "./KpiRow";
import OpportunityMap from "./OpportunityMap";
import OpportunityTable from "./OpportunityTable";
import PainHeatmap from "./PainHeatmap";
import WishesChart from "./WishesChart";

/** Ô heatmap đang mở panel review (hoặc null = không mở). */
type CellPanelState = { domainId: string; painId: string } | null;

// Dữ liệu giả không đổi trong lúc chạy nên lấy một lần khi file được nạp
const data = getDashboardData();
const lookups = getLookups();

export default function Dashboard() {
  // ---------------- 1. Trạng thái ----------------
  const router = useRouter();
  const searchParams = useSearchParams(); // tự cập nhật mỗi khi URL đổi
  const view = useMemo(() => parseViewState(searchParams), [searchParams]);
  const { filters } = view;

  // Panel review của ô heatmap chỉ là trạng thái tạm thời -> để useState, không cần lên URL
  const [cellPanel, setCellPanel] = useState<CellPanelState>(null);

  // ---------------- 2. Dữ liệu phái sinh ----------------
  // useMemo = "nhớ" kết quả, chỉ tính lại khi các giá trị trong [...] thay đổi.
  const apps = useMemo(() => filterApps(data.apps, filters.companyId), [filters.companyId]);
  const reviews = useMemo(() => filterReviews(data.reviews, apps, filters, data.meta.updatedAt), [apps, filters]);
  const domainStats = useMemo(() => computeDomainStats(data, apps, reviews), [apps, reviews]);
  const rankedDomains = useMemo(() => rankDomains(domainStats), [domainStats]);

  // Nếu lĩnh vực trên URL không còn (vd đổi bộ lọc công ty, hoặc gõ sai) -> coi như không chọn
  const activeDomainId =
    view.domainId && rankedDomains.some((d) => d.domain.id === view.domainId) ? view.domainId : null;
  const activeDomainName = activeDomainId ? (lookups.domainById.get(activeDomainId)?.name ?? null) : null;

  // ④ và ⑤ chỉ xét lĩnh vực đang chọn (nếu có)
  const scopedReviews = useMemo(
    () => (activeDomainId ? reviews.filter((r) => lookups.appById.get(r.appId)?.domainId === activeDomainId) : reviews),
    [reviews, activeDomainId],
  );
  const wishCounts = useMemo(() => countWishes(scopedReviews), [scopedReviews]);
  const appSummaries = useMemo(() => {
    const scopedApps = activeDomainId ? apps.filter((a) => a.domainId === activeDomainId) : apps;
    return scopedApps.map((app) => summarizeApp(app, reviews)).sort((a, b) => b.app.minInstalls - a.app.minInstalls);
  }, [apps, reviews, activeDomainId]);

  // ---------------- 3. Xử lý sự kiện ----------------
  // Bấm lại đúng lĩnh vực đang chọn = bỏ chọn
  const toggleDomain = useCallback(
    (domainId: string) => updateViewInUrl({ domainId: activeDomainId === domainId ? null : domainId }),
    [activeDomainId],
  );
  const closeCellPanel = useCallback(() => setCellPanel(null), []);
  // Link tới trang app mang theo trạng thái hiện tại, để "← Overview" quay về đúng chỗ
  const appHref = useCallback((appId: string) => appDetailHref(appId, view), [view]);

  const scopeLabel = activeDomainName ?? "Tất cả lĩnh vực";

  // ---------------- 4. Giao diện ----------------
  return (
    <div className="min-h-screen">
      <HeaderBar
        companies={data.companies}
        updatedAt={data.meta.updatedAt}
        filters={filters}
        onFiltersChange={(nextFilters) => updateViewInUrl({ filters: nextFilters })}
        activeDomainName={activeDomainName}
        onClearDomain={() => updateViewInUrl({ domainId: null })}
      />

      <main className="mx-auto max-w-360 space-y-5 px-6 py-5">
        <KpiRow appCount={apps.length} reviewCount={reviews.length} months={filters.months} domains={rankedDomains} />

        <Card
          badge="①"
          title="Bảng xếp hạng cơ hội theo lĩnh vực"
          subtitle="Nên làm app ở lĩnh vực nào? Xếp theo % đánh giá 1–2★ (bị chê nhiều nhất đứng đầu). Cả 3 thanh đều dài là lĩnh vực đáng làm. Rê chuột vào thanh để xem số cụ thể, bấm một dòng để lọc cả trang."
          highlight
        >
          <OpportunityTable
            domains={rankedDomains}
            lookups={lookups}
            selectedDomainId={activeDomainId}
            onSelectDomain={toggleDomain}
          />
        </Card>

        <div className="grid grid-cols-12 gap-5">
          <Card
            badge="②"
            title="Bản đồ cơ hội"
            subtitle="Mỗi chấm là một lĩnh vực · chấm càng to càng nhiều app · bấm chấm để lọc"
            className="col-span-6"
          >
            <OpportunityMap domains={rankedDomains} selectedDomainId={activeDomainId} onSelectDomain={toggleDomain} />
          </Card>

          <Card
            badge="③"
            title="Heatmap lĩnh vực × pain point"
            subtitle="Người dùng đang đau ở đâu? Bấm tên lĩnh vực để lọc, bấm ô để đọc review gốc."
            className="col-span-6"
          >
            <PainHeatmap
              domains={rankedDomains}
              painGroups={data.painGroups}
              painPoints={data.painPoints}
              selectedDomainId={activeDomainId}
              onSelectDomain={toggleDomain}
              onOpenCell={(domainId, painId) => setCellPanel({ domainId, painId })}
            />
          </Card>
        </div>

        <div className="grid grid-cols-12 gap-5">
          <Card
            badge="④"
            title="Top mong muốn chưa được đáp ứng"
            subtitle={<>Phạm vi: <b className="text-ink">{scopeLabel}</b> · đếm từ review 1–2★</>}
            className="col-span-4"
          >
            <WishesChart wishCounts={wishCounts} totalReviews={scopedReviews.length} lookups={lookups} />
          </Card>

          <Card
            badge="⑤"
            title="App đối thủ"
            subtitle={<>Phạm vi: <b className="text-ink">{scopeLabel}</b> · {appSummaries.length} app · bấm một dòng để mở trang chi tiết</>}
            className="col-span-8"
          >
            <CompetitorTable
              summaries={appSummaries}
              lookups={lookups}
              appHref={appHref}
              onOpenApp={(appId) => router.push(appHref(appId))}
            />
          </Card>
        </div>

        <footer className="pb-6 text-center text-xs text-ink-2">
          Dữ liệu giả để xem trước bố cục · Nguồn: {data.meta.source}
        </footer>
      </main>

      {cellPanel && (
        <CellReviewsPanel
          domainId={cellPanel.domainId}
          painId={cellPanel.painId}
          reviews={reviews}
          lookups={lookups}
          onClose={closeCellPanel}
        />
      )}
    </div>
  );
}
