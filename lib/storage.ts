import type { GameSettings, GameState, MascotGender } from "./types";

/**
 * localStorage persistence. Opened boxes and the running score survive a
 * browser refresh — if the projector laptop reloads mid-event, the facilitator
 * picks up exactly where they left off rather than replaying solved boxes.
 *
 * Three keys are used across the app:
 *   crackthebox.state.v2     — session progress (here)
 *   crackthebox.settings.v1  — facilitator settings (here)
 *   crackthebox.puzzles.v2   — the editable question bank (lib/puzzleStore.ts)
 *
 * The state key is v2 because openedBoxes / outcomes are keyed by BOX NUMBER,
 * and box numbers are now derived from the admin's question order. A v1 payload
 * from before questions were editable cannot be trusted, so it is ignored
 * rather than half-migrated.
 */

const STATE_KEY = "crackthebox.state.v2";
const SETTINGS_KEY = "crackthebox.settings.v1";

export const DEFAULT_SETTINGS: GameSettings = {
  // Off by default: the audience is meant to discuss and shout out answers,
  // and a ticking clock cuts that short. The facilitator can switch it on.
  timerEnabled: false,
  timerDuration: 60,
  soundEnabled: true,
  musicEnabled: true,
  musicVolume: 0.12,
  mascotEnabled: true,
  confettiEnabled: true,
  startingMascot: "female",
  // 0 = play every active question, which is the pre-existing behaviour for
  // anyone who never opens the question admin.
  questionsPerSession: 0,
  adminPin: "1234",
};

export function initialGameState(startingMascot: MascotGender): GameState {
  return {
    openedBoxes: [],
    outcomes: [],
    correctCount: 0,
    notQuiteCount: 0,
    nextMascot: startingMascot,
    startedAt: null,
  };
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadState(): GameState | null {
  if (typeof window === "undefined") return null;
  const state = safeParse<GameState>(localStorage.getItem(STATE_KEY));
  // Guard against a half-written or older-shaped payload.
  if (!state || !Array.isArray(state.openedBoxes) || !Array.isArray(state.outcomes)) {
    return null;
  }
  return state;
}

export function saveState(state: GameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* Private mode / quota — the game keeps working, it just won't persist. */
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STATE_KEY);
}

export function loadSettings(): GameSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const stored = safeParse<Partial<GameSettings>>(
    localStorage.getItem(SETTINGS_KEY),
  );
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(settings: GameSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

/**
 * Change SOME settings without owning the rest.
 *
 * The game page holds the whole settings object in React state and writes all of
 * it whenever any part changes. The question admin runs in a separate tab and
 * only cares about one field (the PIN), so it must read-merge-write — passing a
 * whole object built from its own stale copy would silently revert whatever the
 * facilitator changed in the game tab meanwhile.
 */
export function patchSettings(patch: Partial<GameSettings>): GameSettings {
  const next = { ...loadSettings(), ...patch };
  saveSettings(next);
  return next;
}
