"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";

import {
  ADMIN_AUTH_ENABLED,
  PIN_DISCLAIMER,
  checkPin,
  isUnlocked,
  pinRequired,
  unlock,
} from "@/lib/adminAuth";
import { Btn, Callout, Field, TextInput } from "./ui";

/** Never emits — we only want the server/client snapshot split. */
const subscribeNoop = () => () => {};

/**
 * Blocks the question admin until the facilitator PIN is entered.
 *
 * Renders nothing until hydration: `isUnlocked()` and `pinRequired()` both read
 * browser storage, so deciding on the server would either flash the gate at
 * someone already unlocked or — worse — flash the question list at someone who
 * is not.
 */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-ink-soft">
          Loading…
        </p>
      </main>
    );
  }

  if (!ADMIN_AUTH_ENABLED || open || isUnlocked() || !pinRequired())
    return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkPin(entered)) {
      setError("That PIN is not right.");
      setEntered("");
      return;
    }
    unlock();
    setOpen(true);
  };

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-[min(26rem,100%)] rounded-2xl border border-ink/10 bg-white p-6 shadow-lift"
      >
        <h1 className="text-xl font-black text-ink">Manage questions</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Enter the facilitator PIN to continue.
        </p>

        <div className="mt-5">
          <Field label="Facilitator PIN" error={error ?? undefined}>
            {(props) => (
              <TextInput
                {...props}
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                autoFocus
                value={entered}
                onChange={(e) => {
                  setEntered(e.target.value);
                  setError(null);
                }}
                placeholder="••••"
              />
            )}
          </Field>
        </div>

        <Btn tone="primary" type="submit" className="mt-4 w-full">
          Unlock
        </Btn>

        <Callout tone="warn" className="mt-5">
          {PIN_DISCLAIMER}
        </Callout>

        <Link
          href="/"
          className="mt-4 block text-center text-xs font-bold text-ink-soft underline hover:text-ink"
        >
          Back to the game
        </Link>
      </form>
    </main>
  );
}
