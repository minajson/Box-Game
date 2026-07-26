"use client";

import { useEffect } from "react";

/**
 * Make a container behave like a modal dialog for keyboard users:
 *
 *   - focus moves inside on open (to `[data-autofocus]` if present)
 *   - Tab and Shift+Tab cycle within the container instead of escaping to the
 *     page behind it
 *   - Esc calls `onEscape`
 *   - the page behind cannot be scrolled
 *   - focus returns to whatever was focused before, on close
 *
 * Focus restoration is the part that is easy to skip and most obvious when
 * missing: without it, dismissing a delete confirmation drops the caret back to
 * the top of the document and the admin loses their place in a 50-row list.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useFocusTrap(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  onEscape: () => void,
): void {
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    const previous = document.activeElement as HTMLElement | null;

    // Lock the page behind the dialog. Preserve whatever was there so we do not
    // clobber a caller that had its own overflow rule.
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Prefer an explicitly-marked control (Cancel, on a destructive dialog).
    const autofocus = node.querySelector<HTMLElement>("[data-autofocus]");
    (autofocus ?? node).focus?.();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;

      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        // offsetParent is null for display:none; a dialog can hold hidden tabs.
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (e.shiftKey && (current === first || !node.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = bodyOverflow;
      previous?.focus?.();
    };
  }, [ref, active, onEscape]);
}
