"use client";

import type { ManagedPuzzle } from "./types";

/** Browser file in/out. Nothing here touches the question model. */

export function downloadText(
  filename: string,
  text: string,
  mime = "text/plain;charset=utf-8",
): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsText(file);
  });
}

export function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

/**
 * Roughly how much localStorage the bank occupies.
 *
 * Only an estimate: browsers store strings as UTF-16, so the real cost is closer
 * to 2 bytes per character, but the number is only used to warn an admin that
 * they are approaching the ~5 MiB origin quota before `saveBank` starts failing.
 */
export function estimateBankBytes(bank: ManagedPuzzle[]): number {
  try {
    return JSON.stringify(bank).length;
  } catch {
    return 0;
  }
}

/** Today as YYYY-MM-DD, for export filenames. */
export function dateStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
