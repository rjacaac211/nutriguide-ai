import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Escape-to-close, a Tab focus trap, and focus restoration for a modal dialog.
 * Focusable elements are re-queried live on every Tab press rather than cached,
 * since a modal's content can swap sub-views while it stays open.
 */
export function useModalA11y(isOpen, onClose, containerRef) {
  const onCloseRef = useRef(onClose);
  const previouslyFocusedRef = useRef(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Capture the pre-open focus target synchronously during render, before
  // this same commit's DOM mutations (including a child's `autoFocus`, e.g.
  // AddFoodModal's search input) can steal it — an effect runs too late,
  // since React applies autoFocus during commit, ahead of any effect hook.
  if (isOpen && !wasOpenRef.current) {
    previouslyFocusedRef.current = document.activeElement;
  }
  wasOpenRef.current = isOpen;

  useEffect(() => {
    if (!isOpen) return undefined;

    const container = containerRef.current;
    if (!container) return undefined;

    const getFocusable = () => Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));

    const focusInto = () => {
      const items = getFocusable();
      // Prefer a real field over the × close button as the initial focus target.
      const preferred = items.find((el) => !el.classList.contains("modal-close"));
      (preferred ?? items[0] ?? container).focus();
    };

    if (!container.contains(document.activeElement)) {
      focusInto();
    }

    // Some modals swap their focusable content shortly after opening (e.g.
    // EditFoodModal briefly shows real fields, then an in-flight fetch swaps
    // them for "Loading portions..." text) — removing the just-focused
    // element from the DOM silently drops focus to <body>. Re-run the same
    // "focus something inside the modal" logic whenever the modal's content
    // changes and focus has fallen outside it.
    const observer = new MutationObserver(() => {
      if (!container.contains(document.activeElement)) {
        focusInto();
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", handleKeyDown);
      const toRestore = previouslyFocusedRef.current;
      if (toRestore && toRestore.isConnected && typeof toRestore.focus === "function") {
        try {
          toRestore.focus();
        } catch {
          // Element may no longer be focusable; ignore.
        }
      }
    };
  }, [isOpen, containerRef]);
}
