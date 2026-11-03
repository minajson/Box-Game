"use client";

import { useState } from "react";
import { BRANDING, type BrandLogoConfig } from "@/lib/branding";

/**
 * The one header used everywhere: partner logo left, game title centred, an
 * optional partner logo right (see lib/branding.ts) — plus optional counters,
 * sound and full-screen controls.
 *
 * Two variants:
 *
 *   full — box wall and results. Logos + centred title + a control cluster,
 *          with counters on their own row underneath.
 *   slim — the puzzle screen. Small logos pinned to the outer edges of the
 *          existing thin band, so the puzzle loses no vertical space.
 *
 * WHY A GRID AND NOT FLEXBOX (the load-bearing detail)
 * ---------------------------------------------------
 * Row one is `minmax(0,1fr) auto minmax(0,1fr)`. The two side tracks are forced
 * to equal width by the `1fr` fraction no matter how much wider one logo is
 * than the other, so the centre track — the title — sits on the true viewport
 * midline. `justify-between` on a flex row would let the title drift toward
 * whichever side carries less content, which is exactly the bug this avoids.
 * `minmax(0, …)` lets the side tracks shrink BELOW their content width at
 * narrow viewports rather than shoving the title off-axis.
 *
 * Counters live on row TWO, a different grid row from the logos, so a logo can
 * never overlap a counter — that is structural, not a near miss.
 */

/** Height ladders. Only height is constrained; width follows the artwork. */
const FULL_LOGO_HEIGHT = "clamp(44px, 5vw, 76px)";
const FULL_LOGO_MAX_WIDTH = "clamp(96px, 16vw, 240px)";
const SLIM_LOGO_HEIGHT = "clamp(26px, 2.6vw, 40px)";
const SLIM_LOGO_MAX_WIDTH = "clamp(64px, 9vw, 132px)";

function BrandLogo({
  logo,
  height,
  maxWidth,
  align,
}: {
  logo: BrandLogoConfig;
  height: string;
  maxWidth: string;
  align: "start" | "end";
}) {
  const [failed, setFailed] = useState(false);

  // A missing file must never show a broken-image glyph on a projector, so we
  // fall back to a plain wordmark at the same visual height.
  if (failed) {
    return (
      <span
        className={`flex items-center ${
          align === "end" ? "justify-end" : "justify-start"
        } font-black uppercase leading-tight tracking-[0.16em] text-ink-soft`}
        style={{ height, maxWidth, fontSize: "clamp(0.55rem, 1vw, 0.8rem)" }}
      >
        {logo.alt}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo.src}
      alt={logo.alt}
      width={logo.width}
      height={logo.height}
      decoding="async"
      onError={() => setFailed(true)}
      className="game-header-logo w-auto shrink-0 object-contain"
      style={{ height, maxWidth }}
    />
  );
}

/* ------------------------------------------------------------------ full -- */

export function GameHeaderFull({
  title,
  subtitle,
  actions,
  below,
  className = "",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Sound / full-screen controls; sits beside the right-hand logo. */
  actions?: React.ReactNode;
  /** Counters row — always its own grid row, never beside the logos. */
  below?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={className}>
      {/* Row 1 — logos + centred title.
          Mobile stacks (title above a logo row) then upgrades to the 3-track
          grid at sm; both logos stay visible and in normal flow either way, so
          they cannot overlap or crop. */}
      <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-[clamp(0.5rem,2vw,2rem)]">
        {/* Title first in the DOM on mobile so it reads before the logos. */}
        <div className="order-1 min-w-0 text-center sm:order-2 sm:justify-self-center">
          {title}
          {subtitle}
        </div>

        {/* Mobile: one row holding [left logo] [controls] [right logo].
            Desktop: these two halves split into the outer grid tracks. */}
        <div className="order-2 flex items-center justify-between gap-3 sm:contents">
          <div className="flex min-w-0 items-center sm:order-1 sm:justify-self-start">
            <BrandLogo
              logo={BRANDING.left}
              height={FULL_LOGO_HEIGHT}
              maxWidth={FULL_LOGO_MAX_WIDTH}
              align="start"
            />
          </div>

          <div className="flex min-w-0 items-center justify-end gap-[clamp(0.5rem,1.2vw,1rem)] sm:order-3 sm:justify-self-end">
            {actions}
            {BRANDING.right && (
              <BrandLogo
                logo={BRANDING.right}
                height={FULL_LOGO_HEIGHT}
                maxWidth={FULL_LOGO_MAX_WIDTH}
                align="end"
              />
            )}
          </div>
        </div>
      </div>

      {below}
    </header>
  );
}

/* ------------------------------------------------------------------ slim -- */

export function GameHeaderSlim({
  left,
  right,
  className = "",
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={`flex shrink-0 items-center gap-[clamp(0.5rem,1.5vw,1.25rem)] ${className}`}
    >
      <BrandLogo
        logo={BRANDING.left}
        height={SLIM_LOGO_HEIGHT}
        maxWidth={SLIM_LOGO_MAX_WIDTH}
        align="start"
      />

      <div className="flex min-w-0 flex-1 items-center gap-3">{left}</div>

      <div className="flex min-w-0 items-center justify-end gap-3">{right}</div>

      {BRANDING.right && (
        <BrandLogo
          logo={BRANDING.right}
          height={SLIM_LOGO_HEIGHT}
          maxWidth={SLIM_LOGO_MAX_WIDTH}
          align="end"
        />
      )}
    </header>
  );
}
