"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  addMark,
  foundHotspots,
  hotspotAt,
  optionLetter,
  pickCount,
  removeMark,
  requiredPicks,
  sceneSrc,
  shuffledOptions,
  toggleChoice,
  toggleSequence,
} from "@/lib/clickable";
import type { ClickOption, ClickResponse, HotspotArea, HotspotLabelSide, Puzzle } from "@/lib/types";

/**
 * Clickable challenges: the room decides, the facilitator clicks it in.
 *
 *   choice    large answer cards, beside a scene photo when there is one. With
 *             `sceneZoom` the photo starts as an extreme close-up and the cards
 *             only slide in after the third Zoom Out.
 *   hotspot   clicks on the photo itself. Each click drops a numbered marker;
 *             clicking a marker lifts it again.
 *   sequence  photo cards clicked in order. Each gets a big step number, and on
 *             the reveal the cards physically travel into the right order, each
 *             tagged with the step the room gave it.
 *
 * Nothing on screen says which answer is right until `phase` is "revealed": the
 * correct flags live only in the data, and no class, attribute or alt text
 * depends on them before then.
 *
 * Everything is sized against the canvas box itself (container query units),
 * not the viewport, so the challenge still fits when the answer panel or the
 * mascot column takes space away from it.
 */

export type ClickPhase = "solving" | "checking" | "revealed";

export interface ClickableProps {
  puzzle: Puzzle;
  response: ClickResponse;
  /** Omitted for a read-only render (the admin preview). */
  onChange?: (next: ClickResponse) => void;
  phase: ClickPhase;
  /** 0 = tightest crop, 3 = fully zoomed out. Only used with `sceneZoom`. */
  zoomLevel?: number;
}

/** The selection colour. Deliberately not green: green means "correct". */
const PICK = "#2563eb";

const SCENARIO_SIZE = "clamp(1rem, min(2vw, 3.4vh), 3.4rem)";
const LABEL_SIZE = "clamp(0.95rem, min(1.65vw, 3vh), 3rem)";
/** Long answers (a sentence rather than a phrase) step down so they fit the card. */
const LABEL_SIZE_LONG = "clamp(0.85rem, min(1.4vw, 2.55vh), 2.6rem)";
const LONG_LABEL = 48;
/** True / False: two cards that fill the canvas, so the words can be much larger. */
const LABEL_SIZE_PAIR = "clamp(1.8rem, min(4.4vw, 8vh), 7rem)";
const DETAIL_SIZE = "clamp(0.75rem, min(1.15vw, 2.1vh), 2rem)";
const LETTER_SIZE = "clamp(1.6rem, min(2.6vw, 4.6vh), 4.6rem)";

/** The smallest a card's text may shrink to fit, as a share of its full size. */
const MIN_FIT = 0.5;

/**
 * Shrinks a card's text until it fits the card. Cards are sized by the grid,
 * not by their text, and the reveal takes height away from them — so without
 * this a long answer is clipped by the card's `overflow-hidden`.
 *
 * Writes `--fit` straight onto the element rather than through state: the
 * measure-and-shrink loop has to finish before the browser paints.
 */
function useFitText<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      let scale = 1;
      el.style.setProperty("--fit", "1");
      while (el.scrollHeight > el.clientHeight + 1 && scale > MIN_FIT) {
        const before = el.scrollHeight;
        const next = Math.round((scale - 0.05) * 100) / 100;
        el.style.setProperty("--fit", String(next));
        // On a very short card the letter badge, not the text, is what
        // overflows; shrinking the text further would only make it unreadable.
        if (el.scrollHeight >= before) {
          el.style.setProperty("--fit", String(scale));
          break;
        }
        scale = next;
      }
    };
    fit();
    // The text's size never changes the card's, so this cannot loop.
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    let live = true;
    document.fonts?.ready.then(() => live && fit());
    return () => {
      live = false;
      observer.disconnect();
    };
  }, []);
  return ref;
}

