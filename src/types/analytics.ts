// -----------------------------------------------------------------------------
// Analytics (Admin Reporting) — schema confirmed from the live backend's
// Swagger spec ("Analytics (Admin Reporting)" + "Analytics (Internal Engine)"
// tags):
//   GET /admin/analytics/sales, /products, /funnel, /tracking-status,
//   and the public POST /analytics/events.
// -----------------------------------------------------------------------------

export interface AnalyticsDateRangeParams {
  startDate?: string;
  endDate?: string;
}

// ── Sales & Products ────────────────────────────────────────────────────────

export type SalesTrendInterval = 'day' | 'week' | 'month';

export interface SalesAnalyticsParams extends AnalyticsDateRangeParams {
  interval?: SalesTrendInterval;
}

export interface SalesSummary {
  grossSales: number;
  netRevenue: number;
  averageOrderValue: number;
  paidOrdersCount: number;
  refundAmount: number;
  currency: string;
}

export interface SalesTrendPoint {
  period: string;
  grossSales: number;
  discounts: number;
  netSales: number;
  paidOrderCount: number;
}

export interface SalesAnalytics {
  summary: SalesSummary;
  salesTrend: SalesTrendPoint[];
}

export type ProductRankBy = 'revenue' | 'unitsSold' | 'views' | 'conversion';

export interface ProductAnalyticsParams extends AnalyticsDateRangeParams {
  page?: number;
  limit?: number;
  rankBy?: ProductRankBy;
}

export interface ProductAnalyticsItem {
  productId: string;
  name: string;
  unitsSold: number;
  grossRevenue: number;
  views: number;
  addToCartCount: number;
  purchaseCount: number;
  conversionRate: number;
  cartToPurchaseRate: number;
}

export interface ProductAnalyticsResponse {
  products: ProductAnalyticsItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── Conversion Funnel ────────────────────────────────────────────────────────

export interface FunnelStage {
  key: string;
  label: string;
  uniqueUsers: number;
  conversionFromVisitors: number;
  conversionFromPrevious: number;
  dropoffFromPrevious: number;
}

export interface FunnelAnalytics {
  summary: {
    totalVisitors: number;
    completedPurchases: number;
    overallConversionRate: number;
  };
  stages: FunnelStage[];
}

// ── Web & Meta Tracking ──────────────────────────────────────────────────────

export interface MetaTrackingStatus {
  pixelConfigured: boolean;
  capiConfigured: boolean;
  /** Always 0 — no Meta Pixel browser script exists in this codebase yet */
  browserEventsTracked: number;
  serverEventsSent: number;
  serverEventsPending: number;
  serverEventsFailed: number;
  lastSuccessfulDelivery: string | null;
  recentErrors: { eventName: string; error: string; at: string }[];
}

export interface Ga4TrackingStatus {
  /** Always false — no GA4 integration exists in this codebase yet */
  configured: boolean;
}

export interface TrackingStatus {
  meta: MetaTrackingStatus;
  ga4: Ga4TrackingStatus;
  /** Dynamic event-name -> count map; exact key casing not documented in Swagger */
  analyticsEventsByName: Record<string, number>;
}

// ── Client-side event ingestion (storefront tracking) ───────────────────────

/** Confirmed: the only 3 event names POST /analytics/events accepts from the client */
export type ClientAnalyticsEventName = 'PAGE_VIEW' | 'VIEW_CONTENT' | 'VIEW_CART';

export interface ClientAnalyticsEvent {
  eventName: ClientAnalyticsEventName;
  eventId?: string;
  sessionId?: string;
  anonymousId?: string;
  page?: {
    url?: string;
    path?: string;
    title?: string;
    referrer?: string;
  };
  product?: {
    productId?: string;
    variantId?: string;
    sku?: string;
    name?: string;
    categoryId?: string;
  };
  value?: number;
  currency?: string;
  metadata?: Record<string, any>;
}
