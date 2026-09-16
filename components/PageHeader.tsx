"use client";

import Link from "next/link";

// Pinned to the top of the page so "← Home" stays reachable without scrolling back up —
// especially useful once the app is installed to a phone home screen and there's no
// browser back button to fall back on.
export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="sticky top-0 z-10 -mx-6 mb-8 border-b border-black/10 bg-background px-6 pt-3 pb-3 shadow-[0_6px_12px_-10px_rgba(0,0,0,0.35)] dark:border-white/10">
      <Link
        href="/"
        className="mb-1 inline-block text-sm text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80"
      >
        ← Home
      </Link>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-black/60 dark:text-white/60">{subtitle}</p>
    </div>
  );
}
