"use client";

import { useEffect, useState } from "react";

/**
 * Full-screen toggle for the header. Deliberately the same 36×36 pill as the
 * sound toggles in SoundControl so the control cluster reads as one unit.
 *
 * The `f` keyboard shortcut in app/page.tsx does the same thing; this is the
 * pointer-user's route to it.
 */
export default function FullscreenControl() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  };

  const label = isFullscreen ? "Exit full screen" : "Enter full screen";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isFullscreen}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
        isFullscreen
          ? "border-ren-green/30 bg-ren-green-soft text-ren-green-deep"
          : "border-ink/12 bg-white text-ink-soft"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
        {isFullscreen ? (
          <path
            d="M9 3v6H3m12-6v6h6M9 21v-6H3m12 6v-6h6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : (
          <path
            d="M3 9V3h6M21 9V3h-6M3 15v6h6m12-6v6h-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </svg>
    </button>
  );
}
