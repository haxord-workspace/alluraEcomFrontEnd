import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import api from './api';
import adminApi from './adminApi';
import { saveBlob } from '../utils/download';
import { getBackendErrorMessage } from '../utils/apiResponse';
import type { AddressLabelPreview, AddressLabelSize, BulkAddressLabelResult } from '../types/addressLabel';

// -----------------------------------------------------------------------------
// Address slip (packing slip) PDFs. The backend renders the PDF; the browser only
// fetches and opens/downloads it — same shape as `service/barcodeLabels.ts`'s
// `printLabelPdf`, generalised here because this feature needs "open in a new tab"
// and "download" rather than "send straight to the print dialog".
//
// Customer: GET /orders/:orderId/address-label        (api, cookie-based token)
// Admin:    GET /admin/orders/:orderId/address-label   (adminApi)
//           POST /admin/orders/address-labels (bulk)
// -----------------------------------------------------------------------------

const PDF_TIMEOUT_MS = 60_000;
/** The object URL is revoked after this long, giving the new tab / download time to load it */
const URL_REVOKE_MS = 60_000;

export type AddressLabelErrorCode =
  | 'ORDER_NOT_PAID'
  | 'FORBIDDEN'
  | 'ORDER_NOT_SHIPPABLE'
  | 'ORDER_NOT_FOUND'
  | 'ORDERS_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'STORE_ADDRESS_NOT_CONFIGURED'
  | 'NETWORK_ERROR';

export class PdfDocumentError extends Error {
  readonly status: number | null;
  readonly code: AddressLabelErrorCode | string | null;
  readonly details: unknown;

  constructor(message: string, status: number | null, code: string | null, details: unknown) {
    super(message);
    this.name = 'PdfDocumentError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type UnknownRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Error bodies of `responseType: 'blob'` requests arrive as a Blob; read them back as JSON */
const readErrorBody = async (data: unknown): Promise<unknown> => {
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      return JSON.parse(await data.text());
    } catch {
      return null;
    }
  }
  return data;
};

/** Turns any thrown value from an address-label endpoint into a typed PdfDocumentError */
export const toPdfDocumentError = async (err: unknown): Promise<PdfDocumentError> => {
  if (err instanceof PdfDocumentError) return err;

  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return new PdfDocumentError('Network error. Check your connection and try again.', null, 'NETWORK_ERROR', null);
    }
    const body = await readErrorBody(err.response.data);
    const errorObj = isRecord(body) && isRecord(body.error) ? body.error : null;
    const code = asString(errorObj?.code) || (isRecord(body) ? asString(body.code) : '') || null;
    const details = errorObj?.details ?? (isRecord(body) ? body.details : undefined) ?? null;
    const message = getBackendErrorMessage({ response: { data: body } }, 'Could not create the document');
    return new PdfDocumentError(message, err.response.status, code, details);
  }

  return new PdfDocumentError('Could not create the document. Please try again.', null, null, null);
};

/** User-facing text for an address-label / invoice document error (section 7 of the spec) */
export const describeAddressLabelError = (error: PdfDocumentError, context: 'admin' | 'customer'): string => {
  switch (error.code) {
    case 'ORDER_NOT_PAID':
      return 'Available once payment is confirmed.';
    case 'FORBIDDEN':
      return "This order isn't available.";
    case 'ORDER_NOT_SHIPPABLE':
      return 'No address slip for a cancelled or returned order.';
    case 'ORDER_NOT_FOUND':
    case 'ORDERS_NOT_FOUND':
      return 'Order not found.';
    case 'STORE_ADDRESS_NOT_CONFIGURED':
      return context === 'admin'
        ? 'Add the dispatch address in Settings > Boutique profile first.'
        : 'Address slip is temporarily unavailable.';
    case 'VALIDATION_ERROR':
      return error.message || 'That request was invalid.';
    case 'NETWORK_ERROR':
      return error.message;
    default:
      break;
  }
  if (error.status === 401) return 'Your session has expired. Please sign in again.';
  if (error.status === 403) return "You don't have permission for this.";
  if (error.status === 404) return 'Order not found.';
  if (error.status !== null && error.status >= 500) return 'The document service had a problem. Please try again.';
  return error.message || 'Could not create the document. Please try again.';
};

const normalizePdfBlob = (blob: Blob): Blob =>
  blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });

interface FetchPdfResult {
  blob: Blob;
  headers: Record<string, string>;
}

const fetchPdfBlob = async (
  client: AxiosInstance,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  params?: Record<string, string | number | undefined>
): Promise<FetchPdfResult> => {
  const config: AxiosRequestConfig = { responseType: 'blob', timeout: PDF_TIMEOUT_MS, params };
  let response;
  try {
    response = method === 'POST' ? await client.post(path, body, config) : await client.get(path, config);
  } catch (err) {
    throw await toPdfDocumentError(err);
  }
  const data: unknown = response.data;
  if (!(data instanceof Blob) || data.size === 0) {
    throw new PdfDocumentError('The document was empty. Please try again.', response.status, null, null);
  }
  return { blob: normalizePdfBlob(data), headers: response.headers as unknown as Record<string, string> };
};

