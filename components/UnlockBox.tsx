"use client";

import { useEffect, useState } from "react";
import { clearWriteSecret, hasWriteSecret, saveWriteSecret } from "@/lib/writeSecret";

/**
 * Unlock box for the dashboard's own log boxes. The write routes require
 * the `x-dashboard-secret` header; this stores the secret in the browser
 * (localStorage, so it survives reopening the app) and every client write
 * goes through writeFetch, which attaches it. Enter once per browser —
 * it is not asked for again on each submit.
 *
 * Shown in the sticky page header on every pillar page and on the home
 * page, so it is always visible where logging happens.
 */
export function UnlockBox() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [secret, setSecret] = useState("");

  // localStorage only exists in the browser — read after mount so the
  // server render and the first client render match.
  useEffect(() => {
    setUnlocked(hasWriteSecret());
  }, []);

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!secret.trim()) return;
    saveWriteSecret(secret);
    setSecret("");
    setUnlocked(true);
  }

  function handleLock() {
    clearWriteSecret();
    setUnlocked(false);
  }

  if (unlocked === null) {
    // Not yet known (first render) — keep the header layout stable.
    return <div className="h-9 w-36" aria-hidden="true" />;
  }

  if (unlocked) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Unlocked</span>
        <button
          type="button"
          onClick={handleLock}
          className="rounded-lg border border-black/20 px-2.5 py-1.5 text-xs font-medium dark:border-white/20"
        >
          Lock
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleUnlock} className="flex items-center gap-2">
      <input
        type="password"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        placeholder="Write secret"
        autoComplete="off"
        aria-label="Dashboard write secret"
        className="w-28 rounded-lg border border-black/15 bg-transparent px-2.5 py-1.5 text-xs sm:w-36 dark:border-white/15"
      />
      <button
        type="submit"
        disabled={!secret.trim()}
        className="rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
      >
        Unlock
      </button>
    </form>
  );
}
