"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import PuzzleCanvas, { MythFactExplanation } from "@/components/PuzzleCanvas";
import type { ManagedPuzzle } from "@/lib/types";
import type { ValidationResult } from "@/lib/puzzleValidation";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { Btn, Callout, IconBtn } from "./ui";

/**
 * "What the room will see" — the real PuzzleCanvas, at real proportions.
 *
 * THE SCALING TRICK, AND WHY IT IS NECESSARY
 * ------------------------------------------
 * PuzzleCanvas sizes everything in `vw`/`vh` clamps, because on a projector the
 * puzzle must fill the wall. Those units are VIEWPORT-relative, not
 * container-relative, so simply dropping the canvas into a 480px side panel
 * renders text sized for a 1440px screen and it bursts out of the box. No media
 * query or container query can fix it: the units are baked into inline styles.
 *
 * So we render the canvas inside a box that is exactly ONE VIEWPORT
 * (100vw × 100vh) and then `transform: scale()` the whole thing down to the
 * panel's width. Every `vw` inside resolves exactly as it does in the live game,
 * and the result is a true miniature rather than an approximation.
 *
 * The scaled subtree is `aria-hidden`: it is a picture of a screen, and every
 * word in it is already present in the form fields next to it. A screen-reader
 * user gets the summary line instead.
 */

