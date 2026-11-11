"use client";

import { useEffect, type ReactNode } from "react";

interface SidePanelProps {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

/** Panel trượt ra từ bên phải. Đóng bằng nút ✕, phím Esc, hoặc bấm ra vùng tối bên ngoài. */
export default function SidePanel({ title, subtitle, onClose, children }: SidePanelProps) {
  // Lắng nghe phím Esc khi panel đang mở; gỡ lắng nghe khi panel đóng
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Đóng panel" onClick={onClose} className="absolute inset-0 bg-ink/20" />
      <aside
        role="dialog"
        aria-modal="true"
        className="relative flex h-full w-[520px] max-w-full flex-col border-l border-line bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {subtitle && <div className="mt-1 text-sm text-ink-2">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-ink-2 hover:bg-page hover:text-ink"
            aria-label="Đóng"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>
  );
}
