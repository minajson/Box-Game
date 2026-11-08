"use client";

import type { ManagedPuzzle } from "@/lib/types";
import { EVENTS, EVENT_IDS, type EventId } from "@/data/events";
import { Badge, Btn } from "./ui";

/**
 * The selected event and what is actually playable right now — the answer to
 * "which game is this laptop running, and is it the right size?" Always at the
 * top of the admin, never behind a menu.
 *
 * Switching event only changes which questions are Active and in what order;
 * nothing is created, copied or deleted. Hidden questions keep everything.
 */
export default function EventPanel({
  event,
  bank,
  onSwitch,
  onReset,
  onReport,
}: {
  event: EventId;
  bank: ManagedPuzzle[];
  onSwitch: (to: EventId) => void;
  onReset: () => void;
  onReport: () => void;
}) {
  const preset = EVENTS[event];
  const active = bank.filter((p) => p.active);
  const napeActive = active.filter((p) => p.nape).length;
  const originalActive = active.filter((p) => !p.nape && p.uid.startsWith("seed-")).length;
  const customActive = active.length - napeActive - originalActive;
  const hidden = bank.length - active.length;
  const exact = active.length === preset.playable;

  return (
    <section
      aria-label="Selected event"
      data-event-panel
      className="rounded-2xl border border-ink/10 bg-white p-4 shadow-panel sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-soft">
            Selected event
          </p>
          <h2 data-event-name className="text-2xl font-black tracking-tight text-ren-green-deep sm:text-3xl">
            {preset.name}
          </h2>
          <p className="mt-1 max-w-[62ch] text-xs text-ink-soft">{preset.description}</p>
        </div>

        <div className="flex flex-wrap items-stretch gap-2.5">
          <Stat label="Active boxes" value={active.length} tone={exact ? "green" : "amber"} testId="active-count" />
          <Stat label="Hidden" value={hidden} tone="neutral" testId="hidden-count" />
          <Stat label="In the bank" value={bank.length} tone="neutral" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-ink-soft">
        <Badge tone={exact ? "green" : "amber"}>
          {exact ? `✓ Exactly ${preset.playable} playable` : `${active.length} active — this event is set up for ${preset.playable}`}
        </Badge>
        {napeActive > 0 && <Badge tone="sky">{napeActive} Oil &amp; Gas</Badge>}
        {originalActive > 0 && <Badge tone="sky">{originalActive} original</Badge>}
        {customActive > 0 && <Badge tone="neutral">{customActive} added by you</Badge>}
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Choose event">
        {EVENT_IDS.map((id) => {
          const e = EVENTS[id];
          const on = id === event;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              data-event-option={id}
              onClick={() => !on && onSwitch(id)}
              className={`rounded-xl border-2 p-3 text-left transition ${
                on
                  ? "border-ren-green bg-ren-green-soft"
                  : "border-ink/12 bg-white hover:border-ren-green/50 hover:bg-ink/[0.02]"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-black text-ink">{e.name}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-soft">
                  {on ? "Selected" : "Switch to this"}
                </span>
              </span>
              <span className="mt-1 block text-xs text-ink-soft">{e.description}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn size="sm" onClick={onReset} title="Clear Active/Hidden choices and order for this event and restore any deleted bundled question. Your edits to question content are kept.">
          Reset this event to its preset
        </Btn>
        <Btn size="sm" onClick={onReport}>
          Download NAPE review report (CSV)
        </Btn>
        <span className="text-[11px] text-ink-soft">
          Switching events never deletes or duplicates a question.
        </span>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "neutral";
  testId?: string;
}) {
  const tones = {
    green: "border-ren-green/30 bg-ren-green-soft text-ren-green-deep",
    amber: "border-amber-300 bg-amber-50 text-amber-800",
    neutral: "border-ink/10 bg-ink/[0.03] text-ink",
  };
  return (
    <div className={`flex min-w-[6.5rem] flex-col rounded-xl border px-3.5 py-2 ${tones[tone]}`}>
      <span data-testid={testId} className="text-2xl font-black leading-none">
        {value}
      </span>
      <span className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-75">
        {label}
      </span>
    </div>
  );
}
