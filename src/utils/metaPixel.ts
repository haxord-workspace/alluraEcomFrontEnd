// Meta Pixel + Conversions API (CAPI) helpers.
//
// Redundant setup: each key event is sent from the browser (Pixel) AND from our backend (CAPI).
// Meta de-duplicates the two when they share the same event ID, so for every tracked action we:
//   1. generate one eventId,
//   2. fire the Pixel event with { eventID: eventId },
//   3. send the same eventId (+ _fbp / _fbc cookies) to the backend as x-meta-* headers.
//
// The Pixel only loads when VITE_META_PIXEL_ID is set.

declare global {
  interface Window {
    fbq?: ((...args: any[]) => void) & { callMethod?: (...args: any[]) => void; queue?: any[]; loaded?: boolean; version?: string; push?: any };
    _fbq?: Window['fbq'];
  }
}

export const META_PIXEL_ID: string | undefined = import.meta.env.VITE_META_PIXEL_ID || undefined;
export const isMetaPixelEnabled = (): boolean => !!META_PIXEL_ID;

let initialized = false;

/** Loads fbevents.js and initialises the Pixel once (the standard Meta base code, without the auto PageView). */
export const initMetaPixel = () => {
  if (initialized || !META_PIXEL_ID || typeof window === 'undefined') return;
  initialized = true;

  if (!window.fbq) {
    const fbq: any = function (...args: any[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  window.fbq!('init', META_PIXEL_ID);
};

/** Fire on every route change (single-page app: the browser doesn't reload between pages) */
export const trackPageView = () => {
  if (!isMetaPixelEnabled()) return;
  initMetaPixel();
  window.fbq?.('track', 'PageView');
};

/** A unique ID for one event occurrence, shared by the Pixel and the backend CAPI call */
export const newMetaEventId = (): string =>
  `evt_${
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
  }`;

const readCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

/** _fbp (browser ID) and _fbc (click ID, only present after an ad click) set by the Pixel */
export const getMetaCookies = () => ({
  fbp: readCookie('_fbp') || '',
  fbc: readCookie('_fbc') || '',
});

export type MetaStandardEvent = 'AddToCart' | 'InitiateCheckout' | 'Purchase' | 'CompleteRegistration' | 'ViewContent' | 'AddToWishlist';

export interface MetaEventData {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_type?: 'product' | 'product_group';
  content_name?: string;
  contents?: { id: string; quantity: number; item_price?: number }[];
  num_items?: number;
  [key: string]: unknown;
}

/** Fires a Pixel event with the deduplication ID (4th argument) */
export const trackMetaEvent = (event: MetaStandardEvent, data: MetaEventData, eventId: string) => {
  if (!isMetaPixelEnabled()) return;
  initMetaPixel();
  window.fbq?.('track', event, data, { eventID: eventId });
};

/**
 * Headers for the backend call that triggers the same event server-side (CAPI).
 * Only sent while the Pixel is configured, so the backend's CORS setup must allow
 * x-meta-event-id, x-meta-fbp and x-meta-fbc before VITE_META_PIXEL_ID is set.
 */
export const metaHeaders = (eventId: string): Record<string, string> => {
  if (!isMetaPixelEnabled()) return {};
  const { fbp, fbc } = getMetaCookies();
  return {
    'x-meta-event-id': eventId,
    ...(fbp ? { 'x-meta-fbp': fbp } : {}),
    ...(fbc ? { 'x-meta-fbc': fbc } : {}),
  };
};

/**
 * One-liner for a tracked action: creates the eventId, fires the Pixel event,
 * and returns the headers to attach to the matching backend request.
 */
export const startMetaEvent = (event: MetaStandardEvent, data: MetaEventData) => {
  const eventId = newMetaEventId();
  trackMetaEvent(event, data, eventId);
  return { eventId, headers: metaHeaders(eventId) };
};
