"use client";

import Link from "next/link";
import type { ReactNode } from "react";

// Pinned to the top of the page so "← Home" stays reachable without scrolling back up —
// especially useful once the app is installed to a phone home screen and there's no
// browser back button to fall back on. `badge` is a compact score indicator (a small
// ScoreRing, or the Relationships letter grade) shown alongside the title.
export function PageHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle: string;
  badge?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-6 mb-8 flex items-center justify-between gap-3 border-b border-black/10 bg-background px-6 pt-3 pb-3 shadow-[0_6px_12px_-10px_rgba(0,0,0,0.35)] dark:border-white/10">
      <div className="min-w-0">
        <Link
          href="/"
          className="mb-1 inline-block text-sm text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80"
        >
          ← Home
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-black/60 dark:text-white/60">{subtitle}</p>
      </div>
      {badge}
    </div>
  );
}
