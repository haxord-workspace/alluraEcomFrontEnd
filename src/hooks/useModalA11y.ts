import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Reviews module dialog behaviour: focus trap, Esc to close, body scroll lock and
 * focus restore on close. Used only by components/reviews dialogs.
 */
export const useModalA11y = (
  isOpen: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void
) => {
  // Keep the latest onClose without re-running the effect on every render
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () =>
      Array.from(containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) || []).filter(
        el => el.offsetParent !== null || el === document.activeElement
      );

    // Prefer an explicitly marked element (e.g. the first field), else the first focusable
    const initial =
      containerRef.current?.querySelector<HTMLElement>('[data-autofocus]') || focusables()[0];
    (initial || containerRef.current)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      // A dialog stacked on top (lightbox, confirm) owns the keyboard while focused
      const container = containerRef.current;
      if (container && e.target instanceof Node && e.target !== document.body && !container.contains(e.target)) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, containerRef]);
};
