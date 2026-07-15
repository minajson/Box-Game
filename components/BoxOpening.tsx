"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MysteryBox, { colorForBox } from "./MysteryBox";
import { sound } from "@/lib/sound";
import type { Puzzle } from "@/lib/types";

/**
 * The opening sequence. Roughly five seconds, beat for beat:
 *
 *   0.00s  backdrop darkens; the chosen box flies from the wall to the centre
 *          and scales up
 *   0.75s  the box starts shaking; the suspense riser begins
 *   1.05s  3 … 2 … 1 countdown, one tick per number
 *   2.80s  the lid blows off — flash, particle burst
 *   3.25s  the category slams in ("SCRAMBLE IT!")
 *   4.90s  hand over to the puzzle screen
 *
 * The music ducks for the whole sequence and is released on the way out, so
 * the countdown reads clearly over the top of it.
 */

type Beat = "fly" | "shake" | "count" | "burst" | "category";

const PARTICLE_COUNT = 30;

export default function BoxOpening({
  puzzle,
  originRect,
  onComplete,
}: {
  puzzle: Puzzle;
  originRect: DOMRect | null;
  onComplete: () => void;
}) {
  const [beat, setBeat] = useState<Beat>("fly");
  const [count, setCount] = useState(3);
  const timers = useRef<number[]>([]);
  const duckedRef = useRef(false);

  // The box lands at a fixed size in the middle of the screen; we animate in
  // from wherever it was sitting on the wall.
  const target = 320;
  const offset = originRect
    ? {
        x: originRect.left + originRect.width / 2 - window.innerWidth / 2,
        y: originRect.top + originRect.height / 2 - window.innerHeight / 2,
        scale: originRect.width / target,
      }
    : { x: 0, y: 0, scale: 0.4 };

  useEffect(() => {
    sound.duck();
    duckedRef.current = true;

    const after = (ms: number, fn: () => void) => {
      timers.current.push(window.setTimeout(fn, ms));
    };

    after(750, () => {
      setBeat("shake");
      void sound.play("suspense");
    });

    after(1050, () => {
      setBeat("count");
      setCount(3);
      void sound.play("tick");
    });
    after(1600, () => {
      setCount(2);
      void sound.play("tick");
    });
    after(2150, () => {
      setCount(1);
      void sound.play("tick");
    });

    after(2800, () => {
      setBeat("burst");
      void sound.play("burst");
    });

    after(3250, () => {
      setBeat("category");
      void sound.play("reveal");
    });

    after(4900, onComplete);

    return () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      sound.stopAll();
      if (duckedRef.current) {
        sound.unduck();
        duckedRef.current = false;
      }
    };
  }, [onComplete]);

  const lidOpen = beat === "burst" || beat === "category";
  const showBox = beat !== "category";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop — subtly darkens the wall behind, never a black-out */}
      <motion.div
        className="absolute inset-0 bg-ink/55 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        {/* ---- The box flying in, shaking, then bursting ---- */}
        <AnimatePresence>
          {showBox && (
            <motion.div
              key="box"
              className="relative"
              style={{ width: target, height: target }}
              initial={{ x: offset.x, y: offset.y, scale: offset.scale, opacity: 0.9 }}
              animate={{
                x: 0,
                y: 0,
                scale: 1,
                opacity: 1,
                transition: { type: "spring", stiffness: 130, damping: 18, mass: 0.9 },
              }}
              exit={{ opacity: 0, scale: 1.35, transition: { duration: 0.32 } }}
            >
              {/* Glow that swells as the suspense builds */}
              <motion.div
                aria-hidden
                className="absolute -inset-16 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgb(255 255 255 / 0.5) 0%, rgb(255 255 255 / 0) 68%)",
                }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{
                  opacity: beat === "fly" ? 0.25 : 0.75,
                  scale: beat === "burst" ? 1.5 : 1,
                }}
                transition={{ duration: 0.8 }}
              />

              <MysteryBox
                boxNumber={puzzle.boxNumber}
                opened={false}
                lidOpen={lidOpen}
                shaking={beat === "shake" || beat === "count"}
                still
              />

              {/* Countdown, sitting right on the box */}
              <AnimatePresence mode="popLayout">
                {beat === "count" && (
                  <motion.div
                    key={count}
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    initial={{ scale: 2.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.55, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 20 }}
                  >
                    <span
                      className="font-black leading-none text-white"
                      style={{
                        fontSize: "13rem",
                        textShadow:
                          "0 0 40px rgb(15 169 88 / 0.9), 0 10px 30px rgb(18 35 59 / 0.6)",
                      }}
                    >
                      {count}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- Burst: flash + particles ---- */}
        <AnimatePresence>
          {(beat === "burst" || beat === "category") && (
            <>
              <motion.div
                key="flash"
                className="pointer-events-none absolute inset-0 bg-white"
                initial={{ opacity: 0.85 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
              <Particles key="particles" boxNumber={puzzle.boxNumber} />
            </>
          )}
        </AnimatePresence>

        {/* ---- The category reveal ---- */}
        <AnimatePresence>
          {beat === "category" && (
            <motion.div
              key="category"
              className="pointer-events-none absolute inset-x-0 flex flex-col items-center px-6"
              initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
            >
              <span className="mb-4 rounded-full bg-white/95 px-5 py-1.5 text-sm font-black uppercase tracking-[0.28em] text-ink shadow-lift">
                Box {puzzle.boxNumber}
              </span>
              <h2
                className="text-center font-black uppercase leading-[0.95] tracking-tight text-white"
                style={{
                  fontSize: "clamp(2.8rem, 8vw, 7.5rem)",
                  textShadow:
                    "0 0 60px rgb(15 169 88 / 0.75), 0 12px 40px rgb(18 35 59 / 0.55)",
                }}
              >
                {puzzle.categoryLabel}
              </h2>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Confetti-coloured shards thrown out of the box as the lid blows off. */
function Particles({ boxNumber }: { boxNumber: number }) {
  const tint = colorForBox(boxNumber);
  const colors = ["#0fa958", "#f59e0b", "#3b9df7", "#ec4899", "#a855f7", "#ffffff"];

  const shards = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    // Deterministic spread — no Math.random, so every rehearsal looks the same.
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (boxNumber % 5) * 0.21;
    const distance = 200 + ((i * 47 + boxNumber * 13) % 260);
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 60, // bias upward, out of the box
      rotate: ((i * 73) % 360) - 180,
      size: 9 + ((i * 31) % 16),
      color: colors[i % colors.length],
      round: i % 3 === 0,
    };
  });

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      data-tint={tint}
    >
      {shards.map((s) => (
        <motion.span
          key={s.id}
          className="absolute"
          style={{
            width: s.size,
            height: s.round ? s.size : s.size * 0.45,
            background: s.color,
            borderRadius: s.round ? "9999px" : "2px",
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
          animate={{
            x: s.x,
            y: s.y + 180, // gravity pulls the shards down as they fly out
            opacity: 0,
            scale: 1,
            rotate: s.rotate,
          }}
          transition={{ duration: 1.5, ease: [0.16, 0.8, 0.4, 1] }}
        />
      ))}
    </div>
  );
}
