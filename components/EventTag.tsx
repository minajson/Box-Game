/**
 * The only event branding in the game: a small, elegant identifier with a
 * green highlight. No logo, no logo placeholder, no sidebar — it takes up a
 * single line in the corner and never competes with the puzzle.
 */
export default function EventTag({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2.5 whitespace-nowrap ${className}`}
    >
      <span
        aria-hidden
        className="w-1.5 rounded-full bg-ren-green shadow-[0_0_12px_rgb(15_169_88/0.6)]"
        style={{ height: "clamp(1.1rem, 1.7vw, 1.7rem)" }}
      />
      <span
        className="font-bold uppercase tracking-[0.18em] text-ink"
        style={{ fontSize: "clamp(0.85rem, 1.35vw, 1.25rem)" }}
      >
        Renaissance{" "}
        <span className="text-ren-green-deep">People Day</span>
      </span>
    </div>
  );
}
