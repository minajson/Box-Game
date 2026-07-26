"use client";

import { useId } from "react";

/**
 * Admin form and layout primitives.
 *
 * These exist so the question admin looks like the rest of the game (same ink /
 * green tokens, same rounded-xl panels) without a single new global CSS rule —
 * `app/globals.css` is shared with the PROJECTED game, so an `.admin-*` rule
 * there risks a specificity accident on stage.
 *
 * Every input is label-associated through `Field`, which owns the id/aria wiring
 * so an individual editor cannot forget it.
 */

/* ---------------------------------------------------------------- Field -- */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className = "",
}: {
  label: string;
  /** Quiet helper text under the control. */
  hint?: string;
  /** Validation message. Announced, and it replaces the hint visually. */
  error?: string;
  required?: boolean;
  /** Receives the generated id and aria wiring. */
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
    "aria-required"?: boolean;
  }) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className="text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft"
      >
        {label}
        {required && (
          <span className="ml-1 text-red-600" aria-hidden>
            *
          </span>
        )}
      </label>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        "aria-required": required || undefined,
      })}

      {error ? (
        <p id={`${id}-error`} className="text-xs font-semibold text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- inputs -- */

const CONTROL =
  "w-full min-w-0 rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-ink " +
  "placeholder:font-normal placeholder:text-ink-soft/60 disabled:cursor-not-allowed disabled:bg-ink/[0.03] disabled:text-ink-soft";

function borderFor(invalid?: boolean): string {
  return invalid ? "border-red-400" : "border-ink/15";
}

export function TextInput({
  invalid,
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      type="text"
      {...rest}
      className={`${CONTROL} ${borderFor(invalid ?? rest["aria-invalid"] === true)} ${className}`}
    />
  );
}

export function TextArea({
  invalid,
  className = "",
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      rows={2}
      {...rest}
      className={`${CONTROL} resize-y leading-relaxed ${borderFor(
        invalid ?? rest["aria-invalid"] === true,
      )} ${className}`}
    />
  );
}

export function Select({
  invalid,
  className = "",
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      {...rest}
      className={`${CONTROL} ${borderFor(invalid ?? rest["aria-invalid"] === true)} ${className}`}
    >
      {children}
    </select>
  );
}

/** A labelled select that does not need the full Field treatment (toolbars). */
export function InlineSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor={id}
        className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-soft"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 rounded-xl border border-ink/15 bg-white px-2.5 py-1.5 text-xs font-bold text-ink"
      >
        {children}
      </select>
    </div>
  );
}

/* ------------------------------------------------------------- Segmented -- */

/**
 * A radio group that looks like a segmented control. Used for difficulty and
 * the media picker tabs — a real `radiogroup`, so arrow keys work.
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-xl border border-ink/15 bg-white p-0.5"
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`rounded-[10px] px-3 py-1.5 text-xs font-bold transition ${
              selected
                ? "bg-ren-green text-white shadow-panel"
                : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- Toggle -- */

/** Matches the switch in components/AdminPanel.tsx so the two read as one app. */
export function Toggle({
  label,
  checked,
  onChange,
  hint,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-soft">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
          checked ? "bg-ren-green" : "bg-ink/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[1.4rem]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------- Btn -- */

export type BtnTone = "primary" | "neutral" | "ghost" | "danger" | "amber";

const TONES: Record<BtnTone, string> = {
  primary:
    "border-ren-green-deep/30 bg-ren-green text-white hover:bg-ren-green-deep shadow-panel",
  neutral: "border-ink/12 bg-white text-ink hover:bg-ink/[0.04]",
  ghost: "border-transparent bg-transparent text-ink-soft hover:bg-ink/[0.05] hover:text-ink",
  danger: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  amber: "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
};

export function Btn({
  tone = "neutral",
  size = "md",
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: BtnTone;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${pad} ${TONES[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

/** A square icon-only button. `label` is mandatory — it becomes the aria-label. */
export function IconBtn({
  label,
  tone = "ghost",
  size = "md",
  className = "",
  children,
  ...rest
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  label: string;
  tone?: BtnTone;
  /** md is a 36px touch target; sm (24px) is for tight inline clusters. */
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-6 w-6 rounded-lg" : "h-9 w-9 rounded-xl";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={`inline-flex shrink-0 items-center justify-center border transition disabled:cursor-not-allowed disabled:opacity-30 ${box} ${TONES[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------- Badge / Chip -- */

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "green" | "red" | "amber" | "sky";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "bg-ink/[0.06] text-ink-soft",
    green: "bg-ren-green-soft text-ren-green-deep",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-800",
    sky: "bg-sky-50 text-sky-800",
  };
  return (
    // max-w-full + truncate so a long label (e.g. the "What Connects Them" type)
    // is clipped inside its grid track instead of spilling over the next column.
    <span
      className={`inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** A removable filter pill. */
export function Chip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ink/12 bg-white px-2.5 py-1 text-xs font-bold text-ink">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${
          typeof children === "string" ? children : "filter"
        }`}
        className="-mr-1 rounded-full px-1 text-sm leading-none text-ink-soft hover:bg-ink/5 hover:text-ink"
      >
        ×
      </button>
    </span>
  );
}

/* --------------------------------------------------------------- Callout -- */

export function Callout({
  tone = "info",
  title,
  children,
  className = "",
}: {
  tone?: "info" | "warn" | "error" | "success";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-ink/12 bg-white text-ink-soft",
    warn: "border-amber-300 bg-amber-50 text-amber-900",
    error: "border-red-300 bg-red-50 text-red-800",
    success: "border-ren-green/40 bg-ren-green-soft text-ren-green-deep",
  };
  return (
    <div
      className={`rounded-xl border px-3.5 py-3 text-xs leading-relaxed ${tones[tone]} ${className}`}
    >
      {title && <p className="mb-1 text-sm font-black">{title}</p>}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------- Section -- */

export function Section({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-white/80 p-4 shadow-panel backdrop-blur sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-ink">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{description}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Visually hidden but read aloud — for table cell labels on mobile. */
export function SrOnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute h-px w-px overflow-hidden whitespace-nowrap [clip:rect(0,0,0,0)]">
      {children}
    </span>
  );
}
