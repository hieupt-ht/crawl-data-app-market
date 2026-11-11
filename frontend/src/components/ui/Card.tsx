import type { ReactNode } from "react";

interface CardProps {
  /** Số thứ tự khu vực, vd "①" */
  badge?: string;
  title: string;
  subtitle?: ReactNode;
  /** Nội dung đặt bên phải tiêu đề (nút, chú thích...) */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  highlight?: boolean; // viền màu nhấn cho khu vực chính
}

/** Khung thẻ trắng dùng cho mọi khu vực của dashboard. */
export default function Card({ badge, title, subtitle, actions, children, className = "", highlight = false }: CardProps) {
  const border = highlight ? "border-accent/40 ring-1 ring-accent/15" : "border-line";
  return (
    <section className={`rounded-xl border bg-surface p-5 shadow-card ${border} ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            {badge && <span className="text-accent">{badge}</span>}
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
