import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Opportunity Finder",
  description: "Tìm lĩnh vực app nên làm và điểm khác biệt so với đối thủ, dựa trên review 1–2★ trên Google Play.",
};

/**
 * Font "Be Vietnam Pro" — thiết kế riêng cho tiếng Việt nên dấu (ầ, ữ, ợ…) rõ và không bị đè.
 * next/font tải file font lúc build và phục vụ từ chính site (trình duyệt không gọi tới Google).
 * Font này không phải "variable font" nên phải liệt kê từng độ đậm sẽ dùng.
 * `variable` tạo biến CSS --font-be-vietnam-pro, globals.css dùng biến này làm font mặc định.
 */
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"], // italic cho trích dẫn review
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`h-full antialiased ${beVietnamPro.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
