import adminApi from './adminApi';

// ─── Query Parameters Interfaces ──────────────────────────────────────────────

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
  timezone?: string;
}

export interface SalesQueryParams extends DateRangeParams {
  interval?: 'day' | 'week' | 'month';
}

export interface OrdersSummaryQueryParams extends DateRangeParams {
  page?: number;
  limit?: number;
}

export interface ActivityQueryParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
}

// ─── Response Interfaces ──────────────────────────────────────────────────────

export interface OverviewMetrics {
  period: {
    startDate: string;
    endDate: string;
    timezone: string;
  };
  currency: string;
  sales: {
    grossSales: number;
    discounts: number;
    refunds: number;
    netSales: number;
    paidOrderRevenue: number;
    paidOrderCount: number;
    averageOrderValue: number;
    salesTrend: Array<{ date: string; gross: number; net: number; count: number }>;
  };
  orders: {
    totalOrders: number;
    awaitingPayment: number;
    confirmed: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    returned: number;
  };
  customers: {
    totalCustomers: number;
    newCustomersInPeriod: number;
    customerRegistrationTrend: Array<{ date: string; count: number }>;
  };
  catalog: {
    totalProducts: number;
    activeProducts: number;
    draftProducts: number;
    archivedProducts: number;
    totalVariants: number;
    lowStockVariants: number;
    outOfStockVariants: number;
  };
  marketing: {
    activeCoupons: number;
    activePromotions: number;
    abandonedCartsCount: number;
    recoveredCartsCount: number;
    recoveryRate: number;
    totalWishlistItems: number;
    activeBannersCount: number;
    publishedCmsPagesCount: number;
  };
  operations: {
    notificationDeliverySummary: {
      status: string;
      message: string;
    };
    aiChatbotSummary: {
      status: string;
      message: string;
    };
    metaEventsSummary: {
      total: number;
      pending: number;
      sent: number;
      failed: number;
    };
    paymentWebhooksSummary: {
      received: number;
      processed: number;
      failed: number;
    };
  };
}

export interface SalesAnalyticsResponse {
  period: {
    startDate: string;
    endDate: string;
    timezone: string;
    interval: string;
  };
  currency: string;
  totals: {
    grossSales: number;
    discounts: number;
    refunds: number;
    netSales: number;
    paidOrderCount: number;
    averageOrderValue: number;
  };
  timeSeries: Array<{
    period: string;
    grossSales: number;
    discounts: number;
    netSales: number;
    paidOrderCount: number;
  }>;
  salesByStatus: Array<{ status: string; count: number; totalAmount: number }>;
  salesByPaymentMethod: Array<{ method: string; count: number; totalAmount: number }>;
  topProducts: Array<{
    productId: string;
    name: string;
    unitsSold: number;
    totalRevenue: number;
  }>;
}

