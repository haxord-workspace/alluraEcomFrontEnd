import type { Order, SavedAddress } from '../../types';
import type { BoutiqueProfile } from '../../types/settings';
import { formatINR, formatINRDeduction } from '../formatINR';
import { formatUserFacingPaymentStatus } from '../userFacingText';
import {
  DEFAULT_COMPANY_NAME,
  INVOICE_TERMS,
  INVOICE_THANK_YOU,
  INVOICE_TITLE,
  invoiceFileName,
} from '../../config/invoice';

/**
 * The single invoice view-model. The on-screen InvoiceModal and the PDF generator both
 * render from this object, so labels, order, wording and every formatted amount are the same.
 */

export type InvoiceTone = 'success' | 'danger' | 'info' | 'warning';

export interface InvoiceCompany {
  name: string;
  tagline?: string;
  address?: string;
  gstin?: string;
  supportEmail?: string;
  supportPhone?: string;
}

export interface InvoiceMetaRow {
  label: string;
  value: string;
  strong?: boolean;
}

export interface InvoiceParty {
  title: string;
  name: string;
  /** Address lines, blank parts already removed */
  lines: string[];
  contacts: { label: string; value: string }[];
}

export interface InvoicePayment {
  method: string;
  status: string;
  tone: InvoiceTone;
  transactionId?: string;
}

export interface InvoiceItem {
  name: string;
  /** Display label, e.g. "SKU-RED-FREE-SIZE" or "SKU 12345" */
  sku?: string;
  size?: string;
  colorName?: string;
  colorHex?: string;
  qty: number;
  unitPrice: string;
  lineTotal: string;
}

export interface InvoiceTotalRow {
  label: string;
  value: string;
  kind: 'normal' | 'discount';
}

export interface InvoiceData {
  title: string;
  fileName: string;
  orderNumber: string;
  invoiceNumber?: string;
  company: InvoiceCompany;
  meta: InvoiceMetaRow[];
  parties: InvoiceParty[];
  payment: InvoicePayment;
  items: InvoiceItem[];
  itemCount: number;
  totals: InvoiceTotalRow[];
  grandTotal: string;
  terms: readonly string[];
  thankYou: string;
}

const PLACEHOLDERS = new Set(['', '.', '-', '—', 'string', 'null', 'undefined', 'n/a', 'na']);

/** Trims a value and drops blanks and placeholders ("string", ".", "null", ...) */
export const cleanText = (value?: unknown): string | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const trimmed = String(value).replace(/\s+/g, ' ').trim();
  return PLACEHOLDERS.has(trimmed.toLowerCase()) ? undefined : trimmed;
};

/** "nufail ." / "nufail -" → "nufail" (a blank last name sent as a dot) */
const cleanName = (value?: string): string | undefined => {
  const text = cleanText(value);
  return text ? cleanText(text.replace(/(\s+[.,-]+)+$/, '')) : undefined;
};

/** Keeps a phone only if it has real digits (not just a "+91" country code) */
const cleanPhone = (value?: string): string | undefined => {
  const text = cleanText(value);
  return text && /\d{5,}/.test(text.replace(/\D/g, '')) ? text : undefined;
};

const addressPhone = (address?: SavedAddress): string | undefined =>
  address?.phone?.number
    ? cleanPhone(`${address.phone.countryCode || '+91'} ${address.phone.number}`)
    : undefined;

const addressLines = (address?: SavedAddress): string[] => {
  if (!address) return [];
  const street = [address.addressLine1, address.addressLine2].map(cleanText).filter(Boolean).join(', ');
  const landmark = cleanText(address.landmark);
  const cityState = [address.city, address.state].map(cleanText).filter(Boolean).join(', ');
  const region = [cityState, cleanText(address.postalCode)].filter(Boolean).join(' - ');
  return [street, landmark && `Landmark: ${landmark}`, region, cleanText(address.country)].filter(
    (line): line is string => !!line
  );
};

const addressKey = (address?: SavedAddress): string =>
  [address?.fullName, ...addressLines(address)].map(v => (v || '').toLowerCase().replace(/\W+/g, '')).join('|');

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  UPI: 'UPI',
  Card: 'Card',
  COD: 'Cash on Delivery',
  NetBanking: 'Net Banking',
};

export const paymentTone = (status?: string): InvoiceTone => {
  const s = (status || '').toLowerCase().replace(/_/g, ' ');
  if (['paid', 'captured', 'success', 'completed'].includes(s)) return 'success';
  if (['failed', 'cancelled', 'payment failed'].includes(s)) return 'danger';
  if (['refunded', 'partially refunded', 'refund initiated'].includes(s)) return 'info';
  return 'warning';
};

const DISCOUNT_LABELS = {
  coupon: 'Coupon discount',
  promotion: 'Promotion discount',
  product: 'Product discount',
} as const;

