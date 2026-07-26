"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

import BoxWall from "@/components/BoxWall";
import BoxOpening from "@/components/BoxOpening";
import PuzzleScreen from "@/components/PuzzleScreen";
import ResultsScreen from "@/components/ResultsScreen";
import AdminPanel from "@/components/AdminPanel";
import MascotStage from "@/components/MascotStage";
import Confetti from "@/components/Confetti";

import {
  bankSignature,
  loadBank,
  puzzleForBox,
  selectActive,
  useActivePuzzles,
} from "@/lib/puzzleStore";
import { pickClip, otherGender, preloadTargets } from "@/lib/mascots";
import { sound } from "@/lib/sound";
import {
  initialGameState,
  loadSettings,
  loadState,
  saveSettings,
  saveState,
  clearState,
} from "@/lib/storage";
import type {
  GameSettings,
  GameState,
  Judgement,
  MascotClip,
  MascotGender,
  PuzzleStage,
  Screen,
} from "@/lib/types";

/** Never emits — we only want the server/client snapshot split. */
const subscribeNoop = () => () => {};

/**
 * Restore the saved session, reconciling it against the current question set.
 *
 * `openedBoxes` and `outcomes` are keyed by BOX NUMBER, and box numbers are
 * derived from the admin's question order. If the bank changed since the
 * session was saved, box 7 is a different question now — so the restored score
 * would silently attach to questions nobody played. Start clean and say so.
 *
 * Runs inside a `useState` initialiser: on the server it sees no localStorage,
 * returns a fresh session, and the page paints the splash until hydration.
 */
function restoreSession(): { state: GameState; wasReset: boolean } {
  const settings = loadSettings();
  const saved = loadState();
  if (!saved) {
    return { state: initialGameState(settings.startingMascot), wasReset: false };
  }

  const signature = bankSignature(
    selectActive(loadBank(), settings.questionsPerSession),
  );
  const stale =
    saved.openedBoxes.length > 0 &&
    typeof saved.bankSignature === "string" &&
    saved.bankSignature !== signature;

  if (stale) {
    clearState();
    return { state: initialGameState(settings.startingMascot), wasReset: true };
  }
  return { state: saved, wasReset: false };
}

