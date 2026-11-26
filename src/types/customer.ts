// -----------------------------------------------------------------------------
// Admin CRM customers — schema confirmed from the live backend's Swagger spec
// ("Customers (Admin CRM)" section):
//   GET /admin/customers, GET /admin/customers/stats, GET /admin/customers/{id}
//
// `addresses` on the detail endpoint has no documented sub-schema (Swagger
// only says `items: { type: object }`) — field names are a best-effort guess,
// same convention as orders.ts's mapAddress.
// -----------------------------------------------------------------------------

/** Confirmed enum values, from the `circleTier` field. null means Regular Customer. */
export type AdminCircleTier = 'PLATINUM' | 'GOLD' | null;

/** Confirmed: GET /admin/customers's `sortBy` query param */
export type AdminCustomerSortBy = 'createdAt' | 'lifetimeSpend' | 'ordersCount';

/** Confirmed: GET /admin/customers's `sortOrder` query param */
export type AdminCustomerSortOrder = 'asc' | 'desc';

/** Confirmed: GET /admin/customers list item / GET /admin/customers/{id} base fields */
export interface AdminCustomerListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  ordersCount: number;
  lifetimeSpend: number;
  currency: string;
  circleTier: AdminCircleTier;
  patronSince: string;
  lastOrderDate: string | null;
}

/** Confirmed: GET /admin/customers/{id}'s recentOrders[] items */
export interface AdminCustomerRecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
}

/** Confirmed: GET /admin/customers/{id} response (base fields + addresses + recentOrders) */
export interface AdminCustomerDetail extends AdminCustomerListItem {
  addresses: any[];
  recentOrders: AdminCustomerRecentOrder[];
}

/** Confirmed: GET /admin/customers/stats response */
export interface AdminCustomerStats {
  totalPatrons: number;
  newRegistrations: number;
  repeatPatrons: number;
  firstTimeBuyers: number;
  windowDays: number;
}

export interface AdminCustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: AdminCustomerSortBy;
  sortOrder?: AdminCustomerSortOrder;
}

export interface AdminCustomerList {
  /** Mapped to the existing CustomerProfile shape — see service/customers.ts's mapAdminCustomer */
  customers: import('./index').CustomerProfile[];
  /** Null when the backend's response doesn't include a total (see customers.ts) */
  total: number | null;
  page: number;
  limit: number;
  /** Null when the backend's response doesn't include a page count */
  totalPages: number | null;
  /** True when this page came back with exactly `limit` rows, so a next page might exist */
  hasMore: boolean;
}
