import { useRef, useEffect, useCallback } from 'react';

/**
 * Infinite auto-scrolling carousel hook.
 *
 * Strategy:
 * - The track contains [items] + [items] (duplicated).
 * - We translate the track leftward at a constant speed using rAF.
 * - When the offset reaches exactly one "set" width, we silently reset to 0.
 * - Arrow buttons, touch, and pointer interactions pause the auto-scroll
 *   and resume after ~3 s of inactivity.
 *
 * Set-width calculation:
 * With 2N flex children and (2N−1) gaps, `scrollWidth / 2` is off by half
 * a gap, causing a per-cycle drift that manifests as a periodic speed spike.
 * Instead we measure: setWidth = N × (cardWidth + gap).
 */

/** Pixels per second at normal speed */
const SPEED_PX_PER_SEC = 45;
/** Delay before auto-scroll resumes after manual interaction */
const RESUME_DELAY_MS = 3_000;
/** Max frame delta (ms) — caps jumps after tab switch or long pause */
const MAX_FRAME_DELTA_MS = 50;

export interface CategoryCarouselReturn {
  trackRef: React.RefObject<HTMLDivElement | null>;
  /** Call when the user clicks prev/next or interacts manually */
  scrollByCards: (direction: 'left' | 'right', cardsToScroll?: number) => void;
  /** Call to pause auto-scroll (e.g. on pointerdown / touchstart) */
  pauseAutoScroll: () => void;
  /** Call to schedule resume after the standard delay */
  scheduleResume: () => void;
}

