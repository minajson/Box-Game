"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useFocusTrap } from "@/lib/useFocusTrap";
import { Btn, type BtnTone } from "./ui";

/**
 * The one confirmation dialog. Used for delete, restore-defaults and
 * discard-unsaved-changes.
 *
 * Two deliberate choices:
 *
 * 1. CANCEL takes the autofocus, not the destructive button. A dialog that opens
 *    with "Delete" focused turns a reflexive Enter into data loss.
 * 2. Actions are `flex-col-reverse sm:flex-row`, so the primary action is
 *    bottom-right on a desktop and TOP of the stack on a phone — where the
 *    thumb is, and where it cannot be hit by accident while reaching for it.
 */

export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: BtnTone;
  /** Disables both buttons while a save is in flight. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel, open, onCancel);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onCancel}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={body ? "confirm-body" : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[min(28rem,100%)] rounded-2xl border border-ink/10 bg-white p-6 shadow-lift"
          >
            <h2 id="confirm-title" className="text-lg font-black text-ink">
              {title}
            </h2>

            {body && (
              <div
                id="confirm-body"
                className="mt-2 text-sm leading-relaxed text-ink-soft"
              >
                {body}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Btn data-autofocus onClick={onCancel} disabled={busy}>
                {cancelLabel}
              </Btn>
              <Btn tone={tone} onClick={onConfirm} disabled={busy}>
                {busy ? "Working…" : confirmLabel}
              </Btn>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
