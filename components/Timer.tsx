"use client";

import { useEffect, useRef, useState } from "react";
import { sound } from "@/lib/sound";

/**
 * Optional discussion timer. It counts down and then simply says TIME'S UP —
 * it never reveals the answer and never advances the game. The facilitator
 * stays in control of every transition.
 *
 * Resetting is done by REMOUNTING (the parent gives it a key per puzzle and
 * duration) rather than by syncing props into state inside an effect.
 */
export default function Timer({
  seconds,
  running,
}: {
  seconds: number;
  running: boolean;
}) {
  const [left, setLeft] = useState(seconds);
  const tickedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!running || left <= 0) return;
    const id = window.setInterval(() => {
      setLeft((prev) => {
        const next = Math.max(0, prev - 1);
        // A tick for each of the last five seconds — once each, never doubled.
        if (next <= 5 && next > 0 && tickedAt.current !== next) {
          tickedAt.current = next;
          void sound.play("tick");
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, left]);

  const done = left === 0;
  const urgent = left <= 10 && !done;
  const pct = seconds > 0 ? (left / seconds) * 100 : 0;

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-2 w-[clamp(4rem,10vw,9rem)] overflow-hidden rounded-full bg-ink/10">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-linear ${
            done ? "bg-ink/30" : urgent ? "bg-amber-500" : "bg-ren-green"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`min-w-[4.5rem] text-center text-sm font-black uppercase tracking-wide tabular-nums ${
          done ? "text-ink-soft" : urgent ? "text-amber-600" : "text-ink"
        }`}
      >
        {done ? "Time's up" : `${left}s`}
      </span>
    </div>
  );
}
