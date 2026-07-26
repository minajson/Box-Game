"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Query-string routing for the question admin.
 *
 * WHY NOT next/navigation
 * ----------------------
 * Two hard constraints, both from `output: "export"` in next.config.ts:
 *
 * 1. `/admin/questions/[id]/edit` cannot exist. A dynamic segment needs
 *    `generateStaticParams()` at build time, and the ids belong to questions
 *    that live in the visitor's localStorage — the build cannot know them. There
 *    is no server and no ISR to fall back on. So the editor is a VIEW of one
 *    static route, addressed by query string.
 *
 * 2. `useSearchParams()` opts the page into client-side bailout and, in a
 *    statically exported route, fails the build unless it is wrapped in a
 *    Suspense boundary. Reading `window.location.search` ourselves through
 *    `useSyncExternalStore` avoids the whole problem and costs about 30 lines.
 *
 * Back/forward still work: `go()` pushes real history entries and we subscribe
 * to `popstate`.
 */

export type AdminView = "list" | "new" | "edit" | "import";

export interface AdminRoute {
  view: AdminView;
  /** The question being edited, for view === "edit". */
  uid?: string;
}

const VIEWS: AdminView[] = ["list", "new", "edit", "import"];

/** pushState/replaceState do not fire popstate, so we announce our own. */
const NAVIGATED = "crackthebox:adminnavigate";

function parse(search: string): AdminRoute {
  const params = new URLSearchParams(search);
  const raw = params.get("v");
  const view = (VIEWS as string[]).includes(raw ?? "") ? (raw as AdminView) : "list";
  const uid = params.get("uid") ?? undefined;

  // An edit link with no uid is a dead end — fall back to the list rather than
  // rendering an editor with nothing in it.
  if (view === "edit" && !uid) return { view: "list" };
  return uid ? { view, uid } : { view };
}

function toSearch(route: AdminRoute): string {
  const params = new URLSearchParams();
  if (route.view !== "list") params.set("v", route.view);
  if (route.uid && route.view === "edit") params.set("uid", route.uid);
  const q = params.toString();
  return q ? `?${q}` : "";
}

function subscribe(cb: () => void): () => void {
  window.addEventListener("popstate", cb);
  window.addEventListener(NAVIGATED, cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener(NAVIGATED, cb);
  };
}

/**
 * The raw search string is the snapshot, not the parsed object: getSnapshot must
 * return a stable value between writes or useSyncExternalStore loops forever,
 * and a fresh object every call would never compare equal.
 */
function getSnapshot(): string {
  return window.location.search;
}

function getServerSnapshot(): string {
  return "";
}

export function useAdminRoute(): {
  route: AdminRoute;
  go: (next: AdminRoute, opts?: { replace?: boolean }) => void;
} {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const go = useCallback((next: AdminRoute, opts?: { replace?: boolean }) => {
    const url = `${window.location.pathname}${toSearch(next)}`;
    if (opts?.replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    window.dispatchEvent(new Event(NAVIGATED));
  }, []);

  return { route: parse(search), go };
}
