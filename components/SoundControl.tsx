"use client";

import type { GameSettings } from "@/lib/types";

/**
 * Compact music / sound-effects toggles for the sticky header. Small enough to
 * never intrude on the game, always reachable so the facilitator can mute on
 * the fly without opening the full panel.
 */
export default function SoundControl({
  settings,
  onSettingsChange,
}: {
  settings: GameSettings;
  onSettingsChange: (patch: Partial<GameSettings>) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <IconToggle
        on={settings.musicEnabled}
        onClick={() => onSettingsChange({ musicEnabled: !settings.musicEnabled })}
        labelOn="Mute background music"
        labelOff="Play background music"
      >
        {settings.musicEnabled ? (
          <path
            d="M9 18V6l10-2v12M9 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm10-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : (
          <>
            <path
              d="M9 18V6l10-2v12M9 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm10-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.35"
            />
            <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </IconToggle>

      <IconToggle
        on={settings.soundEnabled}
        onClick={() => onSettingsChange({ soundEnabled: !settings.soundEnabled })}
        labelOn="Mute sound effects"
        labelOff="Play sound effects"
      >
        {settings.soundEnabled ? (
          <path
            d="M11 5 6 9H3v6h3l5 4V5Zm4.5 3a5 5 0 0 1 0 8m2.5-11a8.5 8.5 0 0 1 0 14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : (
          <>
            <path
              d="M11 5 6 9H3v6h3l5 4V5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path d="m16 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </>
        )}
      </IconToggle>
    </div>
  );
}

function IconToggle({
  on,
  onClick,
  labelOn,
  labelOff,
  children,
}: {
  on: boolean;
  onClick: () => void;
  labelOn: string;
  labelOff: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? labelOn : labelOff}
      title={on ? labelOn : labelOff}
      className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
        on
          ? "border-ren-green/30 bg-ren-green-soft text-ren-green-deep"
          : "border-ink/12 bg-white text-ink-soft"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
