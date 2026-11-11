/** Màn hình chờ đơn giản, hiện trong lúc trình duyệt đọc URL và vẽ trang. */
export default function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted" role="status">
      Đang tải dữ liệu…
    </div>
  );
}