export interface OpenPdfResult {
  /** false when a popup blocker stopped the new tab and the PDF was downloaded instead */
  opened: boolean;
}

/**
 * Opens a tab synchronously (so popup blockers allow it), then fills it with the fetched
 * PDF. Falls back to a direct download if the tab couldn't be opened. Closes the blank tab
 * and throws a typed `PdfDocumentError` on failure.
 */
export const openPdfDocument = async (
  client: AxiosInstance,
  path: string,
  params: Record<string, string | number | undefined> | undefined,
  fallbackFilename: string
): Promise<OpenPdfResult> => {
  let tab: Window | null = null;
  try {
    tab = window.open('', '_blank');
  } catch {
    tab = null;
  }
  try {
    const { blob } = await fetchPdfBlob(client, 'GET', path, undefined, params);
    if (tab) {
      const url = URL.createObjectURL(blob);
      tab.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), URL_REVOKE_MS);
      return { opened: true };
    }
    saveBlob(blob, fallbackFilename);
    return { opened: false };
  } catch (err) {
    tab?.close();
    throw err instanceof PdfDocumentError ? err : await toPdfDocumentError(err);
  }
};

export const downloadPdfDocument = async (
  client: AxiosInstance,
  path: string,
  params: Record<string, string | number | undefined> | undefined,
  filename: string
): Promise<void> => {
  const { blob } = await fetchPdfBlob(client, 'GET', path, undefined, params);
  saveBlob(blob, filename);
};

const readBulkHeaders = (headers: Record<string, string>): BulkAddressLabelResult => {
  const countRaw = headers['x-label-count'];
  const notFoundRaw = headers['x-orders-not-found'];
  const labelCount = countRaw !== undefined && countRaw !== '' ? Number(countRaw) : null;
  const ordersNotFound =
    notFoundRaw === undefined
      ? null
      : notFoundRaw
          .split(',')
          .map(id => id.trim())
          .filter(Boolean);
  return {
    labelCount: Number.isFinite(labelCount) ? labelCount : null,
    ordersNotFound,
  };
};

// ── Customer: GET /orders/:orderId/address-label ─────────────────────────────

export const getMyOrderAddressLabelPreview = async (orderId: string): Promise<AddressLabelPreview> => {
  const response = await api.get(`/orders/${encodeURIComponent(orderId)}/address-label`, {
    params: { format: 'json' },
  });
  const body = response.data;
  return (isRecord(body) && isRecord(body.data) ? body.data : body) as AddressLabelPreview;
};

export const downloadMyOrderAddressLabel = async (orderId: string, filename: string): Promise<void> => {
  await downloadPdfDocument(api, `/orders/${encodeURIComponent(orderId)}/address-label`, { size: 'A4' }, filename);
};

// ── Admin: GET /admin/orders/:orderId/address-label, POST .../address-labels ─

export const adminAddressLabelPath = (orderId: string) =>
  `/admin/orders/${encodeURIComponent(orderId)}/address-label`;

export const getAdminOrderAddressLabelPreview = async (orderId: string): Promise<AddressLabelPreview> => {
  const response = await adminApi.get(adminAddressLabelPath(orderId), { params: { format: 'json' } });
  const body = response.data;
  return (isRecord(body) && isRecord(body.data) ? body.data : body) as AddressLabelPreview;
};

export const openAdminOrderAddressLabel = async (
  orderId: string,
  size: AddressLabelSize,
  copies = 1
): Promise<OpenPdfResult> =>
  openPdfDocument(adminApi, adminAddressLabelPath(orderId), { size, copies }, `Address-Slip-${orderId}.pdf`);

export const MAX_BULK_ADDRESS_LABELS = 100;
export const BULK_ADDRESS_LABEL_PATH = '/admin/orders/address-labels';

export interface BulkPrintResult extends OpenPdfResult {
  result: BulkAddressLabelResult;
}

/** POST /admin/orders/address-labels — one PDF with a slip per selected order, in `orderIds` order */
export const printBulkAdminAddressLabels = async (
  orderIds: string[],
  size: AddressLabelSize
): Promise<BulkPrintResult> => {
  if (orderIds.length === 0) {
    throw new PdfDocumentError('Select at least one order.', null, 'VALIDATION_ERROR', null);
  }
  if (orderIds.length > MAX_BULK_ADDRESS_LABELS) {
    throw new PdfDocumentError(`Select up to ${MAX_BULK_ADDRESS_LABELS} orders per print.`, null, 'VALIDATION_ERROR', null);
  }

  let tab: Window | null = null;
  try {
    tab = window.open('', '_blank');
  } catch {
    tab = null;
  }
  try {
    const { blob, headers } = await fetchPdfBlob(adminApi, 'POST', BULK_ADDRESS_LABEL_PATH, { orderIds, size });
    const result = readBulkHeaders(headers);
    if (tab) {
      const url = URL.createObjectURL(blob);
      tab.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), URL_REVOKE_MS);
      return { opened: true, result };
    }
    saveBlob(blob, `Address-Slips-${Date.now()}.pdf`);
    return { opened: false, result };
  } catch (err) {
    tab?.close();
    throw err instanceof PdfDocumentError ? err : await toPdfDocumentError(err);
  }
};
