/**
 * Trang chi tiết app: /apps/[appId]   (vd /apps/com.apero.pdfreader)
 *
 * Thư mục tên [appId] (có ngoặc vuông) = "dynamic segment": phần đó của URL là biến,
 * Next.js truyền vào qua prop `params`.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AppDetail from "@/components/app-detail/AppDetail";
import PageLoading from "@/components/ui/PageLoading";
import { getDashboardData, getLookups } from "@/lib/dataSource";

/** Dựng sẵn trang cho mọi app lúc build -> mở trang tức thì, không phải chờ server. */
export function generateStaticParams() {
  return getDashboardData().apps.map((app) => ({ appId: app.id }));
}

/** Tiêu đề tab trình duyệt, vd "PDF Reader Pro: View & Edit · App Opportunity Finder". */
export async function generateMetadata({ params }: PageProps<"/apps/[appId]">): Promise<Metadata> {
  const { appId } = await params;
  const app = getLookups().appById.get(decodeURIComponent(appId));
  return { title: app ? `${app.title} · App Opportunity Finder` : "Không tìm thấy app" };
}

export default async function AppPage({ params }: PageProps<"/apps/[appId]">) {
  const { appId } = await params;
  const app = getLookups().appById.get(decodeURIComponent(appId));
  if (!app) notFound(); // id sai -> trang 404

  // AppDetail đọc bộ lọc từ URL (useSearchParams) nên phải bọc <Suspense>, giống trang chủ
  return (
    <Suspense fallback={<PageLoading />}>
      <AppDetail app={app} />
    </Suspense>
  );
}
