"use client";

import { AnimatePresence, motion } from "framer-motion";
import PuzzleCanvas from "./PuzzleCanvas";
import MascotStage from "./MascotStage";
import Timer from "./Timer";
import EventTag from "./EventTag";
import type { GameSettings, MascotClip, Puzzle, PuzzleStage } from "@/lib/types";

/**
 * The puzzle screen. The puzzle itself dominates; everything else is a thin
 * band of chrome at the top and a control bar at the bottom.
 *
 * The mascot occupies its own column in normal flow. Because it is a sibling
 * of the content column rather than an overlay on top of it, it can never
 * cover the revealed answer or the NEXT PUZZLE button — the content simply
 * narrows to make room.
 *
 * No multiple-choice options are ever shown. The audience answers out loud and
 * the facilitator judges.
 */

export default function PuzzleScreen({
  puzzle,
  settings,
  stage,
  hintShown,
  zoomLevel,
  mascotClip,
  onShowHint,
  onZoomOut,
  onReveal,
  onCorrect,
  onNotQuite,
  onNext,
  onSkip,
  onBackToBoxes,
}: {
  puzzle: Puzzle;
  settings: GameSettings;
  stage: PuzzleStage;
  hintShown: boolean;
  zoomLevel: number;
  mascotClip: MascotClip | null;
  onShowHint: () => void;
  onZoomOut: () => void;
  onReveal: () => void;
  onCorrect: () => void;
  onNotQuite: () => void;
  onNext: () => void;
  onSkip: () => void;
  onBackToBoxes: () => void;
}) {
  const revealed = stage !== "solving";
  const showMascot = stage === "judged" && settings.mascotEnabled && mascotClip;
  const canZoomOut = puzzle.type === "zoom" && !revealed && zoomLevel < 3;

  return (
    <div className="flex h-full flex-col px-[2.5vw] py-3">
      {/* ---------------- Top chrome ---------------- */}
      <header className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white">
            Box {puzzle.boxNumber}
          </span>
          <h2
            className="font-black uppercase leading-none tracking-tight text-ren-green"
            style={{ fontSize: "clamp(1rem, 2.4vw, 2.1rem)" }}
          >
            {puzzle.categoryLabel}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          {settings.timerEnabled && (
            // Keyed so a new puzzle (or a changed duration) remounts a fresh
            // clock rather than syncing props into state.
            <Timer
              key={`${puzzle.id}-${settings.timerDuration}`}
              seconds={settings.timerDuration}
              running={stage === "solving"}
            />
          )}
          <EventTag />
        </div>
      </header>

      {/* ---------------- Body: puzzle + mascot column ---------------- */}
      <div className="flex min-h-0 flex-1 gap-[clamp(0.5rem,2vw,2rem)]">
        {/* Content column — narrows when the mascot is on stage */}
        <div className="flex min-w-0 flex-1 flex-col">
          <p
            className="shrink-0 pt-2 text-center font-bold uppercase tracking-[0.2em] text-ink-soft"
            style={{ fontSize: "clamp(0.62rem, 1.15vw, 0.95rem)" }}
          >
            {puzzle.prompt}
          </p>

          {/* The puzzle — the largest thing on the screen */}
          <div className="flex min-h-0 flex-1 items-center justify-center py-[clamp(0.5rem,2vh,2rem)]">
            <PuzzleCanvas
              puzzle={puzzle}
              revealed={revealed}
              zoomLevel={zoomLevel}
            />
          </div>

          {/* Hint */}
          <div className="flex h-[clamp(1.8rem,4.5vh,3rem)] shrink-0 items-center justify-center">
            <AnimatePresence>
              {hintShown && !revealed && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-full border border-amber-300/60 bg-amber-50 px-5 py-1.5 text-center font-semibold text-amber-800"
                  style={{ fontSize: "clamp(0.75rem, 1.5vw, 1.25rem)" }}
                >
                  <span className="mr-2" aria-hidden>
                    💡
                  </span>
                  {puzzle.hint}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* The answer — very large, and never underneath the mascot */}
          <AnimatePresence>
            {revealed && (
              <motion.div
                initial={{ opacity: 0, y: 26, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className="shrink-0 pb-1 text-center"
              >
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* ---------------- Facilitator controls ---------------- */}
          <div className="mt-2 flex shrink-0 flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            {stage === "solving" && (
              <>
                <Button variant="ghost" onClick={onBackToBoxes}>
                  ← Boxes
                </Button>
                <Button
                  variant="secondary"
                  onClick={onShowHint}
                  disabled={hintShown}
                >
                  💡 Hint
                </Button>
                {canZoomOut && (
                  <Button variant="secondary" onClick={onZoomOut}>
                    🔍 Zoom Out ({3 - zoomLevel} left)
                  </Button>
                )}
                <Button variant="primary" onClick={onReveal}>
                  Reveal Answer
                </Button>
                <Button variant="ghost" onClick={onSkip}>
                  Skip ▸
                </Button>
              </>
            )}

            {stage === "revealed" && (
              <>
                <Button variant="correct" onClick={onCorrect}>
                  ✓ Correct
                </Button>
                <Button variant="wrong" onClick={onNotQuite}>
                  ✗ Not Quite
                </Button>
              </>
            )}

            {stage === "judged" && (
              <Button variant="primary" onClick={onNext} autoFocus>
                Next Puzzle →
              </Button>
            )}
          </div>
        </div>

        {/* Mascot column — reserved space, so it overlaps nothing */}
        {showMascot && mascotClip && (
          <div className="flex shrink-0 items-end pb-1">
            <MascotStage clip={mascotClip} />
          </div>
        )}
      </div>
    </div>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "correct" | "wrong";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ren-green text-white border-ren-green-deep hover:bg-ren-green-deep shadow-lift",
  secondary: "bg-white text-ink border-ink/15 hover:bg-ink/[0.04] shadow-panel",
  ghost: "bg-transparent text-ink-soft border-transparent hover:bg-ink/[0.05]",
  correct:
    "bg-ren-green text-white border-ren-green-deep hover:bg-ren-green-deep shadow-lift",
  wrong: "bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-lift",
};

function Button({
  children,
  onClick,
  variant = "secondary",
  disabled = false,
  autoFocus = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: Variant;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      autoFocus={autoFocus}
      className={`rounded-full border-b-4 px-[clamp(0.9rem,2vw,1.9rem)] py-[clamp(0.5rem,1.3vh,0.9rem)] font-black uppercase tracking-wide transition-all active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]}`}
      style={{ fontSize: "clamp(0.7rem, 1.25vw, 1.05rem)" }}
    >
      {children}
    </button>
  );
}
