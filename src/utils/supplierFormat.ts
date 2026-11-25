/** Display helpers for the Supplier Management module. */

import type {
  ProductSupplierRef,
  SupplierActivity,
  SupplierMetric,
  SupplierSelectionItem,
} from '../types/suppliers';

export { formatReviewDate as formatSupplierDate, formatReviewDateTime as formatSupplierDateTime } from './reviewFormat';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const INR_PRECISE = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const COUNT = new Intl.NumberFormat('en-IN');

/** "₹1,23,456" (Indian grouping) */
export const formatINR = (value: number | null | undefined, precise = false): string =>
  typeof value === 'number' && Number.isFinite(value) ? (precise ? INR_PRECISE : INR).format(value) : '—';

/** "1,23,456" */
export const formatCount = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? COUNT.format(value) : '—';

const PERCENT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** "66.67%", "50%" (API percentages, shown as-is: up to 2 decimals, no trailing zeros) */
export const formatPercent = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? `${PERCENT.format(value)}%` : '—';

/** Dropdown label: `Name (SUP-00001) · Company` */
export const formatSupplierOption = (s: SupplierSelectionItem | ProductSupplierRef): string =>
  `${s.name} (${s.supplierCode})${s.companyName ? ` · ${s.companyName}` : ''}`;

export const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${formatCount(count)} ${count === 1 ? singular : plural}`;

/** Timeline label for one activity entry */
export const getSupplierActivityLabel = (activity: SupplierActivity, supplierId: string): string => {
  // metadata.productName exists only on the three product events, so it is read only there
  const productName = () => {
    const name = activity.metadata?.productName;
    return typeof name === 'string' && name.trim() ? name.trim() : 'a product';
  };
  switch (activity.action) {
    case 'SUPPLIER_CREATED':
      return 'Supplier added';
    case 'SUPPLIER_UPDATED':
      return 'Details updated';
    case 'SUPPLIER_STATUS_CHANGED':
      return 'Status changed';
    case 'SUPPLIER_DELETED':
      return 'Supplier deleted';
    case 'SUPPLIER_PRODUCT_ASSIGNED':
      return `Assigned to ${productName()}`;
    case 'SUPPLIER_PRODUCT_REMOVED':
      return `Removed from ${productName()}`;
    case 'SUPPLIER_PRODUCT_CHANGED':
      return activity.metadata?.toSupplierId === supplierId
        ? 'Product moved here from another supplier'
        : 'Product moved to another supplier';
    default:
      return String(activity.action).replace(/^SUPPLIER_/, '').replace(/_/g, ' ').toLowerCase();
  }
};

/**
 * Sales revenue is gross: orders with payment status PAID, PARTIALLY_REFUNDED or
 * REFUNDED, before refunds (same rule as the executive dashboard).
 */
export const SALES_REVENUE_LABEL = 'Sales revenue (gross, before refunds)';
export const SALES_REVENUE_SHORT_LABEL = 'Sales revenue (gross)';

interface MetricInfo {
  label: string;
  /** For narrow table headers; the full label goes in the tooltip */
  shortLabel?: string;
  /** Currency values are formatted as ₹ */
  currency: boolean;
}

export const SUPPLIER_METRIC_INFO: Record<SupplierMetric, MetricInfo> = {
  sales_revenue: { label: SALES_REVENUE_LABEL, shortLabel: SALES_REVENUE_SHORT_LABEL, currency: true },
  units_sold: { label: 'Units sold', currency: false },
  products: { label: 'Most products', currency: false },
  inventory_units: { label: 'Stock units', currency: false },
  inventory_value: { label: 'Stock value (cost)', currency: true },
  product_performance: { label: 'Revenue per product', currency: true },
  purchase_value: { label: 'Purchase value', currency: true },
  units_purchased: { label: 'Units purchased', currency: false },
};

export const formatMetricValue = (metric: SupplierMetric, value: number | null | undefined): string =>
  SUPPLIER_METRIC_INFO[metric].currency ? formatINR(value) : formatCount(value);

// ── Dates (local calendar days, YYYY-MM-DD as the API expects) ──────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isValidISODate = (value: string | null | undefined): value is string =>
  !!value && ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));

const pad = (n: number) => String(n).padStart(2, '0');
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toISODate(d);
};
