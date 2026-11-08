"use client";

import { AnimatePresence, motion } from "framer-motion";
import PuzzleCanvas, { MythFactExplanation } from "./PuzzleCanvas";
import ClickableCanvas, { ClickableExplanation } from "./ClickableCanvas";
import MascotStage from "./MascotStage";
import Timer from "./Timer";
import { GameHeaderSlim } from "./GameHeader";
import { isComplete, pickCount, requiredPicks } from "@/lib/clickable";
import type {
  ClickResponse,
  GameSettings,
  MascotClip,
  Puzzle,
  PuzzleStage,
} from "@/lib/types";

/**
 * The puzzle screen. The puzzle itself dominates; everything else is a thin
 * band of chrome at the top and a control bar at the bottom.
 *
 * The mascot occupies its own column in normal flow. Because it is a sibling
 * of the content column rather than an overlay on top of it, it can never
 * cover the revealed answer or the NEXT PUZZLE button — the content simply
 * narrows to make room.
 *
 * Most types are answered out loud and the facilitator judges. Myth or Fact
 * shows options for the room to call out, not to click. Clickable challenges
 * are the exception: the facilitator clicks the room's choice, presses Submit
 * Answer, and the clicks decide Correct or Not Quite — there is no Reveal step.
 */

export default function PuzzleScreen({
  puzzle,
  settings,
  stage,
  hintShown,
  zoomLevel,
  mascotClip,
  response,
  onResponseChange,
  onSubmit,
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
  /** Clickable challenges only: what has been clicked so far. */
  response: ClickResponse;
  onResponseChange: (next: ClickResponse) => void;
  onSubmit: () => void;
  onShowHint: () => void;
  onZoomOut: () => void;
  onReveal: () => void;
  onCorrect: () => void;
  onNotQuite: () => void;
  onNext: () => void;
  onSkip: () => void;
  onBackToBoxes: () => void;
}) {
  const clickable = puzzle.type === "clickable";
  const checking = stage === "checking";
  const revealed = stage === "revealed" || stage === "judged";
  const showMascot = stage === "judged" && settings.mascotEnabled && mascotClip;
  const zooms = puzzle.type === "zoom" || (clickable && puzzle.sceneZoom === true);
  const canZoomOut = zooms && stage === "solving" && zoomLevel < 3;
  const picked = clickable ? pickCount(puzzle, response) : 0;
  const needed = clickable ? requiredPicks(puzzle) : 0;
  const ready = clickable && isComplete(puzzle, response);
  // A zoomed choice keeps its cards hidden until the last Zoom Out.
  const awaitingZoom = clickable && puzzle.sceneZoom === true && zoomLevel < 3;

  return (
    <div className="flex h-full flex-col px-[2.5vw] py-3">
      {/* ---------------- Top chrome ----------------
          The slim header: the two partner logos sit at the outer edges, sized
          UNDER the category heading's own height so this band does not grow.
          The puzzle keeps every pixel it had before. */}
      <GameHeaderSlim
        left={
          <>
            <span className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white">
              Box {puzzle.boxNumber}
            </span>
            <h2
              className="truncate font-black uppercase leading-none tracking-tight text-ren-green"
              style={{ fontSize: "clamp(1rem, 2.4vw, 2.1rem)" }}
            >
              {puzzle.categoryLabel}
            </h2>
          </>
        }
        right={
          settings.timerEnabled ? (
            // Keyed so a new puzzle (or a changed duration) remounts a fresh
            // clock rather than syncing props into state.
            <Timer
              key={`${puzzle.uid ?? puzzle.id}-${settings.timerDuration}`}
              seconds={settings.timerDuration}
              running={stage === "solving"}
            />
          ) : null
        }
      />

      {/* ---------------- Body: puzzle + mascot column ---------------- */}
      <div className="flex min-h-0 flex-1 gap-[clamp(0.5rem,2vw,2rem)]">
        {/* Content column — narrows when the mascot is on stage */}
        <div className="flex min-w-0 flex-1 flex-col">
          {clickable ? (
            // The challenge question is what the room argues about, so it reads
            // as a headline rather than a caption.
            <p
              className="shrink-0 text-balance pt-2 text-center font-black leading-tight tracking-tight text-ink"
              style={{ fontSize: "clamp(1.1rem, min(2.4vw, 4.2vh), 4.4rem)" }}
            >
              {puzzle.prompt}
            </p>
          ) : (
            <p
              className="shrink-0 pt-2 text-center font-bold uppercase tracking-[0.2em] text-ink-soft"
              style={{ fontSize: "clamp(0.62rem, 1.15vw, 1.2rem)" }}
            >
              {puzzle.prompt}
            </p>
          )}

          {/* The puzzle — the largest thing on the screen */}
          <div className="flex min-h-0 flex-1 items-center justify-center py-[clamp(0.5rem,2vh,2rem)]">
            {clickable ? (
              <ClickableCanvas
                puzzle={puzzle}
                response={response}
                onChange={onResponseChange}
                phase={revealed ? "revealed" : checking ? "checking" : "solving"}
                zoomLevel={zoomLevel}
              />
            ) : (
              <PuzzleCanvas
                puzzle={puzzle}
                revealed={revealed}
                zoomLevel={zoomLevel}
              />
            )}
          </div>

          {/* Hint. Its row is reserved so showing it does not shift the puzzle,
              but a revealed clickable challenge hands that height to the photo
              or cards, which have to stay readable beside the explanation. */}
          <div
            className={`flex shrink-0 items-center justify-center ${
              clickable && revealed ? "h-0" : "h-[clamp(1.8rem,4.5vh,3rem)]"
            }`}
          >
            <AnimatePresence>
              {hintShown && stage === "solving" && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-full border border-amber-300/60 bg-amber-50 px-5 py-1.5 text-center font-semibold text-amber-800"
                  style={{ fontSize: "clamp(0.75rem, 1.5vw, 1.6rem)" }}
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
                {puzzle.type === "myth-fact" ? (
                  // The highlighted card already shows the answer.
                  <MythFactExplanation puzzle={puzzle} />
                ) : clickable ? (
                  <ClickableExplanation puzzle={puzzle} />
                ) : (
                  <>
                    <p className="mb-1 text-[11px] font-black uppercase tracking-[0.3em] text-ink-soft">
                      The answer is
                    </p>
                    <p
                      className="font-black uppercase leading-[0.95] tracking-tight text-ren-green"
                      style={{ fontSize: "clamp(1.8rem, 5.4vw, 7rem)" }}
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* ---------------- Facilitator controls ---------------- */}
          <div className="mt-2 flex shrink-0 flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            {/* Always present, whatever the stage — the facilitator must never
                be stranded on a puzzle without a way back to the wall. */}
            <Button variant="ghost" onClick={onBackToBoxes}>
              ← Boxes
            </Button>

            {stage === "solving" && (
              <>
                {puzzle.hint && (
                  <Button
                    variant="secondary"
                    onClick={onShowHint}
                    disabled={hintShown}
                  >
                    💡 Hint
                  </Button>
                )}
                {canZoomOut && (
                  <Button variant={awaitingZoom ? "primary" : "secondary"} onClick={onZoomOut}>
                    🔍 Zoom Out ({3 - zoomLevel} left)
                  </Button>
                )}
                {clickable ? (
                  <>
                    {picked > 0 && (
                      <Button variant="ghost" onClick={() => onResponseChange({ picks: [], marks: [] })}>
                        ↺ Clear
                      </Button>
                    )}
                    {!awaitingZoom && (
                      <Button variant="primary" onClick={onSubmit} disabled={!ready}>
                        {ready
                          ? "Submit Answer ✓"
                          : `Submit Answer (${picked}/${needed})`}
                      </Button>
                    )}
                  </>
                ) : (
                  <Button variant="primary" onClick={onReveal}>
                    Reveal Answer
                  </Button>
                )}
                <Button variant="ghost" onClick={onSkip}>
                  Skip ▸
                </Button>
              </>
            )}

            {checking && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: [1, 1.06, 1] }}
                transition={{ scale: { duration: 0.6, repeat: Infinity } }}
                className="rounded-full bg-ink px-[clamp(1rem,2.4vw,2.4rem)] py-[clamp(0.5rem,1.3vh,0.9rem)] font-black uppercase tracking-[0.2em] text-white shadow-lift"
                style={{ fontSize: "clamp(0.7rem, 1.25vw, 1.05rem)" }}
              >
                Locking it in…
              </motion.p>
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
                {clickable ? "Next Box →" : "Next Puzzle →"}
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
