import { trackClientEvent } from './analytics';
import type { Product } from '../types';
import type { ClientAnalyticsEvent, ClientAnalyticsEventName } from '../types/analytics';

// -----------------------------------------------------------------------------
// Storefront client-side analytics tracking (fire-and-forget).
//
// Only PAGE_VIEW, VIEW_CONTENT and VIEW_CART may be sent from the browser via
// POST /analytics/events. Server-authoritative events (ADD_TO_CART,
// INITIATE_CHECKOUT, PURCHASE, SEARCH) are emitted by the backend only.
// -----------------------------------------------------------------------------

const SESSION_STORAGE_KEY = 'allura_analytics_session_id';
const ANON_STORAGE_KEY = 'allura_analytics_anonymous_id';
const DEDUPE_WINDOW_MS = 1500;
const RATE_LIMIT_COOLDOWN_MS = 30_000;

/**
 * Global toggle for client-side storefront analytics.
 * Defaults to true; wire cookie-consent preferences into setTrackingEnabled().
 */
let trackingEnabled = true;

export const isTrackingEnabled = (): boolean => trackingEnabled;

export const setTrackingEnabled = (enabled: boolean): void => {
  trackingEnabled = Boolean(enabled);
};

let memorySessionId: string | null = null;
let memoryAnonymousId: string | null = null;
let rateLimitedUntil = 0;

/** Recent event keys -> timestamp (ms) to suppress StrictMode & re-render duplicates */
const recentEvents = new Map<string, number>();

const generateId = (prefix: string): string => {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}_${random}`;
};

const getSessionId = (): string => {
  if (memorySessionId) return memorySessionId;
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      memorySessionId = existing;
      return existing;
    }
    const created = generateId('sess');
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, created);
    memorySessionId = created;
    return created;
  } catch {
    memorySessionId = generateId('sess');
    return memorySessionId;
  }
};

const getAnonymousId = (): string => {
  if (memoryAnonymousId) return memoryAnonymousId;
  try {
    const existing = window.localStorage.getItem(ANON_STORAGE_KEY);
    if (existing) {
      memoryAnonymousId = existing;
      return existing;
    }
    const created = generateId('anon');
    window.localStorage.setItem(ANON_STORAGE_KEY, created);
    memoryAnonymousId = created;
    return created;
  } catch {
    memoryAnonymousId = generateId('anon');
    return memoryAnonymousId;
  }
};

const buildPageContext = (pathOverride?: string): ClientAnalyticsEvent['page'] => {
  if (typeof window === 'undefined') return undefined;
  const path = pathOverride || `${window.location.pathname}${window.location.search}`;
  return {
    url: window.location.href,
    path,
    ...(document.title ? { title: document.title } : {}),
    ...(document.referrer ? { referrer: document.referrer } : {}),
  };
};

const shouldSuppressDuplicate = (dedupeKey: string): boolean => {
  const now = Date.now();
  const lastSentAt = recentEvents.get(dedupeKey);
  if (lastSentAt !== undefined && now - lastSentAt < DEDUPE_WINDOW_MS) {
    return true;
  }
  recentEvents.set(dedupeKey, now);

  // Keep map bounded for long-lived SPA sessions
  if (recentEvents.size > 100) {
    for (const [key, ts] of recentEvents.entries()) {
      if (now - ts >= DEDUPE_WINDOW_MS) {
        recentEvents.delete(key);
      }
    }
  }
  return false;
};

const sendEvent = (
  eventName: ClientAnalyticsEventName,
  dedupeKey: string,
  extra: Omit<ClientAnalyticsEvent, 'eventName' | 'eventId' | 'sessionId' | 'anonymousId' | 'page'> = {},
  pathOverride?: string
): void => {
  try {
    if (!trackingEnabled || typeof window === 'undefined') return;
    if (Date.now() < rateLimitedUntil) return;
    if (shouldSuppressDuplicate(`${eventName}:${dedupeKey}`)) return;

    const payload: ClientAnalyticsEvent = {
      eventName,
      eventId: generateId('evt'),
      sessionId: getSessionId(),
      anonymousId: getAnonymousId(),
      page: buildPageContext(pathOverride),
      ...extra,
    };

    void trackClientEvent(payload).catch((err: any) => {
      if (err?.response?.status === 429) {
        rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      }
    });
  } catch {
    // Never let analytics disrupt the storefront experience
  }
};

/** Track a storefront route view (PAGE_VIEW). */
export const trackStorefrontPageView = (pathname: string): void => {
  if (!pathname) return;
  sendEvent('PAGE_VIEW', pathname, {}, pathname);
};

/** Track a product detail or quick-view impression (VIEW_CONTENT). */
export const trackProductView = (
  product: Pick<Product, 'id' | 'name' | 'sku' | 'categoryId' | 'price'>,
  source: 'pdp' | 'quick_view' = 'pdp'
): void => {
  if (!product?.id) return;
  const price = typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : undefined;

  sendEvent('VIEW_CONTENT', `${source}:${product.id}`, {
    product: {
      productId: product.id,
      ...(product.sku ? { sku: product.sku } : {}),
      ...(product.name ? { name: product.name } : {}),
      ...(product.categoryId ? { categoryId: product.categoryId } : {}),
    },
    ...(price !== undefined ? { value: price, currency: 'INR' } : {}),
    metadata: { source },
  });
};

/** Track viewing the shopping bag page or drawer (VIEW_CART). */
export const trackCartView = (options: {
  source: 'cart_page' | 'cart_drawer';
  value?: number;
  itemCount?: number;
}): void => {
  const value = typeof options.value === 'number' && Number.isFinite(options.value) ? options.value : undefined;
  sendEvent('VIEW_CART', options.source, {
    ...(value !== undefined ? { value, currency: 'INR' } : {}),
    metadata: {
      source: options.source,
      ...(typeof options.itemCount === 'number' ? { itemCount: options.itemCount } : {}),
    },
  });
};

