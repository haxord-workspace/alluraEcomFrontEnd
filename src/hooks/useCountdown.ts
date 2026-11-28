import { useSyncExternalStore } from 'react';

/**
 * One shared setInterval ticking app-wide, exposed via useSyncExternalStore so each
 * subscriber (e.g. a PromotionCountdown) re-renders independently — never the parent
 * section. Paused while the tab is hidden and resynced on visibilitychange.
 */
let now = Date.now();
const listeners = new Set<() => void>();
let intervalId: number | null = null;

const tick = () => {
  now = Date.now();
  listeners.forEach((listener) => listener());
};

const startInterval = () => {
  if (intervalId !== null || typeof window === 'undefined') return;
  intervalId = window.setInterval(tick, 1000);
};

const stopInterval = () => {
  if (intervalId === null) return;
  window.clearInterval(intervalId);
  intervalId = null;
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopInterval();
    } else {
      tick();
      if (listeners.size > 0) startInterval();
    }
  });
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  startInterval();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopInterval();
  };
};

const getSnapshot = () => now;

function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export interface CountdownState {
  label: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalHours: number;
  remainingMs: number;
  isExpired: boolean;
  /** Within the final hour — used to trigger subtle pulse */
  isLastHour: boolean;
  ariaLabel: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Calculates remaining time until `expiresAt`.
 * Updates every second, never returns negative values, and stops when expired.
 */
export function useCountdown(expiresAt: string | null | undefined): CountdownState {
  const currentNow = useNow();
  const target = expiresAt ? new Date(expiresAt).getTime() : NaN;
  const remainingMs = Number.isFinite(target) ? Math.max(0, target - currentNow) : 0;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const totalHours = Math.floor(totalSeconds / 3600);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const label =
    days > 0
      ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(totalHours)}:${pad(minutes)}:${pad(seconds)}`;

  const ariaLabel =
    days > 0
      ? `Ends in ${days} days ${hours} hours ${minutes} minutes`
      : `Ends in ${totalHours} hours ${minutes} minutes`;

  return {
    label,
    days,
    hours,
    minutes,
    seconds,
    totalHours,
    remainingMs,
    isExpired: remainingMs <= 0,
    isLastHour: remainingMs > 0 && remainingMs <= 3600_000,
    ariaLabel,
  };
}
