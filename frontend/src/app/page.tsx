import { Suspense } from "react";
import Dashboard from "@/components/dashboard/Dashboard";
import PageLoading from "@/components/ui/PageLoading";

/**
 * Trang chủ "/" — chỉ là cái vỏ. Toàn bộ logic nằm trong <Dashboard />.
 *
 * Dashboard đọc bộ lọc từ URL bằng useSearchParams(). Next.js yêu cầu bọc component đó
 * trong <Suspense>: lúc build chưa biết URL sẽ là gì, nên HTML ban đầu hiện <PageLoading />,
 * rồi trình duyệt vẽ Dashboard thật khi đã đọc được URL.
 */
export default function Home() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Dashboard />
    </Suspense>
  );
}
