import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/** Movement (px) below which a scroll / swipe / wheel is treated as noise */
const MIN_SCROLL_DELTA = 10;
/** A page scroll this soon after a wheel/swipe inside the popup is scroll chaining, not a page scroll */
const INSIDE_GESTURE_GRACE_MS = 250;

/**
 * Calls `onClose` when the user scrolls the page while a popup is open.
 *
 * - Listeners exist only while `isOpen` is true; they are attached one frame after
 *   opening (so the opening click / any layout scroll it causes is ignored) and
 *   removed on close and on unmount.
 * - Window scrolls close only after the position really moved (≥ 10px).
 * - Wheel and touch-drag gestures also close (they cover layouts that scroll an
 *   inner container instead of the window). Programmatic element scrolls such as
 *   auto-scrolling carousels are deliberately not listened to.
 * - Anything that starts inside `containerRef` (e.g. scrolling the popup's own
 *   list) never closes it, including the page scroll it chains into at the list's end.
 */
export const useCloseOnScroll = (
  isOpen: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void
) => {
  // Latest close callback without re-attaching listeners on every render
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const isInside = (target: EventTarget | null) =>
      target instanceof Node && !!containerRef.current?.contains(target);

    let startX = 0;
    let startY = 0;
    let lastInsideGestureAt = 0;
    let wheelDistance = 0;
    let touchStart: { x: number; y: number } | null = null;
    let closed = false;

    const close = () => {
      if (closed) return;
      closed = true;
      onCloseRef.current();
    };

    const onScroll = () => {
      if (Date.now() - lastInsideGestureAt < INSIDE_GESTURE_GRACE_MS) {
        // Scroll chained out of the popup's list: move the baseline, keep it open
        startX = window.scrollX;
        startY = window.scrollY;
        return;
      }
      if (Math.abs(window.scrollY - startY) >= MIN_SCROLL_DELTA || Math.abs(window.scrollX - startX) >= MIN_SCROLL_DELTA) {
        close();
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (isInside(e.target)) {
        lastInsideGestureAt = Date.now();
        return;
      }
      // deltaMode 1/2 = lines/pages: always a real scroll
      wheelDistance += e.deltaMode === 0 ? Math.abs(e.deltaX) + Math.abs(e.deltaY) : MIN_SCROLL_DELTA;
      if (wheelDistance >= MIN_SCROLL_DELTA) close();
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStart = t && !isInside(e.target) ? { x: t.clientX, y: t.clientY } : null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isInside(e.target)) {
        lastInsideGestureAt = Date.now();
        return;
      }
      const t = e.touches[0];
      if (!t || !touchStart) return;
      if (Math.abs(t.clientY - touchStart.y) >= MIN_SCROLL_DELTA || Math.abs(t.clientX - touchStart.x) >= MIN_SCROLL_DELTA) {
        close();
      }
    };

    const options: AddEventListenerOptions = { passive: true, capture: true };
    let attached = false;
    // Attach after the popup has rendered, not in the same tick as the opening click
    const frame = requestAnimationFrame(() => {
      startX = window.scrollX;
      startY = window.scrollY;
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('wheel', onWheel, options);
      window.addEventListener('touchstart', onTouchStart, options);
      window.addEventListener('touchmove', onTouchMove, options);
      attached = true;
    });

    return () => {
      cancelAnimationFrame(frame);
      if (!attached) return;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel, options);
      window.removeEventListener('touchstart', onTouchStart, options);
      window.removeEventListener('touchmove', onTouchMove, options);
    };
  }, [isOpen, containerRef]);
};