export interface OrdersSummaryResponse {
  countsByStatus: Record<string, number>;
  ordersOverTime: Array<{ date: string; count: number }>;
  attentionRequired: {
    pendingPayment: number;
    pendingProcessing: number;
  };
  recentOrders: Array<{
    _id: string;
    orderNumber: string;
    status: string;
    paymentStatus?: string;
    pricing: {
      totalPayable: number;
      subtotal?: number;
    };
    createdAt: string;
    customerId?: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CustomerAnalyticsResponse {
  totalCustomers: number;
  newCustomersInPeriod: number;
  registrationTrend: Array<{ date: string; count: number }>;
  customerOrderFrequency: {
    singleOrderCount: number;
    repeatOrderCount: number;
    zeroOrderCount: number;
  };
}

export interface ProductAnalyticsResponse {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalVariants: number;
  bestSellingProducts: Array<{
    productId: string;
    name: string;
    unitsSold: number;
    totalRevenue: number;
  }>;
  salesByCategory: Array<{
    categoryId: string;
    categoryName?: string;
    unitsSold: number;
    revenue: number;
  }>;
}

export interface InventoryAnalyticsResponse {
  totalTrackedVariants: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
  stockMovementSummary: {
    totalOnHand: number;
    totalReserved: number;
    totalAvailable: number;
  };
  criticalStockVariants: Array<{
    _id?: string;
    variantId?: string;
    sku?: string;
    productName?: string;
    quantityAvailable: number;
    lowStockThreshold?: number;
  }>;
}

export interface MarketingAnalyticsResponse {
  coupons: {
    total: number;
    active: number;
    usedTotal: number;
  };
  promotions: {
    total: number;
    active: number;
  };
  abandonedCarts: {
    total: number;
    pending: number;
    recovered: number;
    recoveryRate: number;
    remindersSent: number;
  };
  cms: {
    publishedPages: number;
    draftPages: number;
    activeBanners: number;
  };
}

export interface SeoAnalyticsResponse {
  totalManagedEntities: number;
  byEntityType: Record<string, number>;
  noIndexEntitiesCount: number;
  sitemapStatus: {
    isAvailable: boolean;
    route: string;
  };
  robotsStatus: {
    isAvailable: boolean;
    route: string;
  };
}

export interface NotificationAnalyticsResponse {
  queueStatus: string;
  counts: {
    waiting: number;
    active: number;
    failed: number;
    completed: number;
  };
  channelsSupported: string[];
}

export interface AiAnalyticsResponse {
  provider: string;
  status: string;
  queue: {
    waiting: number;
    active: number;
    failed: number;
    completed: number;
  };
}

export interface TrackingAnalyticsResponse {
  analyticsEvents: Record<string, number>;
  metaEvents: {
    total: number;
    pending: number;
    sent: number;
    failed: number;
  };
}

export interface SystemHealthResponse {
  timestamp: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  services: {
    mongodb: { status: 'HEALTHY' | 'UNAVAILABLE'; latencyMs?: number };
    redis: { status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE'; latencyMs?: number };
    queues: Record<string, { status: string; waiting?: number; active?: number; failed?: number }>;
    integrations: {
      razorpay: { status: 'CONFIGURED' | 'NOT_CONFIGURED' };
      meta: { status: 'CONFIGURED' | 'NOT_CONFIGURED' };
      email: { status: 'CONFIGURED' | 'NOT_CONFIGURED' };
      delhivery: { status: 'CONFIGURED' | 'NOT_CONFIGURED' };
      deepseek: { status: 'CONFIGURED' | 'NOT_CONFIGURED' };
      firebase: { status: 'CONFIGURED' | 'NOT_CONFIGURED' };
      cloudflareR2: { status: 'CONFIGURED' | 'NOT_CONFIGURED' };
      cloudinary: { status: 'CONFIGURED' | 'NOT_CONFIGURED' };
    };
  };
}

export interface ActivityLogItem {
  _id: string;
  actorId?: {
    _id?: string;
    email?: string;
    profile?: { displayName?: string };
    role?: string;
  };
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface ActivityLogsResponse {
  logs: ActivityLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ─── Service API Methods ──────────────────────────────────────────────────────

/**
 * 1. GET /admin/dashboard/overview - Consolidated Dashboard Overview
 */
export const getDashboardOverview = async (params?: DateRangeParams): Promise<OverviewMetrics> => {
  const res = await adminApi.get('/admin/dashboard/overview', { params });
  return res.data?.data;
};

/**
 * 2. GET /admin/dashboard/sales - Sales & Revenue Analytics
 */
export const getDashboardSales = async (params?: SalesQueryParams): Promise<SalesAnalyticsResponse> => {
  const res = await adminApi.get('/admin/dashboard/sales', { params });
  return res.data?.data;
};

/**
 * 3. GET /admin/dashboard/orders - Order Management Summary
 */
export const getDashboardOrders = async (params?: OrdersSummaryQueryParams): Promise<OrdersSummaryResponse> => {
  const res = await adminApi.get('/admin/dashboard/orders', { params });
  return res.data?.data;
};

/**
 * 4. GET /admin/dashboard/customers - Customer Analytics
 */
export const getDashboardCustomers = async (params?: DateRangeParams): Promise<CustomerAnalyticsResponse> => {
  const res = await adminApi.get('/admin/dashboard/customers', { params });
  return res.data?.data;
};

/**
 * 5. GET /admin/dashboard/products - Product & Catalog Analytics
 */
export const getDashboardProducts = async (params?: DateRangeParams): Promise<ProductAnalyticsResponse> => {
  const res = await adminApi.get('/admin/dashboard/products', { params });
  return res.data?.data;
};

/**
 * 6. GET /admin/dashboard/inventory - Inventory Health Analytics
 */
export const getDashboardInventory = async (): Promise<InventoryAnalyticsResponse> => {
  const res = await adminApi.get('/admin/dashboard/inventory');
  return res.data?.data;
};

/**
 * 7. GET /admin/dashboard/marketing - Marketing & Abandoned Cart Analytics
 */
export const getDashboardMarketing = async (): Promise<MarketingAnalyticsResponse> => {
  const res = await adminApi.get('/admin/dashboard/marketing');
  return res.data?.data;
};

/**
 * 8. GET /admin/dashboard/seo - SEO Dashboard
 */
export const getDashboardSeo = async (): Promise<SeoAnalyticsResponse> => {
  const res = await adminApi.get('/admin/dashboard/seo');
  return res.data?.data;
};

/**
 * 9. GET /admin/dashboard/notifications - Notification Queue & Delivery Analytics
 */
export const getDashboardNotifications = async (): Promise<NotificationAnalyticsResponse> => {
  const res = await adminApi.get('/admin/dashboard/notifications');
  return res.data?.data;
};

/**
 * 10. GET /admin/dashboard/ai - DeepSeek AI Chatbot Dashboard
 */
export const getDashboardAi = async (): Promise<AiAnalyticsResponse> => {
  const res = await adminApi.get('/admin/dashboard/ai');
  return res.data?.data;
};

/**
 * 11. GET /admin/dashboard/analytics - Web & Meta Tracking Analytics
 */
export const getDashboardAnalytics = async (params?: DateRangeParams): Promise<TrackingAnalyticsResponse> => {
  const res = await adminApi.get('/admin/dashboard/analytics', { params });
  return res.data?.data;
};

/**
 * 12. GET /admin/dashboard/system-health - System & Integrations Health Check
 */
export const getDashboardSystemHealth = async (): Promise<SystemHealthResponse> => {
  const res = await adminApi.get('/admin/dashboard/system-health');
  return res.data?.data;
};

/**
 * 13. GET /admin/dashboard/activity - Admin Activity & Audit Logs
 */
export const getDashboardActivity = async (params?: ActivityQueryParams): Promise<ActivityLogsResponse> => {
  const res = await adminApi.get('/admin/dashboard/activity', { params });
  return res.data?.data;
};
