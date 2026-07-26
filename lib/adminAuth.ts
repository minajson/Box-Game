"use client";

import { loadSettings, patchSettings } from "./storage";

/**
 * The gate on /admin/questions.
 *
 * BE CLEAR ABOUT WHAT THIS IS. The app is a static export with no server, so
 * there is nothing to authenticate against. The PIN lives in localStorage, is
 * compared in the browser, and anyone with devtools can read it in ten seconds.
 * It exists to stop an audience member who wanders over to the facilitator's
 * laptop from editing the question bank mid-session — nothing more.
 *
 * Replace this with real server-side auth before putting the build on a public
 * URL. `PIN_DISCLAIMER` is rendered verbatim in the UI so whoever runs it is
 * told the same thing.
 */

/**
 * Master switch for the PIN gate. The game is currently run internally on a
 * private link, so the gate is off and /admin/questions opens directly. Flip
 * this to `true` to bring the PIN prompt (and the "Lock & exit" button) back —
 * everything below is kept wired up for that.
 */
export const ADMIN_AUTH_ENABLED = false;

const UNLOCK_KEY = "crackthebox.admin.unlocked.v1";

export const PIN_DISCLAIMER =
  "This PIN keeps a curious audience away from the question list on a shared " +
  "facilitator laptop. It is stored in this browser and readable in developer " +
  "tools — it is not security. Do not put this build on a public URL.";

/** False when the admin has cleared the PIN, which disables the gate entirely. */
export function pinRequired(): boolean {
  return loadSettings().adminPin.trim() !== "";
}

export function checkPin(entered: string): boolean {
  const expected = loadSettings().adminPin.trim();
  if (expected === "") return true;
  return entered.trim() === expected;
}

/**
 * Unlocked state lives in sessionStorage, NOT localStorage: it survives a
 * refresh (so the admin is not re-prompted every time they save) but dies with
 * the tab, so closing the laptop lid on a shared machine re-locks it.
 */
export function isUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function unlock(): void {
  try {
    sessionStorage.setItem(UNLOCK_KEY, "1");
  } catch {
    /* Private browsing can refuse — the gate just re-prompts next reload. */
  }
}

export function lock(): void {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* ignore */
  }
}

/** Read-merge-write, so the game tab's settings are not clobbered. */
export function setPin(next: string): void {
  patchSettings({ adminPin: next.trim() });
}

export function currentPin(): string {
  return loadSettings().adminPin;
}
