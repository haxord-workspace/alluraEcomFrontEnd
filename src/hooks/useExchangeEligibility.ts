import { useEffect, useState } from 'react';
import type { Order } from '../types';
import { getExchangeEligibility, type ExchangeEligibility } from '../utils/exchangeEligibility';

/** Browsers cap setTimeout at 2^31-1 ms (~24.8 days) */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Exchange eligibility that re-evaluates itself: a timer fires at the deadline so the Exchange
 * button disappears without a refresh, and returning to the tab re-checks (background tabs
 * may delay timers).
 */
export const useExchangeEligibility = (order: Order | undefined): ExchangeEligibility | null => {
  const [now, setNow] = useState(() => Date.now());
  const eligibility = order ? getExchangeEligibility(order, now) : null;
  const deadlineMs = eligibility?.eligible ? eligibility.deadline.getTime() : null;

  useEffect(() => {
    // Order changed (e.g. fresh copy from the API): re-check against the current time
    setNow(Date.now());
  }, [order]);

  useEffect(() => {
    if (deadlineMs === null) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(Math.max(deadlineMs - Date.now(), 0), MAX_TIMEOUT_MS));
    return () => window.clearTimeout(timer);
  }, [deadlineMs]);

  useEffect(() => {
    if (deadlineMs === null) return;
    const recheck = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [deadlineMs]);

  return eligibility;
};
