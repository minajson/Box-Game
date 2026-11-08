"use client";

import { forwardRef } from "react";

/**
 * A single premium mystery box.
 *
 * Built from layered gradients rather than a flat rectangle: a lid that
 * overhangs the body, a ribbon, a specular highlight across the top of the
 * body, an inner rim, and a soft contact shadow underneath. The lid is a real
 * element, so the opening sequence can lift it off.
 *
 * The face only ever shows the box NUMBER — never a hint of the puzzle inside.
 */

export const BOX_COLORS = [
  "emerald",
  "sky",
  "amber",
  "violet",
  "coral",
  "teal",
  "pink",
  "lime",
  "indigo",
  "rose",
] as const;

export type BoxColor = (typeof BOX_COLORS)[number];

/** Body / lid / shadow tones for each colour in the system. */
const PALETTE: Record<BoxColor, { from: string; to: string; lid: string; lidTo: string; rim: string }> = {
  emerald: { from: "#34d399", to: "#059669", lid: "#6ee7b7", lidTo: "#10b981", rim: "#047857" },
  sky: { from: "#60b8fb", to: "#2563eb", lid: "#93cdfd", lidTo: "#3b9df7", rim: "#1d4ed8" },
  amber: { from: "#fbbf24", to: "#d97706", lid: "#fcd34d", lidTo: "#f59e0b", rim: "#b45309" },
  violet: { from: "#c084fc", to: "#7c3aed", lid: "#d8b4fe", lidTo: "#a855f7", rim: "#6d28d9" },
  coral: { from: "#fb8a67", to: "#e0451c", lid: "#fdb094", lidTo: "#f4623a", rim: "#c2410c" },
  teal: { from: "#2dd4bf", to: "#0d9488", lid: "#5eead4", lidTo: "#14b8a6", rim: "#0f766e" },
  pink: { from: "#f472b6", to: "#db2777", lid: "#f9a8d4", lidTo: "#ec4899", rim: "#be185d" },
  lime: { from: "#a3e635", to: "#65a30d", lid: "#bef264", lidTo: "#84cc16", rim: "#4d7c0f" },
  indigo: { from: "#818cf8", to: "#4338ca", lid: "#a5b4fc", lidTo: "#6366f1", rim: "#3730a3" },
  rose: { from: "#fb7185", to: "#e11d48", lid: "#fda4af", lidTo: "#f43f5e", rim: "#be123c" },
};

/** Deterministic colour per box, so the wall looks the same every rehearsal. */
export function colorForBox(boxNumber: number): BoxColor {
  return BOX_COLORS[(boxNumber - 1) % BOX_COLORS.length];
}

interface Props {
  boxNumber: number;
  opened: boolean;
  disabled?: boolean;
  /** Drives the opening sequence: lifts the lid and blows the body open. */
  lidOpen?: boolean;
  shaking?: boolean;
  /** Suppresses the idle float (used for the box flying to centre). */
  still?: boolean;
  onSelect?: (boxNumber: number, rect: DOMRect) => void;
  /** Visual scale — the wall uses 1, the opening sequence scales up. */
  className?: string;
  /** Overrides the number's font size (the dense 100-box wall scales it to the box). */
  numberSize?: string;
}

