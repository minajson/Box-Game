"use client";

import { useEffect, useRef } from "react";

/**
 * Canvas confetti for a CORRECT answer and the final celebration.
 *
 * Draws on a full-screen, pointer-transparent canvas above everything and
 * cleans itself up once the last piece falls off the bottom, so it never
 * competes with the mascot for the GPU for longer than it needs to.
 */

const COLORS = ["#0fa958", "#f59e0b", "#3b9df7", "#ec4899", "#a855f7", "#f43f5e", "#ffffff"];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  round: boolean;
}

export default function Confetti({
  active,
  pieces = 160,
  duration = 4200,
}: {
  active: boolean;
  pieces?: number;
  duration?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    // Two cannons, firing inward from the lower corners.
    const confetti: Piece[] = Array.from({ length: pieces }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const spread = (Math.random() - 0.5) * 7;
      return {
        x: fromLeft ? -20 : w + 20,
        y: h * (0.55 + Math.random() * 0.3),
        vx: (fromLeft ? 1 : -1) * (7 + Math.random() * 9),
        vy: -(9 + Math.random() * 9) + spread,
        size: 6 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.3,
        round: Math.random() > 0.65,
      };
    });

    const started = performance.now();
    const GRAVITY = 0.28;
    const DRAG = 0.992;

    const tick = (now: number) => {
      const elapsed = now - started;
      ctx.clearRect(0, 0, w, h);

      let alive = 0;
      for (const p of confetti) {
        p.vy += GRAVITY;
        p.vx *= DRAG;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;

        if (p.y > h + 30) continue;
        alive += 1;

        // Fade the whole field out over the last second.
        const fade = Math.max(0, Math.min(1, (duration - elapsed) / 1000));
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }

      if (alive > 0 && elapsed < duration) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, w, h);
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      ctx.clearRect(0, 0, w, h);
    };
  }, [active, pieces, duration]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[70]"
    />
  );
}
