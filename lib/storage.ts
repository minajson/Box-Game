import type { GameSettings, GameState, MascotGender } from "./types";

/**
 * localStorage persistence. Opened boxes and the running score survive a
 * browser refresh — if the projector laptop reloads mid-event, the facilitator
 * picks up exactly where they left off rather than replaying solved boxes.
 */

const STATE_KEY = "crackthebox.state.v1";
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
