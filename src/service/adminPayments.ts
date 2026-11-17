import adminApi from './adminApi';
import { firstNumber } from '../utils/number';
import { getBackendErrorMessage } from '../utils/apiResponse';
import type { PaymentDetail, PaymentListItem, PaymentLedgerStatus, PaymentLedgerMethod } from '../types';

// -----------------------------------------------------------------------------
// Admin Payments — Ledger
// GET /admin/payments      — Razorpay Payments Ledger (list, search, filter)
// GET /admin/payments/{id} — Payment detail
// -----------------------------------------------------------------------------

export interface PaymentListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: PaymentLedgerStatus;
  method?: PaymentLedgerMethod;
  from?: string;
  to?: string;
  sort?: 'amount' | '-amount' | 'createdAt' | '-createdAt';
}

export interface PaymentsSummary {
  totalCaptured: number;
  upiSuccessRate: number;
  settlementCycle: string;
  environment: 'live' | 'test';
}

export interface PaymentList {
  items: PaymentListItem[];
  summary: PaymentsSummary | null;
  total: number;
  page: number;
  limit: number;
}

const unwrap = (response: any) => response?.data?.data ?? response?.data;

const num = (...values: any[]): number => firstNumber(...values) ?? 0;

// Backend converts paise to rupees in every response field already — do not divide by 100 again.
const mapPayment = (raw: any): PaymentListItem => ({
  paymentId: raw?.paymentId || raw?.id || '',
  orderId: raw?.orderId || '',
  orderNumber: raw?.orderNumber || '',
  customerName: raw?.customer?.name || '',
  customerEmail: raw?.customer?.email || '',
  method: raw?.method ?? null,
  amount: num(raw?.amount),
  gatewayReference: raw?.gatewayReference ?? null,
  status: (raw?.status || 'PENDING') as PaymentLedgerStatus,
  createdAt: raw?.createdAt || '',
});

const mapPaymentDetail = (raw: any): PaymentDetail => ({
  ...mapPayment(raw),
  currency: raw?.currency || 'INR',
  razorpayOrderId: raw?.razorpayOrderId || '',
  failureCode: raw?.failure?.code,
  failureReason: raw?.failure?.reason,
  failureDescription: raw?.failure?.description,
  updatedAt: raw?.updatedAt || '',
});

// The <input type="date"> picker gives a bare "YYYY-MM-DD", and the table displays
// createdAt in the browser's local timezone. Sending that date as-is lets the backend
// parse it as UTC midnight, which drifts the filter boundary away from the local day
// the admin actually picked (and, with from === to, collapses to a zero-width window).
// Build the boundary as a local-time instant and send its UTC equivalent instead, so
// filtering lines up with what the table shows.
const localDayBoundary = (date: string, end: boolean): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const [, y, m, d] = match;
  const dt = end
    ? new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999)
    : new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
  return dt.toISOString();
};

const cleanParams = (params?: PaymentListParams) => {
  const entries = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '');
  return Object.fromEntries(
    entries.map(([k, v]) => {
      if (typeof v !== 'string') return [k, v];
      if (k === 'from') return [k, localDayBoundary(v, false)];
      if (k === 'to') return [k, localDayBoundary(v, true)];
      return [k, v];
    })
  );
};

export const paymentLedgerErrorMessage = (error: any, fallback: string): string =>
  getBackendErrorMessage(error, fallback);

/** GET /admin/payments */
export const getAdminPayments = async (params: PaymentListParams = {}): Promise<PaymentList> => {
  const limit = params.limit ?? 20;
  const response = await adminApi.get('/admin/payments', { params: cleanParams({ ...params, limit }) });
  const data = unwrap(response) || {};
  const items = Array.isArray(data.items) ? data.items.map(mapPayment) : [];
  const pagination = data.pagination || {};
  const summary = data.summary;

  return {
    items,
    summary: summary
      ? {
          totalCaptured: num(summary.totalCaptured),
          upiSuccessRate: num(summary.upiSuccessRate),
          settlementCycle: summary.settlementCycle || 'T+1',
          environment: summary.environment === 'test' ? 'test' : 'live',
        }
      : null,
    total: typeof pagination.total === 'number' ? pagination.total : items.length,
    page: pagination.page ?? params.page ?? 1,
    limit: pagination.limit ?? limit,
  };
};

/** GET /admin/payments/{id} */
export const getAdminPayment = async (id: string): Promise<PaymentDetail> => {
  const response = await adminApi.get(`/admin/payments/${encodeURIComponent(id)}`);
  return mapPaymentDetail(unwrap(response));
};