function useViewport() {
  const [vp, setVp] = useState({ w: 1440, h: 900 });
  useLayoutEffect(() => {
    const sync = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);
  return vp;
}

/** The framing around the canvas, mirroring components/PuzzleScreen.tsx. */
function Stage({
  puzzle,
  revealed,
  zoomLevel,
  hintShown,
}: {
  puzzle: ManagedPuzzle;
  revealed: boolean;
  zoomLevel: number;
  hintShown: boolean;
}) {
  return (
    <div className="flex h-full flex-col px-[2.5vw] py-3">
      <div className="flex shrink-0 items-center gap-3">
        <span className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white">
          Box {puzzle.boxNumber}
        </span>
        <h2
          className="truncate font-black uppercase leading-none tracking-tight text-ren-green"
          style={{ fontSize: "clamp(1rem, 2.4vw, 2.1rem)" }}
        >
          {puzzle.categoryLabel}
        </h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <p
          className="shrink-0 pt-2 text-center font-bold uppercase tracking-[0.2em] text-ink-soft"
          style={{ fontSize: "clamp(0.62rem, 1.15vw, 0.95rem)" }}
        >
          {puzzle.prompt}
        </p>

        <div className="flex min-h-0 flex-1 items-center justify-center py-[clamp(0.5rem,2vh,2rem)]">
          <PuzzleCanvas puzzle={puzzle} revealed={revealed} zoomLevel={zoomLevel} />
        </div>

        <div className="flex h-[clamp(1.8rem,4.5vh,3rem)] shrink-0 items-center justify-center">
          {hintShown && !revealed && (
            <p
              className="rounded-full border border-amber-300/60 bg-amber-50 px-5 py-1.5 text-center font-semibold text-amber-800"
              style={{ fontSize: "clamp(0.75rem, 1.5vw, 1.25rem)" }}
            >
              <span className="mr-2" aria-hidden>
                💡
              </span>
              {puzzle.hint}
            </p>
          )}
        </div>

        {revealed && (
          <div className="shrink-0 pb-1 text-center">
            {puzzle.type === "myth-fact" ? (
              <MythFactExplanation puzzle={puzzle} />
            ) : (
              <>
                <p className="mb-1 text-[11px] font-black uppercase tracking-[0.3em] text-ink-soft">
                  The answer is
                </p>
                <p
                  className="font-black uppercase leading-[0.95] tracking-tight text-ren-green"
                  style={{ fontSize: "clamp(1.8rem, 5.4vw, 5.5rem)" }}
                >
                  {puzzle.answer}
                </p>
                {puzzle.insight && (
                  <p
                    className="mx-auto mt-1.5 max-w-[46ch] font-semibold italic text-ink-soft"
                    style={{ fontSize: "clamp(0.7rem, 1.25vw, 1.05rem)" }}
                  >
                    {puzzle.insight}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PreviewStage({
  puzzle,
  result,
  variant = "panel",
  onClose,
}: {
  puzzle: ManagedPuzzle;
  result?: ValidationResult;
  /** "panel" sits inside the editor; "overlay" is the full-screen modal. */
  variant?: "panel" | "overlay";
  onClose?: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [replay, setReplay] = useState(0);
  const [expanded, setExpanded] = useState(variant === "overlay");

  const holder = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(0);
  const vp = useViewport();

  const close = useCallback(() => {
    if (variant === "overlay") onClose?.();
    else setExpanded(false);
  }, [variant, onClose]);

  useFocusTrap(overlay, expanded, close);

  // Measure the holder so the scale factor tracks the panel, not the window.
  useEffect(() => {
    const node = holder.current;
    if (!node || expanded) return;
    const ro = new ResizeObserver(([entry]) => {
      setPanelWidth(entry.contentRect.width);
    });
    ro.observe(node);
    setPanelWidth(node.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [expanded]);

  const renderable = result?.renderable ?? true;
  const blockers = result?.errors.filter((e) => e.blocksPreview) ?? [];

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <Btn
        size="sm"
        tone={revealed ? "primary" : "neutral"}
        onClick={() => setRevealed((v) => !v)}
        aria-pressed={revealed}
      >
        {revealed ? "Answer shown" : "Show answer"}
      </Btn>
      <Btn
        size="sm"
        tone={hintShown ? "amber" : "neutral"}
        onClick={() => setHintShown((v) => !v)}
        aria-pressed={hintShown}
        disabled={revealed}
      >
        Hint
      </Btn>

      {puzzle.type === "zoom" && (
        <span className="inline-flex items-center gap-1 rounded-xl border border-ink/12 bg-white px-2 py-1">
          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-ink-soft">
            Zoom {zoomLevel}
          </span>
          <IconBtn
            label="Zoom in"
            disabled={zoomLevel <= 0}
            onClick={() => setZoomLevel((z) => Math.max(0, z - 1))}
            size="sm"
          >
            −
          </IconBtn>
          <IconBtn
            label="Zoom out"
            disabled={zoomLevel >= 3}
            onClick={() => setZoomLevel((z) => Math.min(3, z + 1))}
            size="sm"
          >
            +
          </IconBtn>
        </span>
      )}

      {/* Framer entry animations only run on mount, so replay = remount. */}
      <Btn size="sm" onClick={() => setReplay((n) => n + 1)}>
        Replay
      </Btn>

      {variant === "panel" && (
        <Btn size="sm" onClick={() => setExpanded(true)}>
          Full screen
        </Btn>
      )}
    </div>
  );

  const scaled = (width: number) => (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 origin-top-left"
      style={{
        // Exactly one viewport, then shrunk to the panel — so every vw/vh inside
        // PuzzleCanvas resolves to the same value it would on the projector.
        width: `${vp.w}px`,
        height: `${vp.h}px`,
        transform: `scale(${width / vp.w})`,
      }}
    >
      <Stage
        key={replay}
        puzzle={puzzle}
        revealed={revealed}
        zoomLevel={zoomLevel}
        hintShown={hintShown}
      />
    </div>
  );

  const summary = (
    <p className="sr-only">
      Preview of the projected screen for “{puzzle.answer}”.{" "}
      {revealed ? "The answer is shown." : "The answer is hidden."} All of its
      text is editable in the fields on this page.
    </p>
  );

  /* --------------------------------------------------------- full screen -- */
  if (expanded) {
    return (
      <div
        ref={overlay}
        role="dialog"
        aria-modal="true"
        aria-label={`Full screen preview: ${puzzle.answer}`}
        tabIndex={-1}
        className="fixed inset-0 z-[100] flex flex-col bg-white"
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-ink/10 px-4 py-2.5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-ink-soft">
            Preview · what the room sees
          </p>
          <div className="flex items-center gap-2">
            {controls}
            <Btn size="sm" tone="neutral" data-autofocus onClick={close}>
              Close
            </Btn>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          {renderable ? (
            <Stage
              key={replay}
              puzzle={puzzle}
              revealed={revealed}
              zoomLevel={zoomLevel}
              hintShown={hintShown}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <Callout tone="error" title="Not ready to preview" className="max-w-md">
                <ul className="list-disc space-y-1 pl-4">
                  {blockers.map((b, i) => (
                    <li key={i}>{b.message}</li>
                  ))}
                </ul>
              </Callout>
            </div>
          )}
        </div>
        {summary}
      </div>
    );
  }

  /* --------------------------------------------------------------- panel -- */
  const height = panelWidth * (vp.h / vp.w);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink-soft">
          Preview
        </p>
      </div>

      {controls}

      <div
        ref={holder}
        className="relative w-full overflow-hidden rounded-xl border border-ink/12 bg-white shadow-panel"
        style={{ height: height > 0 ? `${height}px` : "12rem" }}
      >
        {!renderable ? (
          <div className="absolute inset-0 overflow-auto p-3">
            <Callout tone="error" title="Not ready to preview">
              <ul className="list-disc space-y-1 pl-4">
                {blockers.map((b, i) => (
                  <li key={i}>{b.message}</li>
                ))}
              </ul>
            </Callout>
          </div>
        ) : panelWidth > 0 ? (
          scaled(panelWidth)
        ) : null}
      </div>

      {summary}

      <p className="text-[11px] leading-relaxed text-ink-soft">
        Scaled to fit. Open <strong>Full screen</strong> to check it at the size
        the audience will actually see.
      </p>
    </div>
  );
}
