import type { ReactNode } from "react";

/**
 * InfoTip — dấu (?) nhỏ, rê chuột vào thì hiện hộp giải thích cách tính.
 * Chỉ dùng CSS (group-hover) nên không cần state.
 */
export default function InfoTip({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  const position = align === "right" ? "right-0" : "left-0";
  return (
    <span className="group relative inline-flex align-middle">
      <span
        tabIndex={0}
        className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-line text-xs font-semibold text-muted group-hover:border-accent group-hover:text-accent"
        aria-label="Cách tính"
      >
        ?
      </span>
      <span
        role="tooltip"
        className={`pointer-events-none absolute top-6 z-30 hidden w-72 rounded-lg border border-line bg-white p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-ink-2 shadow-lg group-hover:block group-focus-within:block ${position}`}
      >
        {children}
      </span>
    </span>
  );
}
