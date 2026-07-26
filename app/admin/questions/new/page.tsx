"use client";

import { useEffect } from "react";

/**
 * /admin/questions/new — a convenience URL only.
 *
 * The real create view is `/admin/questions?v=new`. This static route exists so
 * the documented path works if someone types it or bookmarks it; it swaps itself
 * for the query-string form with `replaceState`, so the Back button does not
 * bounce between the two.
 *
 * There is no `/admin/questions/[id]/edit` equivalent — a dynamic segment cannot
 * be statically exported for ids that only exist in the visitor's localStorage.
 * Use `?v=edit&uid=<uid>`.
 */
export default function NewQuestionRedirect() {
  useEffect(() => {
    window.history.replaceState(null, "", "/admin/questions?v=new");
    // A full navigation, not a router push: this route's only job is to hand
    // over to the real one, and the target reads the query string on mount.
    window.location.replace("/admin/questions?v=new");
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <p className="text-sm font-black uppercase tracking-[0.3em] text-ink-soft">
        Opening…
      </p>
    </main>
  );
}