const MysteryBox = forwardRef<HTMLButtonElement, Props>(function MysteryBox(
  {
    boxNumber,
    opened,
    disabled = false,
    lidOpen = false,
    shaking = false,
    still = false,
    onSelect,
    className = "",
    numberSize,
  },
  ref,
) {
  const c = PALETTE[colorForBox(boxNumber)];
  const interactive = Boolean(onSelect) && !opened && !disabled;

  return (
    <button
      ref={ref}
      type="button"
      disabled={!interactive}
      aria-label={
        opened
          ? `Box ${boxNumber}, already opened`
          : `Open box ${boxNumber}`
      }
      onClick={(e) => {
        if (!interactive || !onSelect) return;
        onSelect(boxNumber, e.currentTarget.getBoundingClientRect());
      }}
      className={`group relative block h-full w-full select-none transition-opacity duration-300 ${
        opened ? "cursor-not-allowed opacity-45" : ""
      } ${interactive ? "cursor-pointer" : ""} ${
        disabled && !opened ? "opacity-30" : ""
      } ${className}`}
      style={{ perspective: "900px" }}
    >
      <div
        className={`relative h-full w-full ${
          !still && !opened && !shaking ? "box-idle" : ""
        } ${shaking ? "box-shake" : ""}`}
        style={{
          animationDelay: !still ? `${(boxNumber % 7) * 0.42}s` : undefined,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Contact shadow on the floor */}
        <div
          aria-hidden
          className="absolute inset-x-[12%] bottom-[2%] h-3 rounded-[50%] blur-md transition-all duration-300 group-hover:inset-x-[8%] group-hover:h-4"
          style={{ background: "rgb(18 35 59 / 0.28)" }}
        />

        {/* ---------------- BODY ---------------- */}
        <div
          className="absolute inset-x-[4%] bottom-[4%] top-[24%] rounded-xl transition-transform duration-300 group-hover:scale-[1.03]"
          style={{
            background: `linear-gradient(160deg, ${c.from} 0%, ${c.to} 100%)`,
            boxShadow: `inset 0 2px 0 rgb(255 255 255 / 0.42), inset 0 -14px 24px -12px ${c.rim}, 0 14px 26px -14px rgb(18 35 59 / 0.5)`,
          }}
        >
          {/* Specular sheen across the upper body */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{
              background:
                "linear-gradient(150deg, rgb(255 255 255 / 0.3) 0%, rgb(255 255 255 / 0.05) 38%, transparent 60%)",
            }}
          />
          {/* Vertical ribbon */}
          <div
            aria-hidden
            className="absolute inset-y-0 left-1/2 w-[13%] -translate-x-1/2"
            style={{
              background:
                "linear-gradient(90deg, rgb(255 255 255 / 0.12) 0%, rgb(255 255 255 / 0.4) 45%, rgb(255 255 255 / 0.16) 100%)",
            }}
          />

          {/* The number — the only thing a closed box ever reveals */}
          <span
            className="absolute inset-0 flex items-center justify-center font-black leading-none text-white"
            style={{
              fontSize: numberSize ?? "clamp(1.6rem, 4.4vw, 3.4rem)",
              textShadow: `0 3px 0 ${c.rim}, 0 8px 18px rgb(18 35 59 / 0.4)`,
            }}
          >
            {opened ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-[38%] w-[38%] drop-shadow"
                aria-hidden
              >
                <path
                  d="M4.5 12.8 9.5 17.8 19.5 6.5"
                  stroke="white"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              boxNumber
            )}
          </span>
        </div>

        {/* ---------------- LID ---------------- */}
        <div
          className="absolute inset-x-0 top-[6%] h-[22%] origin-bottom rounded-lg transition-transform duration-300 group-hover:-translate-y-1"
          style={{
            background: `linear-gradient(170deg, ${c.lid} 0%, ${c.lidTo} 100%)`,
            boxShadow: `inset 0 2px 0 rgb(255 255 255 / 0.6), 0 6px 12px -6px rgb(18 35 59 / 0.55)`,
            transform: lidOpen
              ? "translateY(-190%) rotate(-24deg) scale(1.06)"
              : undefined,
            transition: lidOpen
              ? "transform 620ms cubic-bezier(.2,1.5,.4,1), opacity 620ms"
              : undefined,
            opacity: lidOpen ? 0 : 1,
          }}
        >
          {/* Ribbon crossing the lid */}
          <div
            aria-hidden
            className="absolute inset-y-0 left-1/2 w-[13%] -translate-x-1/2"
            style={{
              background:
                "linear-gradient(90deg, rgb(255 255 255 / 0.15) 0%, rgb(255 255 255 / 0.48) 45%, rgb(255 255 255 / 0.18) 100%)",
            }}
          />
          {/* Bow */}
          <div
            aria-hidden
            className="absolute left-1/2 top-0 h-[46%] w-[34%] -translate-x-1/2 -translate-y-[68%]"
          >
            <div
              className="absolute inset-y-0 left-0 w-[44%] rounded-full"
              style={{
                background: "rgb(255 255 255 / 0.85)",
                transform: "rotate(-26deg)",
              }}
            />
            <div
              className="absolute inset-y-0 right-0 w-[44%] rounded-full"
              style={{
                background: "rgb(255 255 255 / 0.85)",
                transform: "rotate(26deg)",
              }}
            />
            <div className="absolute left-1/2 top-1/2 h-[34%] w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          </div>
        </div>
      </div>
    </button>
  );
});

export default MysteryBox;