const discountRows = (order: Order): InvoiceTotalRow[] => {
  const code = cleanText(order.couponCode);
  const lines = order.discountLines || [];
  // Only split the discount when there really are several kinds; one kind reads as plain "Discount"
  if (lines.length > 1) {
    return lines.map(line => ({
      label: line.kind === 'coupon' && code ? `${DISCOUNT_LABELS.coupon} (${code})` : DISCOUNT_LABELS[line.kind],
      value: formatINRDeduction(line.amount),
      kind: 'discount',
    }));
  }
  if ((order.discount ?? 0) <= 0) return [];
  return [{ label: `Discount${code ? ` (${code})` : ''}`, value: formatINRDeduction(order.discount), kind: 'discount' }];
};

export const buildInvoiceData = (order: Order, profile?: Partial<BoutiqueProfile> | null): InvoiceData => {
  const orderNumber = cleanText(order.orderNumber) || order.id;
  const invoiceNumber = cleanText(order.invoiceNumber);
  const email = cleanText(order.customer?.email);
  const shipping = order.shippingAddress;
  const billing = order.billingAddress;
  const shippingName = cleanName(shipping?.fullName) || cleanName(order.customer?.name) || 'Customer';
  const shippingPhone = addressPhone(shipping) || cleanPhone(order.customer?.phone);

  const contacts = (phone?: string, withEmail = true) =>
    [
      phone && { label: 'Phone', value: phone },
      withEmail && email && { label: 'Email', value: email },
    ].filter((c): c is { label: string; value: string } => !!c);

  const separateBilling = !!billing && addressLines(billing).length > 0 && addressKey(billing) !== addressKey(shipping);
  const parties: InvoiceParty[] = separateBilling
    ? [
        {
          title: 'Billed To',
          name: cleanName(billing.fullName) || shippingName,
          lines: addressLines(billing),
          contacts: contacts(addressPhone(billing) || shippingPhone),
        },
        { title: 'Shipped To', name: shippingName, lines: addressLines(shipping), contacts: contacts(shippingPhone, false) },
      ]
    : [{ title: 'Billed & Shipped To', name: shippingName, lines: addressLines(shipping), contacts: contacts(shippingPhone) }];

  const items: InvoiceItem[] = (order.items || []).map(item => {
    const color = item.selectedColor && typeof item.selectedColor === 'object' ? item.selectedColor : undefined;
    const colorName = cleanText(color ? color.name : (item.selectedColor as unknown as string | undefined));
    const unitPrice = Number(item.unitPrice) || 0;
    const qty = Number(item.quantity) || 1;
    const sku = cleanText(item.sku);
    return {
      name: cleanText(item.product?.name) || cleanText((item as any).name) || 'Item',
      // Display label; codes that already start with "SKU" aren't prefixed twice
      sku: sku && (/^sku\b/i.test(sku) ? sku : `SKU ${sku}`),
      size: cleanText(item.selectedSize),
      colorName,
      colorHex: colorName ? cleanText(color?.hex) : undefined,
      qty,
      unitPrice: formatINR(unitPrice),
      lineTotal: formatINR(unitPrice * qty),
    };
  });

  const meta: InvoiceMetaRow[] = [
    { label: 'Invoice No', value: invoiceNumber || '', strong: true },
    { label: 'Order No', value: orderNumber, strong: !invoiceNumber },
    { label: 'Invoice Date', value: cleanText(order.invoiceIssuedAt) || '' },
    { label: 'Order Date', value: cleanText(order.date) || '' },
  ].filter(row => !!row.value);

  return {
    title: INVOICE_TITLE,
    fileName: invoiceFileName(orderNumber),
    orderNumber,
    invoiceNumber,
    company: {
      name: cleanText(profile?.legalName) || DEFAULT_COMPANY_NAME,
      tagline: cleanText(profile?.tagline),
      address: cleanText(profile?.address),
      gstin: cleanText(profile?.gstin),
      supportEmail: cleanText(profile?.supportEmail),
      supportPhone: cleanPhone(profile?.whatsappNumber),
    },
    meta,
    parties,
    payment: {
      method: PAYMENT_METHOD_LABELS[order.paymentMethod] || cleanText(order.paymentMethod) || '—',
      status: formatUserFacingPaymentStatus(order.paymentStatus) || '—',
      tone: paymentTone(order.paymentStatus),
      transactionId: cleanText(order.transactionId) || cleanText(order.paymentTransactionId),
    },
    items,
    itemCount: items.reduce((n, i) => n + i.qty, 0),
    totals: [
      { label: 'Subtotal', value: formatINR(order.subtotal), kind: 'normal' },
      ...discountRows(order),
      { label: 'Tax', value: formatINR(order.tax), kind: 'normal' },
      { label: 'Shipping', value: order.shippingFee === 0 ? 'Free' : formatINR(order.shippingFee), kind: 'normal' },
    ],
    grandTotal: formatINR(order.total),
    terms: INVOICE_TERMS,
    thankYou: INVOICE_THANK_YOU,
  };
};

/** "Support: help@x.com · +91 98…" parts, shared by both renderers */
export const supportLine = (company: InvoiceCompany): string | undefined => {
  const parts = [company.supportEmail, company.supportPhone].filter(Boolean);
  return parts.length ? `Support: ${parts.join(' · ')}` : undefined;
};
