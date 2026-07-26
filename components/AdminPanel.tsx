"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameSettings, MascotGender, PuzzleStage, Screen } from "@/lib/types";

/**
 * Facilitator controls. Lives behind a small gear in the corner so it never
 * eats into the projected game, and closes back to nothing.
 *
 * The game-flow buttons here mirror the on-screen controls — handy when the
 * facilitator is driving from a laptop while the audience watches the wall.
 *
 * Question editing deliberately does NOT live here: this drawer can be opened
 * on the projected game, so it only ever links out to /admin/questions.
 */

/** Offered session lengths. Anything above the active count is capped anyway. */
const SESSION_LENGTHS = [5, 10, 15, 20, 25, 30, 40, 50];

export default function AdminPanel({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  screen,
  stage,
  boxes,
  openedBoxes,
  activeCount,
  onOpenBox,
  onShowHint,
  onReveal,
  onCorrect,
  onNotQuite,
  onNext,
  onSkip,
  onBackToBoxes,
  onReset,
  onPreviewMascot,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: GameSettings;
  onSettingsChange: (patch: Partial<GameSettings>) => void;
  screen: Screen;
  stage: PuzzleStage;
  /** Box numbers currently on the wall (one per active question). */
  boxes: number[];
  openedBoxes: number[];
  /** How many questions are active — same as boxes.length, named for clarity. */
  activeCount: number;
  onOpenBox: (n: number) => void;
  onShowHint: () => void;
  onReveal: () => void;
  onCorrect: () => void;
  onNotQuite: () => void;
  onNext: () => void;
  onSkip: () => void;
  onBackToBoxes: () => void;
  onReset: () => void;
  onPreviewMascot: (gender: MascotGender) => void;
}) {
  const [boxToOpen, setBoxToOpen] = useState<number | "">("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  };

  const available = boxes.filter((n) => !openedBoxes.includes(n));

  const onPuzzle = screen === "puzzle";

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label="Facilitator controls"
        className="fixed bottom-4 left-4 z-[80] flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-white/90 text-ink shadow-panel backdrop-blur transition hover:bg-white"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[85] bg-ink/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onOpenChange(false)}
            />
            <motion.aside
              initial={{ x: -380 }}
              animate={{ x: 0 }}
              exit={{ x: -380 }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed inset-y-0 left-0 z-[90] flex w-[min(360px,90vw)] flex-col overflow-y-auto border-r border-ink/10 bg-white shadow-lift"
            >
              <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
                <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink">
                  Facilitator
                </h2>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-full px-2 py-1 text-lg font-bold leading-none text-ink-soft hover:bg-ink/5"
                  aria-label="Close facilitator controls"
                >
                  ×
                </button>
              </div>

              <div className="flex flex-col gap-6 p-5">
                {/* Flow */}
                <Section title="Game flow">
                  <div className="grid grid-cols-2 gap-2">
                    <Action
                      onClick={onShowHint}
                      disabled={!onPuzzle || stage !== "solving"}
                    >
                      Show hint
                    </Action>
                    <Action
                      onClick={onReveal}
                      disabled={!onPuzzle || stage !== "solving"}
                    >
                      Reveal answer
                    </Action>
                    <Action
                      onClick={onCorrect}
                      disabled={!onPuzzle || stage !== "revealed"}
                      tone="green"
                    >
                      Mark correct
                    </Action>
                    <Action
                      onClick={onNotQuite}
                      disabled={!onPuzzle || stage !== "revealed"}
                      tone="amber"
                    >
                      Mark not quite
                    </Action>
                    <Action
                      onClick={onNext}
                      disabled={!onPuzzle || stage !== "judged"}
                    >
                      Next puzzle
                    </Action>
                    <Action onClick={onSkip} disabled={!onPuzzle}>
                      Skip puzzle
                    </Action>
                    <Action
                      onClick={onBackToBoxes}
                      disabled={screen === "boxes"}
                    >
                      Return to boxes
                    </Action>
                    <Action onClick={toggleFullscreen}>
                      {isFullscreen ? "Exit full screen" : "Full screen"}
                    </Action>
                  </div>
                </Section>

                {/* Open a specific box */}
                <Section title="Open a box">
                  <div className="flex gap-2">
                    <select
                      value={boxToOpen}
                      onChange={(e) =>
                        setBoxToOpen(e.target.value ? Number(e.target.value) : "")
                      }
                      className="min-w-0 flex-1 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink"
                    >
                      <option value="">Select a box…</option>
                      {available.map((n) => (
                        <option key={n} value={n}>
                          Box {n}
                        </option>
                      ))}
                    </select>
                    <Action
                      onClick={() => {
                        if (boxToOpen !== "") {
                          onOpenBox(Number(boxToOpen));
                          setBoxToOpen("");
                          onOpenChange(false);
                        }
                      }}
                      disabled={boxToOpen === "" || screen !== "boxes"}
                      tone="green"
                    >
                      Open
                    </Action>
                  </div>
                  {screen !== "boxes" && (
                    <p className="mt-1.5 text-xs text-ink-soft">
                      Return to the boxes first.
                    </p>
                  )}
                </Section>

                {/* Questions — a link out, never editing controls in here.
                    Add / edit / delete lives behind the admin route so it can
                    never appear on the projected game. */}
                <Section title="Questions">
                  <a
                    href="/admin/questions"
                    target="_blank"
                    rel="noopener"
                    className="block rounded-xl border border-ink/12 bg-white px-3 py-2 text-center text-xs font-bold text-ink transition hover:bg-ink/[0.04]"
                  >
                    Manage questions ↗
                  </a>

                  <label className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-ink-soft">
                    Questions per session
                    <select
                      value={settings.questionsPerSession}
                      onChange={(e) =>
                        onSettingsChange({
                          questionsPerSession: Number(e.target.value),
                        })
                      }
                      className="rounded-lg border border-ink/15 bg-white px-2 py-1 text-sm font-bold text-ink"
                    >
                      <option value={0}>All active</option>
                      {SESSION_LENGTHS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>

                  <p className="mt-1.5 text-xs text-ink-soft">
                    {activeCount} question{activeCount === 1 ? "" : "s"} active.
                  </p>

                  {settings.questionsPerSession > activeCount && (
                    <p
                      role="status"
                      className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700"
                    >
                      Session length is {settings.questionsPerSession} but only{" "}
                      {activeCount} question{activeCount === 1 ? " is" : "s are"}{" "}
                      active — the wall will show {activeCount}.
                    </p>
                  )}
                </Section>

                {/* Toggles */}
                <Section title="Settings">
                  <Toggle
                    label="Timer"
                    checked={settings.timerEnabled}
                    onChange={(v) => onSettingsChange({ timerEnabled: v })}
                  />
                  {settings.timerEnabled && (
                    <label className="mt-1 flex items-center justify-between gap-3 pl-1 text-xs font-semibold text-ink-soft">
                      Seconds per puzzle
                      <input
                        type="number"
                        min={10}
                        max={300}
                        step={5}
                        value={settings.timerDuration}
                        onChange={(e) =>
                          onSettingsChange({
                            timerDuration: Math.max(
                              10,
                              Math.min(300, Number(e.target.value) || 60),
                            ),
                          })
                        }
                        className="w-20 rounded-lg border border-ink/15 px-2 py-1 text-right text-sm font-bold text-ink"
                      />
                    </label>
                  )}
                  <Toggle
                    label="Background music"
                    checked={settings.musicEnabled}
                    onChange={(v) => onSettingsChange({ musicEnabled: v })}
                  />
                  {settings.musicEnabled && (
                    <label className="mt-1 flex items-center justify-between gap-3 pl-1 text-xs font-semibold text-ink-soft">
                      Music volume
                      <input
                        type="range"
                        min={0.02}
                        max={0.4}
                        step={0.01}
                        value={settings.musicVolume}
                        onChange={(e) =>
                          onSettingsChange({ musicVolume: Number(e.target.value) })
                        }
                        className="w-28 accent-[var(--color-ren-green)]"
                      />
                    </label>
                  )}
                  <Toggle
                    label="Sound effects"
                    checked={settings.soundEnabled}
                    onChange={(v) => onSettingsChange({ soundEnabled: v })}
                  />
                  <Toggle
                    label="Mascot"
                    checked={settings.mascotEnabled}
                    onChange={(v) => onSettingsChange({ mascotEnabled: v })}
                  />
                  <Toggle
                    label="Confetti"
                    checked={settings.confettiEnabled}
                    onChange={(v) => onSettingsChange({ confettiEnabled: v })}
                  />
                </Section>

                {/* Mascot preview */}
                <Section title="Preview mascot">
                  <div className="grid grid-cols-2 gap-2">
                    <Action onClick={() => onPreviewMascot("male")}>
                      Male mascot
                    </Action>
                    <Action onClick={() => onPreviewMascot("female")}>
                      Female mascot
                    </Action>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-soft">
                    Plays the approved clip and voice line. Use this to check the
                    projector and the PA before the session.
                  </p>
                </Section>

                {/* Reset */}
                <Section title="Danger zone">
                  {confirmingReset ? (
                    <div className="flex gap-2">
                      <Action
                        tone="red"
                        onClick={() => {
                          onReset();
                          setConfirmingReset(false);
                          onOpenChange(false);
                        }}
                      >
                        Yes, reset everything
                      </Action>
                      <Action onClick={() => setConfirmingReset(false)}>
                        Cancel
                      </Action>
                    </div>
                  ) : (
                    <Action tone="red" onClick={() => setConfirmingReset(true)}>
                      Reset game
                    </Action>
                  )}
                  <p className="mt-1.5 text-xs text-ink-soft">
                    Closes every box and clears the score.
                  </p>
                </Section>

                <p className="border-t border-ink/8 pt-4 text-xs leading-relaxed text-ink-soft">
                  <strong className="text-ink">Shortcuts:</strong> H hint · R
                  reveal · C correct · X not quite · N next · F full screen ·
                  Esc back to boxes
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-ink-soft">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Action({
  children,
  onClick,
  disabled = false,
  tone = "neutral",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "green" | "amber" | "red";
}) {
  const tones = {
    neutral: "border-ink/12 bg-white text-ink hover:bg-ink/[0.04]",
    green:
      "border-ren-green/30 bg-ren-green-soft text-ren-green-deep hover:bg-ren-green/15",
    amber: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
    red: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-35 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-ren-green" : "bg-ink/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[1.4rem]" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