const fitted = (size: string) => `calc(${size} * var(--fit, 1))`;

/** 1st, 2nd, 3rd, 4th… */
function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

export default function ClickableCanvas(props: ClickableProps) {
  const { puzzle } = props;
  // A hotspot scenario is an instruction ("Tap the two warning signs") with
  // nothing left to do once revealed, so its line goes to the photo instead.
  const showScenario =
    Boolean(puzzle.scenario) && !(props.phase === "revealed" && puzzle.interaction === "hotspot");
  return (
    <div className="flex h-full w-full min-w-0 flex-col items-center gap-[clamp(0.4rem,1.4vh,1.4rem)]">
      {showScenario && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[60ch] shrink-0 text-balance text-center font-bold leading-snug text-ink"
          style={{ fontSize: SCENARIO_SIZE }}
        >
          {puzzle.scenario}
        </motion.p>
      )}
      <div className="relative min-h-0 w-full flex-1" style={{ containerType: "size" }}>
        {puzzle.interaction === "hotspot" ? (
          <HotspotScene {...props} />
        ) : puzzle.interaction === "sequence" ? (
          <Sequence {...props} />
        ) : (
          <Choice {...props} />
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ SCENE

const ZOOM_SCALES = [6, 3.4, 1.9, 1];

/**
 * A photo boxed to its own aspect ratio inside the available space, so percent
 * coordinates on it always mean the same spot on the picture.
 */
function SceneFrame({
  src,
  alt,
  scale = 1,
  focus,
  onPick,
  children,
  maxWidth = "100cqw",
}: {
  src: string;
  alt: string;
  scale?: number;
  focus?: { x: number; y: number };
  /** Called with the click position in percent of the photo. */
  onPick?: (at: { x: number; y: number }) => void;
  children?: React.ReactNode;
  maxWidth?: string;
}) {
  const [ratio, setRatio] = useState(16 / 9);
  return (
    <div
      className={`relative overflow-hidden rounded-[clamp(0.8rem,1.6vw,2.2rem)] border-[clamp(4px,0.45vw,10px)] border-white bg-ink/5 shadow-lift ${
        onPick ? "cursor-crosshair" : ""
      }`}
      style={{
        width: `min(${maxWidth}, calc(100cqh * ${ratio}))`,
        aspectRatio: ratio,
      }}
      onClick={
        onPick
          ? (e) => {
              const box = e.currentTarget.getBoundingClientRect();
              onPick({
                x: ((e.clientX - box.left) / box.width) * 100,
                y: ((e.clientY - box.top) / box.height) * 100,
              });
            }
          : undefined
      }
    >
      <motion.img
        src={src}
        alt={alt}
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) {
            setRatio(img.naturalWidth / img.naturalHeight);
          }
        }}
        className="absolute inset-0 h-full w-full select-none object-cover"
        animate={{ scale }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
        style={{ transformOrigin: `${focus?.x ?? 50}% ${focus?.y ?? 50}%` }}
      />
      {children}
    </div>
  );
}

/** How far out a zoomed scene is — four pills, like the Zoom puzzles. */
function ZoomPills({ level }: { level: number }) {
  return (
    <div className="flex items-center justify-center gap-2.5">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-3 rounded-full transition-all duration-300 ${
            i <= level ? "w-12 bg-ren-green" : "w-6 bg-ink/15"
          }`}
        />
      ))}
    </div>
  );
}

// ----------------------------------------------------------------- CHOICE

function Choice({ puzzle, response, onChange, phase, zoomLevel = 0 }: ClickableProps) {
  const options = puzzle.options ?? [];
  const scene = sceneSrc(puzzle);
  const revealed = phase === "revealed";
  const zooming = Boolean(puzzle.sceneZoom) && !revealed && zoomLevel < 3;
  const multi = requiredPicks(puzzle) > 1;
  const pick = (id: string) => {
    if (phase === "solving" && onChange) onChange(toggleChoice(puzzle, response, id));
  };

  const cards = (layout: "column" | "row" | "grid" | "pair") => (
    <div
      className={`grid h-full min-h-0 w-full gap-[clamp(0.5rem,1.2vw,1.6rem)] ${
        layout === "column"
          ? "grid-rows-[repeat(var(--n),minmax(0,1fr))]"
          : layout === "row"
            ? "grid-cols-[repeat(var(--n),minmax(0,1fr))]"
            : layout === "pair"
              ? "grid-cols-2 grid-rows-1"
              : "grid-cols-2 grid-rows-2"
      }`}
      style={{ ["--n" as string]: options.length }}
    >
      {options.map((option, i) => (
        <OptionCard
          key={option.id}
          puzzle={puzzle}
          option={option}
          index={i}
          picked={response.picks.includes(option.id)}
          phase={phase}
          multi={multi}
          tall={layout === "row"}
          big={layout === "pair" || (options.length === 2 && layout === "column")}
          onPick={onChange ? () => pick(option.id) : undefined}
        />
      ))}
    </div>
  );

  // No scene: the cards are the whole challenge.
  if (!scene) {
    const withPhotos = options.some((o) => o.assetIndex !== undefined);
    // Two cards (True / False) get a single row of very large cards.
    const layout = withPhotos ? "row" : options.length === 2 ? "pair" : "grid";
    return <div className="h-full w-full">{cards(layout)}</div>;
  }

  return (
    <div className="flex h-full w-full items-center justify-center gap-[clamp(0.6rem,1.6vw,2.4rem)]">
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 120, damping: 22 }}
        className="flex h-full min-w-0 flex-col items-center justify-center gap-3"
        // NAPE picture questions give the picture more room (62/38); every
        // other challenge keeps its original 58/42 split.
        style={{ containerType: "size", flex: zooming ? "1 1 100%" : puzzle.nape ? "0 1 62%" : "0 1 58%" }}
      >
        <div className="flex min-h-0 w-full flex-1 items-center justify-center" style={{ containerType: "size" }}>
          <SceneFrame
            src={scene}
            alt="Challenge photo"
            scale={puzzle.sceneZoom && !revealed ? ZOOM_SCALES[Math.min(zoomLevel, 3)] : 1}
            focus={puzzle.sceneFocus}
          />
        </div>
        {puzzle.sceneZoom && <ZoomPills level={revealed ? 3 : zoomLevel} />}
      </motion.div>

      <AnimatePresence>
        {!zooming && (
          <motion.div
            key="cards"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 22, delay: 0.15 }}
            className={`h-full min-w-0 ${puzzle.nape ? "flex-[0_1_38%]" : "flex-[0_1_42%]"}`}
          >
            {cards("column")}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * "key" is a card shown as part of the right answer without judging the room's
 * pick — the revealed sequence, where the verdict is a separate tag.
 */
type CardState = "idle" | "picked" | "correct" | "wrong" | "dim" | "key";

function cardState(option: ClickOption, picked: boolean, phase: ClickPhase): CardState {
  if (phase !== "revealed") return picked ? "picked" : "idle";
  if (option.correct) return "correct";
  return picked ? "wrong" : "dim";
}

function OptionCard({
  puzzle,
  option,
  index,
  picked,
  phase,
  multi,
  tall,
  big,
  badge,
  onPick,
}: {
  puzzle: Puzzle;
  option: ClickOption;
  index: number;
  picked: boolean;
  phase: ClickPhase;
  multi: boolean;
  /** Photo above the text, filling the card's height. */
  tall: boolean;
  /** A two-card (True / False) layout: much larger type. */
  big?: boolean;
  /** Overrides the letter, e.g. a sequence step number. */
  badge?: React.ReactNode;
  onPick?: () => void;
}) {
  const state = cardState(option, picked, phase);
  return <CardShell {...{ puzzle, option, index, state, multi, tall, big, badge, onPick, phase }} />;
}

/*
 * Classes, not inline styles: framer-motion keeps an inline style it was once
 * given even after the prop goes away, so a card that was picked and then
 * unpicked would keep its blue ring for good.
 */
const STATE_STYLES: Record<CardState, string> = {
  idle: "border-ink/10 bg-white shadow-panel",
  picked:
    "border-[#2563eb] bg-[#eff6ff] shadow-[0_0_0_clamp(4px,0.5vw,12px)_rgb(37_99_235/0.2)]",
  correct: "border-ren-green bg-ren-green-soft shadow-lift",
  wrong: "border-red-500 bg-red-50 shadow-panel",
  dim: "border-ink/10 bg-white shadow-panel",
  key: "border-ren-green bg-white shadow-panel",
};

/** A tag across the top of a card, e.g. where the room placed a sequence step. */
interface CardFlag {
  text: string;
  ok: boolean;
}

function CardShell({
  puzzle,
  option,
  index,
  state,
  multi,
  tall,
  big,
  badge,
  flag,
  onPick,
  phase,
}: {
  puzzle: Puzzle;
  option: ClickOption;
  index: number;
  state: CardState;
  multi: boolean;
  tall: boolean;
  big?: boolean;
  badge?: React.ReactNode;
  flag?: CardFlag;
  onPick?: () => void;
  phase: ClickPhase;
}) {
  const photo =
    option.assetIndex !== undefined ? puzzle.imageAssets[option.assetIndex] : undefined;
  const clickable = Boolean(onPick) && phase === "solving";
  const selected = state === "picked";
  const fitRef = useFitText<HTMLButtonElement>();

  return (
    <motion.button
      ref={fitRef}
      type="button"
      layout
      data-option={option.id}
      data-option-state={state}
      aria-pressed={selected}
      disabled={!clickable}
      onClick={onPick}
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{
        opacity: state === "dim" ? 0.32 : 1,
        y: 0,
        scale: state === "correct" ? 1.03 : selected ? 1.02 : 1,
        x: state === "wrong" ? [0, -10, 10, -6, 6, 0] : 0,
      }}
      transition={{
        delay: phase === "solving" ? 0.06 * index : 0,
        type: "spring",
        stiffness: 260,
        damping: 20,
        x: { duration: 0.45 },
      }}
      whileHover={clickable ? { y: -4 } : undefined}
      whileTap={clickable ? { scale: 0.97 } : undefined}
      className={`relative flex h-full min-h-0 w-full overflow-hidden rounded-[clamp(0.8rem,1.4vw,2rem)] border-[clamp(3px,0.35vw,8px)] text-left transition-[background-color,border-color,box-shadow] duration-300 disabled:cursor-default ${
        tall ? "flex-col" : "flex-row items-center"
      } ${STATE_STYLES[state]} ${phase === "checking" && selected ? "animate-pulse" : ""}`}
    >
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          draggable={false}
          className={`select-none object-cover ${
            tall ? "min-h-0 w-full flex-1" : "h-full w-[38%] shrink-0"
          }`}
        />
      )}

      <span
        className={`flex min-w-0 items-center gap-[clamp(0.5rem,1vw,1.4rem)] px-[clamp(0.6rem,1.2vw,1.8rem)] py-[clamp(0.4rem,1vh,1.2rem)] ${
          tall ? "shrink-0" : "flex-1"
        }`}
        // Side-by-side cards keep the verdict stamp's corner clear from the start,
        // so the text does not reflow when the stamp lands.
        style={tall ? undefined : { paddingRight: `calc(${LETTER_SIZE} + 1rem)` }}
      >
        <Badge state={state} multi={multi}>
          {badge ?? optionLetter(index)}
        </Badge>
        <span className="flex min-w-0 flex-col">
          <span
            className="font-black leading-[1.12] tracking-tight text-ink"
            style={{
              fontSize: fitted(
                big ? LABEL_SIZE_PAIR : option.label.length > LONG_LABEL ? LABEL_SIZE_LONG : LABEL_SIZE,
              ),
            }}
          >
            {option.label}
          </span>
          {option.detail && (
            <span
              className="mt-0.5 font-semibold leading-snug text-ink-soft"
              style={{ fontSize: fitted(DETAIL_SIZE) }}
            >
              {option.detail}
            </span>
          )}
        </span>
      </span>

      {flag && (
        <motion.span
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 + index * 0.12, type: "spring", stiffness: 260, damping: 20 }}
          className={`absolute inset-x-[clamp(0.4rem,0.8vw,1.2rem)] top-[clamp(0.4rem,0.8vw,1.2rem)] rounded-full px-[clamp(0.5rem,0.9vw,1.2rem)] py-[clamp(0.2rem,0.5vh,0.6rem)] text-center font-black uppercase tracking-wide text-white shadow-lift ${
            flag.ok ? "bg-ren-green" : "bg-red-500"
          }`}
          style={{ fontSize: DETAIL_SIZE }}
        >
          {flag.ok ? "✓ " : "✗ "}
          {flag.text}
        </motion.span>
      )}

      {/* The verdict stamp, after submission only. */}
      {(state === "correct" || state === "wrong") && (
        <motion.span
          aria-hidden
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 14 }}
          className={`absolute right-[clamp(0.4rem,0.8vw,1.2rem)] top-[clamp(0.4rem,0.8vw,1.2rem)] flex aspect-square items-center justify-center rounded-full font-black text-white shadow-lift ${
            state === "correct" ? "bg-ren-green" : "bg-red-500"
          }`}
          style={{ width: LETTER_SIZE, fontSize: `calc(${LETTER_SIZE} * 0.55)` }}
        >
          {state === "correct" ? "✓" : "✗"}
        </motion.span>
      )}
    </motion.button>
  );
}

function Badge({
  state,
  multi,
  children,
}: {
  state: CardState;
  multi: boolean;
  children: React.ReactNode;
}) {
  const filled = state === "picked";
  return (
    <span
      className={`flex aspect-square shrink-0 items-center justify-center font-black leading-none transition-colors duration-300 ${
        multi ? "rounded-[28%]" : "rounded-full"
      } ${
        state === "correct" || state === "key"
          ? "bg-ren-green text-white"
          : state === "wrong"
            ? "bg-red-500 text-white"
            : filled
              ? "text-white"
              : "bg-ink/[0.07] text-ink"
      }`}
      style={{
        width: LETTER_SIZE,
        fontSize: `calc(${LETTER_SIZE} * 0.5)`,
        background: filled ? PICK : undefined,
      }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- HOTSPOT

const MARK_SIZE = "clamp(1.7rem, min(2.8vw, 5vh), 4.6rem)";
const MARK_TAB = "clamp(1.2rem, min(1.9vw, 3.4vh), 3.1rem)";

/**
 * Where a revealed hotspot's label sits against its area. A set side wins, so
 * an author can steer a label into empty space and off the text it explains;
 * otherwise it goes below, or above when the area is near the bottom edge.
 */
function labelPlacement(a: HotspotArea, side?: HotspotLabelSide): string {
  if (side === "left" || side === "right") {
    const v = "top-1/2 -translate-y-1/2";
    return side === "right" ? `left-full ml-2 ${v}` : `right-full mr-2 ${v}`;
  }
  const above = side === "above" || (side === undefined && a.y + a.h > 86);
  // Labels near an edge grow inward, so the frame never clips them.
  const h =
    a.x + a.w / 2 < 25 ? "left-0" : a.x + a.w / 2 > 75 ? "right-0" : "left-1/2 -translate-x-1/2";
  return `${above ? "bottom-full mb-1" : "top-full mt-1"} ${h}`;
}

function HotspotScene({ puzzle, response, onChange, phase }: ClickableProps) {
  const scene = sceneSrc(puzzle);
  const revealed = phase === "revealed";
  const need = requiredPicks(puzzle);
  const count = pickCount(puzzle, response);
  const found = foundHotspots(puzzle, response);
  const [full, setFull] = useState(false);

  if (!scene) return null;

  const place = (at: { x: number; y: number }) => {
    if (phase !== "solving" || !onChange) return;
    if (count >= need) {
      // Nudge rather than silently ignore: lift a marker to move it.
      setFull(true);
      window.setTimeout(() => setFull(false), 1400);
      return;
    }
    onChange(addMark(puzzle, response, at));
  };

  return (
    <div className="flex h-full w-full items-center justify-center" style={{ containerType: "size" }}>
      <SceneFrame src={scene} alt="Challenge photo" onPick={onChange ? place : undefined}>
        {/* Answer areas, after submission only. */}
        {revealed &&
          (puzzle.hotspots ?? []).map((h, i) => {
            const hit = found.has(h.id);
            const labelAt = h.labelArea !== undefined && h.areas[h.labelArea] ? h.labelArea : 0;
            return h.areas.map((a, j) => (
              <motion.span
                key={`${h.id}-${j}`}
                data-hotspot={h.id}
                data-found={hit ? "true" : "false"}
                initial={{ opacity: 0, scale: 1.15 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.2, type: "spring", stiffness: 200, damping: 16 }}
                className={`pointer-events-none absolute rounded-[clamp(0.4rem,0.8vw,1rem)] border-[clamp(3px,0.35vw,8px)] ${
                  hit
                    ? "border-ren-green bg-ren-green/15"
                    : "animate-pulse border-dashed border-amber-400 bg-amber-300/15"
                }`}
                // The labelled area sits above its neighbours so their outlines
                // never cross the label.
                style={{
                  left: `${a.x}%`,
                  top: `${a.y}%`,
                  width: `${a.w}%`,
                  height: `${a.h}%`,
                  zIndex: j === labelAt ? 2 : 1,
                }}
              >
                {j === labelAt && (
                  <span
                    className={`absolute whitespace-nowrap rounded-full px-3 py-1 font-black uppercase tracking-wide text-white shadow-lift ${
                      hit ? "bg-ren-green" : "bg-amber-500"
                    } ${labelPlacement(a, h.labelSide)}`}
                    style={{ fontSize: "clamp(0.7rem, min(1.1vw, 2vh), 1.8rem)" }}
                  >
                    {hit ? "✓ " : "Missed: "}
                    {h.label}
                  </span>
                )}
              </motion.span>
            ));
          })}

        {/* The facilitator's markers: a hollow ring on the spot, so the words
            or object clicked stay readable, with its number in a tab beside it. */}
        <AnimatePresence>
          {response.marks.map((m, i) => {
            const hit = revealed ? Boolean(hotspotAt(puzzle.hotspots, m)) : null;
            const colour = hit === null ? PICK : hit ? "var(--color-ren-green)" : "#ef4444";
            return (
              <motion.button
                type="button"
                key={`${m.x.toFixed(2)}-${m.y.toFixed(2)}`}
                data-mark={i + 1}
                aria-label={`Remove marker ${i + 1}`}
                disabled={phase !== "solving" || !onChange}
                onClick={(e) => {
                  e.stopPropagation();
                  if (phase === "solving" && onChange) onChange(removeMark(response, i));
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className="absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full disabled:cursor-default"
                style={{
                  zIndex: 3,
                  left: `${m.x}%`,
                  top: `${m.y}%`,
                  width: MARK_SIZE,
                  border: `clamp(3px, 0.3vw, 6px) solid ${colour}`,
                  // A white halo keeps the ring visible on dark and light photos.
                  boxShadow: "0 0 0 2px #fff, inset 0 0 0 2px #fff",
                }}
              >
                {hit === null && (
                  <span
                    aria-hidden
                    className="absolute inset-[-35%] animate-ping rounded-full border-4"
                    style={{ borderColor: `${PICK}88`, animationDuration: "1.6s" }}
                  />
                )}
                <span
                  aria-hidden
                  className="absolute bottom-[70%] left-[70%] flex aspect-square items-center justify-center rounded-full border-2 border-white font-black leading-none text-white shadow-lift"
                  style={{
                    width: MARK_TAB,
                    fontSize: `calc(${MARK_TAB} * 0.55)`,
                    background: colour,
                  }}
                >
                  {hit === null ? i + 1 : hit ? "✓" : "✗"}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Progress — "1 / 3 selected" — readable from the back. */}
        <motion.span
          animate={full ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="pointer-events-none absolute left-[clamp(0.5rem,1vw,1.5rem)] top-[clamp(0.5rem,1vw,1.5rem)] z-[4] flex items-center gap-2 rounded-full bg-ink/85 px-[clamp(0.7rem,1.2vw,1.6rem)] py-[clamp(0.3rem,0.7vh,0.8rem)] font-black uppercase tracking-wide text-white shadow-lift backdrop-blur"
          style={{ fontSize: "clamp(0.75rem, min(1.25vw, 2.2vh), 2rem)" }}
          data-progress={`${count}/${need}`}
        >
          <span aria-hidden>🎯</span>
          {revealed
            ? `${found.size} / ${puzzle.hotspots?.length ?? need} found`
            : full
              ? "Tap a marker to move it"
              : `${count} / ${need} selected`}
        </motion.span>
      </SceneFrame>
    </div>
  );
}

// --------------------------------------------------------------- SEQUENCE

function Sequence({ puzzle, response, onChange, phase }: ClickableProps) {
  const revealed = phase === "revealed";
  const answer = puzzle.options ?? [];
  // Shuffled while solving; the true order once revealed, so every card
  // travels to its slot.
  const shown = revealed ? answer : shuffledOptions(puzzle);
  const scene = sceneSrc(puzzle);

  // One line, always: a long step name is shortened rather than pushing the
  // last step onto a line of its own. The cards above carry the full text.
  const strip = (
    <div className="flex min-w-0 shrink-0 items-center justify-center gap-[clamp(0.3rem,0.8vw,1rem)]">
      {answer.map((_, step) => {
        const id = response.picks[step];
        const option = answer.find((o) => o.id === id);
        return (
          <span key={step} className="flex min-w-0 items-center gap-[clamp(0.3rem,0.8vw,1rem)]">
            {step > 0 && (
              <span aria-hidden className="shrink-0 font-black text-ink/30" style={{ fontSize: LABEL_SIZE }}>
                →
              </span>
            )}
            <span
              title={option?.label}
              className={`min-w-0 truncate rounded-full border-2 px-[clamp(0.6rem,1vw,1.4rem)] py-[clamp(0.2rem,0.5vh,0.6rem)] font-black uppercase tracking-wide ${
                option ? "text-white" : "border-dashed border-ink/20 text-ink/30"
              }`}
              style={{
                fontSize: DETAIL_SIZE,
                background: option ? PICK : undefined,
                borderColor: option ? PICK : undefined,
              }}
            >
              {step + 1}. {option ? option.label : "?"}
            </span>
          </span>
        );
      })}
    </div>
  );

  /*
   * Revealed, every card stands in its true slot with its true step number in
   * green — that row IS the answer, so nothing on it may look wrong. The room's
   * own order is a separate tag on each card: "✓ You put this 1st" or
   * "✗ You put this 3rd".
   */
  const cards = (
    <div
      className="grid min-h-0 w-full flex-1 grid-cols-[repeat(var(--n),minmax(0,1fr))] gap-[clamp(0.5rem,1.2vw,1.6rem)]"
      style={{ ["--n" as string]: answer.length }}
    >
      {shown.map((option, i) => {
        const at = response.picks.indexOf(option.id);
        const state: CardState = revealed ? "key" : at !== -1 ? "picked" : "idle";
        return (
          <CardShell
            key={option.id}
            puzzle={puzzle}
            option={option}
            index={i}
            state={state}
            multi={false}
            tall
            phase={phase}
            // While solving: the step this card was given (or nothing yet).
            // Revealed: its true step, since the cards now stand in order.
            badge={revealed ? i + 1 : at !== -1 ? at + 1 : "?"}
            flag={
              revealed
                ? at === -1
                  ? { text: "Not placed", ok: false }
                  : { text: `You put this ${ordinal(at + 1)}`, ok: at === i }
                : undefined
            }
            onPick={
              onChange && phase === "solving"
                ? () => onChange(toggleSequence(response, option.id))
                : undefined
            }
          />
        );
      })}
    </div>
  );

  return (
    <div className="flex h-full w-full gap-[clamp(0.6rem,1.6vw,2.4rem)]">
      {scene && (
        <div className="flex h-full min-w-0 flex-[0_1_34%] items-center justify-center" style={{ containerType: "size" }}>
          <SceneFrame src={scene} alt="Challenge photo" />
        </div>
      )}
      <div className="flex h-full min-w-0 flex-1 flex-col gap-[clamp(0.4rem,1.2vh,1.2rem)]">
        {revealed && (
          <p
            className="shrink-0 text-center font-black uppercase tracking-[0.18em] text-ren-green"
            style={{ fontSize: DETAIL_SIZE }}
          >
            The correct order · tags show where you placed each step
          </p>
        )}
        {cards}
        {!revealed && strip}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ EXPLANATION

const ANSWER_SIZE = "clamp(1.3rem, min(3vw, 5.2vh), 5.5rem)";
const EXPLANATION_SIZE = "clamp(0.95rem, min(1.7vw, 3vh), 3.6rem)";

/**
 * NAPE questions put the lesson first: a smaller answer line (the green card
 * above already shows it) and a much larger, easier-to-read fun fact.
 */
const NAPE_ANSWER_SIZE = "clamp(1.1rem, min(2.2vw, 3.8vh), 4rem)";
const NAPE_FACT_SIZE = "clamp(1.25rem, min(2.5vw, 4.4vh), 5rem)";

/** Replaces the usual answer block: the short answer, then the lesson. */
export function ClickableExplanation({ puzzle }: { puzzle: Puzzle }) {
  const nape = Boolean(puzzle.nape);
  return (
    <div data-clickable-explanation className="mx-auto flex max-w-[min(96%,1800px)] flex-col items-center gap-[clamp(0.2rem,0.8vh,0.8rem)]">
      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-ink-soft">
        The answer is
      </p>
      <p
        className="text-balance text-center font-black uppercase leading-[1.02] tracking-tight text-ren-green"
        style={{ fontSize: nape ? NAPE_ANSWER_SIZE : ANSWER_SIZE }}
      >
        {puzzle.answer}
      </p>
      {puzzle.insight && (
        <p
          data-fun-fact
          className={`text-balance rounded-[clamp(1rem,1.6vw,2rem)] border-2 border-ren-green/30 bg-ren-green-soft px-[clamp(1rem,2vw,3rem)] py-[clamp(0.4rem,1.1vh,1.4rem)] text-center font-bold leading-snug text-ink shadow-panel ${
            nape ? "max-w-[56ch]" : "max-w-[70ch]"
          }`}
          style={{ fontSize: nape ? NAPE_FACT_SIZE : EXPLANATION_SIZE }}
        >
          {nape && (
            <span className="mr-2 font-black uppercase tracking-wide text-ren-green-deep">Fun fact:</span>
          )}
          {puzzle.insight}
        </p>
      )}
    </div>
  );
}
