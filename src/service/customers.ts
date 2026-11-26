import adminApi from './adminApi';
import { mapAddress } from './orders';
import { getBackendErrorMessage } from '../utils/apiResponse';
import { firstNumber } from '../utils/number';
import type { CustomerProfile, SavedAddress } from '../types';
import type {
  AdminCustomerRecentOrder,
  AdminCustomerStats,
  AdminCustomerListParams,
  AdminCustomerList,
} from '../types/customer';

// -----------------------------------------------------------------------------
// Customers (Admin CRM) endpoints (Swagger confirmed, see src/types/customer.ts)
//   GET /admin/customers, GET /admin/customers/stats, GET /admin/customers/{id}
// -----------------------------------------------------------------------------

export const customerErrorMessage = (error: any, fallback: string): string =>
  getBackendErrorMessage(error, fallback);

const unwrap = (response: any) => response?.data?.data ?? response?.data;

/** "2026-09-10T..." -> "10 September 2026", matching the previous mock's date style */
const formatPatronDate = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const circleTierLabel = (tier: unknown): CustomerProfile['circleTier'] => {
  if (!tier || typeof tier !== 'string') return undefined;
  const upper = tier.trim().toUpperCase();
  if (upper === 'PLATINUM') return 'Platinum';
  if (upper === 'GOLD') return 'Gold';
  if (upper === 'PRIVILEGE') return 'Privilege';
  if (upper === 'NONE' || upper === 'NULL') return undefined;
  return (tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()) as CustomerProfile['circleTier'];
};

const formatCustomerPhone = (phone: any): string => {
  if (!phone) return '';
  if (typeof phone === 'string') return phone;
  if (typeof phone === 'object' && phone.number) {
    const code = phone.countryCode || '+91';
    return `${code}${phone.number}`.trim();
  }
  return '';
};

/**
 * Converts a real API customer (list item or detail) into the CustomerProfile
 * shape the existing page markup already renders, so the table/cards need
 * minimal edits. `sizePreferences` is intentionally left undefined — the
 * backend has no sizing data on this endpoint (see types/customer.ts).
 */
export const mapAdminCustomer = (raw: any): CustomerProfile => {
  const circleTier = raw?.circleTier ?? null;
  const addresses: SavedAddress[] = Array.isArray(raw?.addresses) ? raw.addresses.map(mapAddress) : [];
  const isCircleMember = Boolean(circleTier && String(circleTier).toUpperCase() !== 'NONE');
  return {
    id: raw?.id || raw?._id || '',
    name: raw?.name || '',
    email: raw?.email || '',
    phone: formatCustomerPhone(raw?.phone),
    isCircleMember,
    circleTier: circleTierLabel(circleTier),
    addresses,
    totalSpent: firstNumber(raw?.lifetimeSpend, raw?.totalSpent) ?? 0,
    ordersCount: firstNumber(raw?.ordersCount) ?? 0,
    currency: raw?.currency || 'INR',
    createdDate: formatPatronDate(raw?.patronSince || raw?.createdAt),
    lastOrderDate: formatPatronDate(raw?.lastOrderDate),
  };
};

/** GET /admin/customers */
export const getAdminCustomers = async (
  params: AdminCustomerListParams = {},
  signal?: AbortSignal
): Promise<AdminCustomerList> => {
  const limit = params.limit ?? 10;
  const page = params.page ?? 1;
  const response = await adminApi.get('/admin/customers', {
    params: {
      page,
      limit,
      search: params.search || undefined,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    },
    signal,
  });
  const data = unwrap(response);
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.customers)
    ? data.customers
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data?.patrons)
    ? data.patrons
    : [];
  const customers = (Array.isArray(list) ? list : []).map(mapAdminCustomer);

  // The documented response has no total/page/totalPages — but if the backend
  // actually sends one (undocumented), prefer it over guessing at a total.
  const meta = response?.data?.meta || response?.data?.pagination || (!Array.isArray(data) ? data : null);
  const total = typeof meta?.total === 'number' ? meta.total : null;
  const totalPages = typeof meta?.totalPages === 'number' ? meta.totalPages : null;
  const resolvedPage = typeof meta?.page === 'number' ? meta.page : page;

  return {
    customers,
    total,
    page: resolvedPage,
    limit,
    totalPages,
    hasMore: totalPages !== null ? resolvedPage < totalPages : customers.length === limit,
  };
};

/** GET /admin/customers/stats */
export const getAdminCustomerStats = async (days?: number): Promise<AdminCustomerStats> => {
  const response = await adminApi.get('/admin/customers/stats', { params: days ? { days } : undefined });
  const data = unwrap(response);
  return {
    totalPatrons: firstNumber(data?.totalPatrons) ?? 0,
    newRegistrations: firstNumber(data?.newRegistrations) ?? 0,
    repeatPatrons: firstNumber(data?.repeatPatrons) ?? 0,
    firstTimeBuyers: firstNumber(data?.firstTimeBuyers) ?? 0,
    windowDays: firstNumber(data?.windowDays) ?? 30,
  };
};

/** GET /admin/customers/{id} */
export const getAdminCustomer = async (id: string): Promise<CustomerProfile & { recentOrders: AdminCustomerRecentOrder[] }> => {
  const response = await adminApi.get(`/admin/customers/${id}`);
  const data = unwrap(response);
  const root = data?.customer || data?.user || data;
  return {
    ...mapAdminCustomer(root),
    recentOrders: Array.isArray(root?.recentOrders) ? root.recentOrders : Array.isArray(data?.recentOrders) ? data.recentOrders : [],
  };
};
