import Link from "next/link";
import type { ReactNode } from "react";

export function Tile({
  title,
  href,
  children,
  disabled = false,
}: {
  title: string;
  href?: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const content = (
    <div
      className={`h-full rounded-2xl border border-black/10 p-5 shadow-sm transition dark:border-white/10 ${
        disabled ? "opacity-50" : "hover:border-black/20 hover:shadow-md dark:hover:border-white/20"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">{title}</h2>
        {disabled && <span className="text-xs italic text-black/40 dark:text-white/40">coming soon</span>}
      </div>
      {children}
    </div>
  );

  if (!href || disabled) return content;
  return <Link href={href}>{content}</Link>;
}