export function useCategoryCarousel(
  itemCount: number,
): CategoryCarouselReturn {
  const trackRef = useRef<HTMLDivElement | null>(null);

  // --- mutable refs (no re-renders) ---
  const offsetRef = useRef(0);           // current translateX offset (positive = scrolled left)
  const rafRef = useRef(0);              // requestAnimationFrame id
  const prevTimeRef = useRef(0);         // timestamp of previous frame
  const pausedRef = useRef(false);       // is auto-scroll paused?
  const resumeTimerRef = useRef(0);      // setTimeout id for resume delay
  const setWidthRef = useRef(0);         // pixel width of one full set of items
  const reducedMotionRef = useRef(false);
  const mountedRef = useRef(true);
  const transitionTimerRef = useRef(0);  // fallback timeout for CSS transition cleanup

  // ---------- measure one-set width accurately ----------
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track || itemCount === 0) return;

    const firstChild = track.children[0] as HTMLElement | undefined;
    if (!firstChild) return;

    const style = getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || '0');
    const cardWidth = firstChild.offsetWidth;

    // One set = itemCount cards, each followed by a gap (the last gap sits
    // between set 1's last card and set 2's first card).
    setWidthRef.current = itemCount * (cardWidth + gap);
  }, [itemCount]);

  // ---------- animation loop ----------
  const tick = useCallback((timestamp: number) => {
    if (!mountedRef.current) return;

    // First frame after (re)start — just record the timestamp
    if (prevTimeRef.current === 0) {
      prevTimeRef.current = timestamp;
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const rawDelta = timestamp - prevTimeRef.current;
    prevTimeRef.current = timestamp;

    // Cap delta to prevent speed spikes (e.g. after tab switch, long pause,
    // or effect re-mount where prevTimeRef wasn't properly reset).
    const delta = Math.min(rawDelta, MAX_FRAME_DELTA_MS);

    if (!pausedRef.current && !reducedMotionRef.current && setWidthRef.current > 0) {
      offsetRef.current += (SPEED_PX_PER_SEC * delta) / 1000;

      // Seamless wrap: once we've scrolled one full set, jump back
      if (offsetRef.current >= setWidthRef.current) {
        offsetRef.current -= setWidthRef.current;
      }
      // Handle negative (reverse overshoot from arrow navigation)
      if (offsetRef.current < 0) {
        offsetRef.current += setWidthRef.current;
      }

      const track = trackRef.current;
      if (track) {
        track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // ---------- pause / resume helpers ----------
  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = 0;
    }
  }, []);

  const pauseAutoScroll = useCallback(() => {
    pausedRef.current = true;
    clearResumeTimer();
  }, [clearResumeTimer]);

  const scheduleResume = useCallback(() => {
    clearResumeTimer();
    resumeTimerRef.current = window.setTimeout(() => {
      // Ensure any lingering CSS transition is removed before rAF resumes
      const track = trackRef.current;
      if (track) {
        track.style.transition = '';
      }
      pausedRef.current = false;
      prevTimeRef.current = 0;   // reset so first tick doesn't calculate a huge delta
    }, RESUME_DELAY_MS);
  }, [clearResumeTimer]);

  // ---------- arrow navigation ----------
  const scrollByCards = useCallback(
    (direction: 'left' | 'right', cardsToScroll = 1) => {
      const track = trackRef.current;
      if (!track || itemCount === 0) return;

      // Determine single-card width from the first child
      const firstChild = track.children[0] as HTMLElement | undefined;
      if (!firstChild) return;

      const style = getComputedStyle(track);
      const gap = parseFloat(style.columnGap || style.gap || '0');
      const cardWidth = firstChild.offsetWidth + gap;
      const jump = cardWidth * cardsToScroll;

      pauseAutoScroll();

      // Clear any pending transition cleanup timer
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = 0;
      }

      if (direction === 'right') {
        offsetRef.current += jump;
      } else {
        offsetRef.current -= jump;
      }

      // Keep within [0, setWidth)
      const sw = setWidthRef.current;
      if (sw > 0) {
        offsetRef.current = ((offsetRef.current % sw) + sw) % sw;
      }

      // Apply CSS transition for smooth arrow-click animation
      track.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)';
      track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;

      // Use a timeout to reliably clear the CSS transition — transitionend can
      // fail to fire if the transition is interrupted by rapid clicks or if
      // the element is not in view.
      transitionTimerRef.current = window.setTimeout(() => {
        track.style.transition = '';
        transitionTimerRef.current = 0;
      }, 550);

      scheduleResume();
    },
    [itemCount, pauseAutoScroll, scheduleResume],
  );

  // ---------- lifecycle ----------
  useEffect(() => {
    mountedRef.current = true;
    prevTimeRef.current = 0;   // Always reset — prevents huge delta on first tick

    // Detect prefers-reduced-motion
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mql.matches;
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mql.addEventListener('change', onMotionChange);

    // Measure & start
    measure();
    rafRef.current = requestAnimationFrame(tick);

    // Re-measure on resize (card widths change with responsive breakpoints)
    const ro = new ResizeObserver(() => {
      measure();
    });
    if (trackRef.current) {
      ro.observe(trackRef.current);
    }

    // Pointer / touch interaction listeners on the track container
    const track = trackRef.current;
    const onInteractStart = () => { pauseAutoScroll(); };
    const onInteractEnd = () => { scheduleResume(); };

    if (track) {
      track.addEventListener('pointerdown', onInteractStart);
      track.addEventListener('touchstart', onInteractStart, { passive: true });
      track.addEventListener('pointerup', onInteractEnd);
      track.addEventListener('touchend', onInteractEnd);
      track.addEventListener('pointerleave', onInteractEnd);
    }

    return () => {
      mountedRef.current = false;
      prevTimeRef.current = 0;
      cancelAnimationFrame(rafRef.current);
      clearTimeout(resumeTimerRef.current);
      clearTimeout(transitionTimerRef.current);
      mql.removeEventListener('change', onMotionChange);
      ro.disconnect();
      if (track) {
        track.removeEventListener('pointerdown', onInteractStart);
        track.removeEventListener('touchstart', onInteractStart);
        track.removeEventListener('pointerup', onInteractEnd);
        track.removeEventListener('touchend', onInteractEnd);
        track.removeEventListener('pointerleave', onInteractEnd);
      }
    };
  }, [itemCount, measure, tick, pauseAutoScroll, scheduleResume]);

  return { trackRef, scrollByCards, pauseAutoScroll, scheduleResume };
}