export default function Game() {
  /**
   * True only after hydration. `useSyncExternalStore` gives us the
   * server snapshot (false) on the hydration render and the client snapshot
   * (true) immediately after, which is the lint-clean way to say "the DOM is
   * live now" — no setState inside an effect, no cascading render.
   */
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  // Read straight from localStorage in the initialiser. On the server (and on
  // the hydration render) these fall back to defaults, and we paint the splash
  // rather than the game, so the markup still matches.
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [restored] = useState(restoreSession);
  const [game, setGame] = useState<GameState>(restored.state);

  /** Shown once when a saved session was dropped because the questions changed. */
  const [bankChanged, setBankChanged] = useState(restored.wasReset);

  const [screen, setScreen] = useState<Screen>("boxes");
  const [currentBox, setCurrentBox] = useState<number | null>(null);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);

  const [stage, setStage] = useState<PuzzleStage>("solving");
  const [hintShown, setHintShown] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [mascotClip, setMascotClip] = useState<MascotClip | null>(null);

  const [confetti, setConfetti] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [previewClip, setPreviewClip] = useState<MascotClip | null>(null);

  // The most-recently-opened box, and the grid's scroll position. Both survive
  // the round-trip through a puzzle so returning to the wall lands the
  // facilitator exactly where they were. Scroll lives in a ref, not state, so
  // the whole page does not re-render on every scroll frame.
  const [lastBox, setLastBox] = useState<number | null>(null);
  const boxScrollTop = useRef(0);
  const handleBoxScroll = useCallback((top: number) => {
    boxScrollTop.current = top;
  }, []);
  // A getter (not the ref value itself) so BoxWall reads the latest position
  // from inside its own effect rather than us touching a ref during render.
  const getBoxScroll = useCallback(() => boxScrollTop.current, []);

  // The playable set: active questions only, in admin order, renumbered 1..N.
  // This is live — an edit in the admin (this tab or another) re-renders here.
  const activePuzzles = useActivePuzzles(settings.questionsPerSession);
  const totalBoxes = activePuzzles.length;
  const boxNumbers = useMemo(
    () => activePuzzles.map((p) => p.boxNumber),
    [activePuzzles],
  );

  // `activePuzzles` is in the dep list on purpose: without it, editing the
  // question that is currently on screen would never reach the puzzle screen.
  const puzzle = useMemo(
    () => (currentBox ? puzzleForBox(activePuzzles, currentBox) : undefined),
    [currentBox, activePuzzles],
  );

  // ---- Warm the mascot videos so the reaction never stutters on stage -----
  useEffect(() => {
    preloadTargets().forEach((url) => {
      const v = document.createElement("video");
      v.preload = "auto";
      v.src = url;
    });
  }, []);

  /** Stamped onto every save so a later reload can spot a changed bank. */
  const signature = useMemo(() => bankSignature(activePuzzles), [activePuzzles]);

  // ---- Persist ----------------------------------------------------------
  useEffect(() => {
    if (hydrated) saveState({ ...game, bankSignature: signature });
  }, [game, hydrated, signature]);

  useEffect(() => {
    if (hydrated) saveSettings(settings);
  }, [settings, hydrated]);

  // ---- Keep the sound manager in step with the settings ------------------
  useEffect(() => {
    sound.sfxEnabled = settings.soundEnabled;
    sound.configureMusic(settings.musicEnabled, settings.musicVolume);
  }, [settings.soundEnabled, settings.musicEnabled, settings.musicVolume]);

  /**
   * Start the music on the first interaction of the session. Browsers block
   * autoplay until a user gesture, so we try immediately (in case this browser
   * allows it) and otherwise latch onto the first click or key press.
   *
   * This runs exactly once. Every later screen calls `startMusic()` too, and
   * that call is a no-op while the track is already playing — which is why the
   * music never restarts between the wall, the opening, the puzzle, the reveal
   * and the mascot.
   */
  useEffect(() => {
    if (!hydrated) return;
    sound.preload();
    sound.startMusic();

    const kick = () => {
      sound.preload();
      sound.startMusic();
    };
    window.addEventListener("pointerdown", kick, { once: true });
    window.addEventListener("keydown", kick, { once: true });
    return () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, [hydrated]);

  // ---- Flow -------------------------------------------------------------

  const selectBox = useCallback(
    (boxNumber: number, rect: DOMRect | null) => {
      if (game.openedBoxes.includes(boxNumber)) return; // Opened boxes are dead.
      if (!puzzleForBox(activePuzzles, boxNumber)) return;
      void sound.play("click");
      sound.startMusic();
      setLastBox(boxNumber); // Keep this box in view when we come back.
      setCurrentBox(boxNumber);
      setOriginRect(rect);
      setStage("solving");
      setHintShown(false);
      setZoomLevel(0);
      setMascotClip(null);
      setScreen("opening");
    },
    [game.openedBoxes, activePuzzles],
  );

  const openingComplete = useCallback(() => {
    setScreen("puzzle");
    setStage("solving");
  }, []);

  const showHint = useCallback(() => {
    if (stage !== "solving") return;
    void sound.play("click");
    setHintShown(true);
  }, [stage]);

  const zoomOut = useCallback(() => {
    void sound.play("pop");
    setZoomLevel((z) => Math.min(3, z + 1));
  }, []);

  const reveal = useCallback(() => {
    if (stage !== "solving" || !puzzle) return;
    // The scramble's letters fly into place — give that its own sound.
    void sound.play(puzzle.type === "scramble" ? "shuffle" : "reveal");
    setStage("revealed");
  }, [stage, puzzle]);

  /** Record the outcome, close the box for good, and bring the mascot on. */
  const judge = useCallback(
    (judgement: Judgement) => {
      if (!puzzle || !currentBox) return;

      const clip =
        judgement === "skipped"
          ? null
          : pickClip(
              game.nextMascot,
              judgement === "correct" ? "correct" : "wrong",
              game.outcomes.length,
            );

      setGame((prev) => {
        if (prev.openedBoxes.includes(currentBox)) return prev; // Idempotent.
        return {
          ...prev,
          openedBoxes: [...prev.openedBoxes, currentBox],
          outcomes: [
            ...prev.outcomes,
            {
              boxNumber: currentBox,
              puzzleId: puzzle.id,
              puzzleUid: puzzle.uid,
              categoryLabel: puzzle.categoryLabel,
              judgement,
              at: Date.now(),
            },
          ],
          correctCount: prev.correctCount + (judgement === "correct" ? 1 : 0),
          notQuiteCount:
            prev.notQuiteCount + (judgement === "wrong" ? 1 : 0),
          // Alternate the mascot only when one actually appeared.
          nextMascot: clip ? otherGender(prev.nextMascot) : prev.nextMascot,
          startedAt: prev.startedAt ?? Date.now(),
        };
      });

      if (judgement === "skipped") {
        setScreen("boxes");
        setCurrentBox(null);
        return;
      }

      if (judgement === "correct") {
        void sound.play("correct");
        if (settings.confettiEnabled) {
          setConfetti(false);
          window.setTimeout(() => setConfetti(true), 20);
        }
      } else {
        void sound.play("wrong");
      }

      setMascotClip(clip);
      setStage("judged"); // The mascot now stays until NEXT PUZZLE.
    },
    [puzzle, currentBox, game.nextMascot, game.outcomes.length, settings.confettiEnabled],
  );

  /** The ONLY thing that dismisses the mascot. */
  const nextPuzzle = useCallback(() => {
    void sound.play("click");
    setConfetti(false);
    setMascotClip(null);
    setCurrentBox(null);
    setStage("solving");
    setHintShown(false);
    setZoomLevel(0);

    // A presence check, not a count. `openedBoxes` can hold numbers that no
    // longer exist after the admin shrinks the bank, so `opened >= total`
    // would either end the game early or never end it at all.
    const anyLeft = activePuzzles.some(
      (p) => !game.openedBoxes.includes(p.boxNumber),
    );
    setScreen(anyLeft ? "boxes" : "results");
  }, [game.openedBoxes, activePuzzles]);

  /**
   * From the wall once every box is open. `nextPuzzle` normally routes to the
   * results, but a SKIP on the final box returns to the wall instead — without
   * this the facilitator could see "Time for the results!" with no way there.
   */
  const showResults = useCallback(() => {
    void sound.play("click");
    setScreen("results");
  }, []);

  const backToBoxes = useCallback(() => {
    void sound.play("click");
    sound.stopAll();
    sound.clearDucking();
    setConfetti(false);
    setMascotClip(null);
    setCurrentBox(null);
    setStage("solving");
    setHintShown(false);
    setZoomLevel(0);
    setScreen("boxes");
  }, []);

  const resetGame = useCallback(() => {
    clearState();
    sound.stopAll();
    sound.clearDucking();
    setGame(initialGameState(settings.startingMascot));
    setConfetti(false);
    setMascotClip(null);
    setCurrentBox(null);
    setLastBox(null);
    boxScrollTop.current = 0; // A fresh game starts back at the top of the wall.
    setStage("solving");
    setHintShown(false);
    setZoomLevel(0);
    setScreen("boxes");
  }, [settings.startingMascot]);

  /**
   * Rescue: the question on screen disappeared underneath us.
   *
   * If the admin deletes or deactivates the in-flight question (in this tab or
   * another) while the box is opening, `BoxOpening` unmounts and its completion
   * timer is cleared with it — which would leave `screen === "opening"` showing
   * nothing at all, with no keyboard way out. Deriving the screen rather than
   * correcting it in an effect means there is never a frame in that state.
   *
   * `BoxOpening`'s own unmount cleanup stops its sounds and un-ducks the music,
   * so the audio recovers on its own. The transient puzzle state (stage, hint,
   * zoom) is re-initialised by `selectBox` on the next pick, so it can be left.
   */
  const lostPuzzle =
    currentBox !== null &&
    !puzzle &&
    (screen === "opening" || screen === "puzzle");
  const activeScreen: Screen = lostPuzzle ? "boxes" : screen;

  const previewMascot = useCallback((gender: MascotGender) => {
    setPreviewClip(pickClip(gender, "correct", 0));
  }, []);

  const patchSettings = useCallback((patch: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  // ---- Keyboard shortcuts ------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "h":
          if (activeScreen === "puzzle") showHint();
          break;
        case "r":
          if (activeScreen === "puzzle") reveal();
          break;
        case "c":
          if (activeScreen === "puzzle" && stage === "revealed") judge("correct");
          break;
        case "x":
          if (activeScreen === "puzzle" && stage === "revealed") judge("wrong");
          break;
        case "n":
          if (activeScreen === "puzzle" && stage === "judged") nextPuzzle();
          break;
        case "z":
          if (activeScreen === "puzzle" && puzzle?.type === "zoom" && stage === "solving") {
            zoomOut();
          }
          break;
        case "f":
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen().catch(() => {});
          break;
        case "escape":
          if (previewClip) setPreviewClip(null);
          else if (activeScreen === "puzzle") backToBoxes();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    activeScreen,
    stage,
    puzzle,
    previewClip,
    showHint,
    reveal,
    judge,
    nextPuzzle,
    zoomOut,
    backToBoxes,
  ]);

  // Nothing to paint until localStorage has been read — otherwise the wall
  // would flash 20 closed boxes before the saved session snaps in.
  if (!hydrated) {
    return (
      <main className="flex h-dvh items-center justify-center">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-ink-soft">
          Loading…
        </p>
      </main>
    );
  }

  return (
    <main className="relative h-dvh overflow-hidden">
      <AnimatePresence mode="wait">
        {activeScreen === "boxes" && (
          <motion.div
            key="boxes"
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <BoxWall
              boxes={boxNumbers}
              openedBoxes={game.openedBoxes}
              correctCount={game.correctCount}
              notQuiteCount={game.notQuiteCount}
              lastBox={lastBox}
              settings={settings}
              onSettingsChange={patchSettings}
              getInitialScroll={getBoxScroll}
              onScroll={handleBoxScroll}
              onSelect={selectBox}
              onShowResults={showResults}
            />
          </motion.div>
        )}

        {activeScreen === "puzzle" && puzzle && (
          <motion.div
            key={`puzzle-${puzzle.uid}`}
            className="h-full"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32 }}
          >
            <PuzzleScreen
              puzzle={puzzle}
              settings={settings}
              stage={stage}
              hintShown={hintShown}
              zoomLevel={zoomLevel}
              mascotClip={mascotClip}
              onShowHint={showHint}
              onZoomOut={zoomOut}
              onReveal={reveal}
              onCorrect={() => judge("correct")}
              onNotQuite={() => judge("wrong")}
              onNext={nextPuzzle}
              onSkip={() => judge("skipped")}
              onBackToBoxes={backToBoxes}
            />
          </motion.div>
        )}

        {activeScreen === "results" && (
          <motion.div
            key="results"
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ResultsScreen
              totalBoxes={totalBoxes}
              correctCount={game.correctCount}
              notQuiteCount={game.notQuiteCount}
              openedCount={game.openedBoxes.length}
              onPlayAgain={resetGame}
              onBackToBoxes={backToBoxes}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* The box-opening sequence sits above whatever screen is behind it */}
      <AnimatePresence>
        {activeScreen === "opening" && puzzle && (
          <BoxOpening
            key={`opening-${puzzle.uid}`}
            puzzle={puzzle}
            originRect={originRect}
            onComplete={openingComplete}
          />
        )}
      </AnimatePresence>

      <Confetti active={confetti} />

      {/* Mascot preview (facilitator rehearsal) */}
      <AnimatePresence>
        {previewClip && (
          <motion.div
            className="fixed inset-0 z-[95] flex items-end justify-center bg-ink/50 p-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewClip(null)}
          >
            <div
              className="flex h-[76vh] flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <MascotStage clip={previewClip} />
              <button
                type="button"
                onClick={() => setPreviewClip(null)}
                className="mt-4 rounded-full border-b-4 border-ink/30 bg-white px-7 py-2.5 text-sm font-black uppercase tracking-wide text-ink shadow-lift"
              >
                Close preview
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AdminPanel
        open={adminOpen}
        onOpenChange={setAdminOpen}
        settings={settings}
        onSettingsChange={patchSettings}
        screen={activeScreen}
        stage={stage}
        boxes={boxNumbers}
        openedBoxes={game.openedBoxes}
        activeCount={totalBoxes}
        onOpenBox={(n) => selectBox(n, null)}
        onShowHint={showHint}
        onReveal={reveal}
        onCorrect={() => judge("correct")}
        onNotQuite={() => judge("wrong")}
        onNext={nextPuzzle}
        onSkip={() => judge("skipped")}
        onBackToBoxes={backToBoxes}
        onReset={resetGame}
        onPreviewMascot={previewMascot}
      />

      {/* Safety net: there is nothing to play. Say so here rather than on
          stage in front of the room. */}
      {totalBoxes === 0 && (
        <p
          role="status"
          className="fixed bottom-4 right-4 z-[80] rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
        >
          No active questions — enable some in Manage questions.
        </p>
      )}

      {/* The saved session was dropped because the question set changed. */}
      {bankChanged && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800 shadow-panel"
        >
          The question set changed — the session was reset.
          <button
            type="button"
            onClick={() => setBankChanged(false)}
            className="rounded-full px-2 py-0.5 text-sm leading-none text-amber-700 hover:bg-amber-100"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </main>
  );
}
