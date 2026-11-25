import axios from 'axios';
import adminApi from './adminApi';
import { getBackendErrorMessage } from '../utils/apiResponse';
import {
  LABEL_PRICE_MODES,
  type LabelBulkRequest,
  type LabelLimits,
  type LabelPreset,
  type LabelPresetsResponse,
  type LabelPreviewResponse,
  type LabelPriceMode,
  type LabelPrintErrorCode,
  type LabelPrintResult,
  type LabelRenderOptions,
  type LabelSkipReason,
  type LabelSkippedVariant,
} from '../types/barcodeLabels';

// -----------------------------------------------------------------------------
// Barcode label printing. The backend renders a print-ready PDF (labels drawn at
// their real size in mm); the browser only fetches it and opens the print dialog.
// All calls go through `adminApi`, so an expired access token is refreshed and the
// request retried once, and a failed refresh signs the admin out as everywhere else.
// -----------------------------------------------------------------------------

/** PDF generation for big jobs can take longer than adminApi's 45 s default */
const PDF_TIMEOUT_MS = 120_000;
/** The hidden print iframe (and, unless the caller keeps it, the PDF URL) is cleaned up after this */
const PRINT_FRAME_CLEANUP_MS = 60_000;

export const DEFAULT_LABEL_LIMITS: LabelLimits = {
  maxCopiesPerVariant: 500,
  maxLabelsPerRequest: 5000,
  maxVariantsPerRequest: 1000,
};

/** Used only when GET /barcodes/labels/presets fails */
export const FALLBACK_LABEL_PRESETS: LabelPresetsResponse = {
  defaultPreset: 'ROLL_50x25',
  presets: [
    { code: 'ROLL_50x25', name: 'Roll label 50 × 25 mm (most common)', layout: 'ROLL', labelWidthMm: 50, labelHeightMm: 25 },
    { code: 'A4_40', name: 'A4 sheet, 40 labels (4 × 10, 52.5 × 29.7 mm)', layout: 'SHEET', columns: 4, rows: 10 },
  ],
  priceModes: [...LABEL_PRICE_MODES],
  limits: DEFAULT_LABEL_LIMITS,
};

export const LABEL_SKIP_REASON_TEXT: Record<LabelSkipReason, string> = {
  NO_BARCODE: 'No barcode assigned',
  INACTIVE: 'Variant is inactive',
  NO_STOCK: 'Nothing in stock',
  NOT_FOUND: 'Variant no longer exists',
};

export const describeSkipReason = (reason: string): string =>
  LABEL_SKIP_REASON_TEXT[reason as LabelSkipReason] || reason;

// ─── Errors ──────────────────────────────────────────────────────────────────

export class LabelPrintError extends Error {
  readonly status: number | null;
  readonly code: LabelPrintErrorCode | null;
  readonly details: unknown;

  constructor(message: string, status: number | null, code: LabelPrintErrorCode | null, details: unknown) {
    super(message);
    this.name = 'LabelPrintError';
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

export const isLabelRequestCanceled = (err: unknown): boolean => axios.isCancel(err);

/** Turns any thrown value from the label endpoints into a typed LabelPrintError */
export const toLabelPrintError = async (err: unknown): Promise<LabelPrintError> => {
  if (err instanceof LabelPrintError) return err;

  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return new LabelPrintError('Network error. Check your connection and try again.', null, 'NETWORK_ERROR', null);
    }
    const body = await readErrorBody(err.response.data);
    const errorObj = isRecord(body) && isRecord(body.error) ? body.error : null;
    const code = asString(errorObj?.code) || (isRecord(body) ? asString(body.code) : '') || null;
    const details = errorObj?.details ?? (isRecord(body) ? body.details : undefined) ?? null;
    // Reuse the app's standard message extraction on the parsed body
    const message = getBackendErrorMessage({ response: { data: body } }, 'Could not create labels');
    return new LabelPrintError(message, err.response.status, code, details);
  }

  // Not an HTTP error (for example the session refresh failing, which also signs the admin out)
  return new LabelPrintError('Could not create labels. Please try again.', null, null, null);
};

const toSkippedList = (details: unknown): LabelSkippedVariant[] => {
  const list = Array.isArray(details)
    ? details
    : isRecord(details) && Array.isArray(details.skipped)
      ? details.skipped
      : isRecord(details) && Array.isArray(details.variants)
        ? details.variants
        : [];
  return list.filter(isRecord).map(item => ({
    variantId: asString(item.variantId),
    sku: asString(item.sku),
    productName: asString(item.productName),
    reason: asString(item.reason),
  }));
};

const toFieldMessages = (details: unknown): string[] => {
  if (Array.isArray(details)) {
    return details
      .map(d => {
        if (typeof d === 'string') return d;
        if (!isRecord(d)) return '';
        const msg = asString(d.message) || asString(d.msg);
        const path = asString(d.path).replace(/^(body|query|params)\./, '') || asString(d.field);
        return msg ? (path ? `${path}: ${msg}` : msg) : '';
      })
      .filter(Boolean);
  }
  if (isRecord(details)) {
    return Object.entries(details)
      .map(([key, val]) => (typeof val === 'string' ? `${key}: ${val}` : ''))
      .filter(Boolean);
  }
  return [];
};

export interface LabelErrorView {
  message: string;
  /** Extra lines to list under the message (field errors) */
  lines: string[];
  /** Variants the server could not print, with the reason */
  skipped: LabelSkippedVariant[];
  /** 404: the variant is gone, the list should be refreshed */
  variantMissing: boolean;
}

/** User-facing text for a label printing error */
export const describeLabelError = (error: LabelPrintError): LabelErrorView => {
  const view: LabelErrorView = { message: error.message || 'Could not create labels. Please try again.', lines: [], skipped: [], variantMissing: false };

  switch (error.code) {
    case 'NO_PRINTABLE_LABELS':
      return { ...view, message: 'None of these variants have a barcode yet.', skipped: toSkippedList(error.details) };
    case 'TOO_MANY_LABELS':
    case 'TOO_MANY_VARIANTS':
      return { ...view, message: 'Too many labels in one job. Print in smaller batches.' };
    case 'INVALID_LABEL_PRESET':
    case 'INVALID_LABEL_SIZE':
      return { ...view, message: 'Choose a label size from the list.' };
    case 'VALIDATION_ERROR': {
      const lines = toFieldMessages(error.details);
      return { ...view, message: lines.length ? 'Please fix the following:' : view.message, lines };
    }
    case 'NETWORK_ERROR':
      return view;
    default:
      break;
  }

  if (error.status === 401) return { ...view, message: 'Your session has expired. Please sign in again.' };
  if (error.status === 403) return { ...view, message: "You don't have permission to print labels." };
  if (error.status === 404) return { ...view, message: 'This variant no longer exists.', variantMissing: true };
  if (error.status !== null && error.status >= 500) {
    return { ...view, message: 'The label service had a problem. Please try again.' };
  }
  return view;
};

// ─── Presets ─────────────────────────────────────────────────────────────────

const toPreset = (raw: unknown): LabelPreset | null => {
  if (!isRecord(raw)) return null;
  const code = asString(raw.code);
  const layout = raw.layout === 'ROLL' || raw.layout === 'SHEET' ? raw.layout : null;
  if (!code || !layout) return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  return {
    code,
    name: asString(raw.name) || code,
    layout,
    labelWidthMm: num(raw.labelWidthMm),
    labelHeightMm: num(raw.labelHeightMm),
    columns: num(raw.columns),
    rows: num(raw.rows),
  };
};

const positiveInt = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;

/** GET /barcodes/labels/presets — label sizes, price modes and limits for the print dialogs */
export const getLabelPresets = async (): Promise<LabelPresetsResponse> => {
  const response = await adminApi.get('/barcodes/labels/presets');
  const body: unknown = response.data;
  const data = isRecord(body) && isRecord(body.data) ? body.data : body;
  if (!isRecord(data)) throw new Error('Unexpected label presets response');

  const presets = (Array.isArray(data.presets) ? data.presets : [])
    .map(toPreset)
    .filter((p): p is LabelPreset => p !== null);
  if (presets.length === 0) throw new Error('No label presets returned');

  const priceModes = (Array.isArray(data.priceModes) ? data.priceModes : []).filter(
    (m): m is LabelPriceMode => LABEL_PRICE_MODES.includes(m as LabelPriceMode)
  );
  const limits = isRecord(data.limits) ? data.limits : {};
  const requestedDefault = asString(data.defaultPreset);

  return {
    defaultPreset: presets.some(p => p.code === requestedDefault) ? requestedDefault : presets[0].code,
    presets,
    priceModes: priceModes.length ? priceModes : [...LABEL_PRICE_MODES],
    limits: {
      maxCopiesPerVariant: positiveInt(limits.maxCopiesPerVariant, DEFAULT_LABEL_LIMITS.maxCopiesPerVariant),
      maxLabelsPerRequest: positiveInt(limits.maxLabelsPerRequest, DEFAULT_LABEL_LIMITS.maxLabelsPerRequest),
      maxVariantsPerRequest: positiveInt(limits.maxVariantsPerRequest, DEFAULT_LABEL_LIMITS.maxVariantsPerRequest),
    },
  };
};

// ─── Preview (dry run) ───────────────────────────────────────────────────────

const toNumber = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

/**
 * POST /barcodes/labels with dryRun: true — returns what would be printed (JSON, no PDF).
 * Pass the exact body you will print with, so the preview matches the printout.
 */
export const previewLabels = async (body: LabelBulkRequest, signal?: AbortSignal): Promise<LabelPreviewResponse> => {
  try {
    const response = await adminApi.post('/barcodes/labels', { ...body, dryRun: true }, { signal, timeout: PDF_TIMEOUT_MS });
    const raw: unknown = response.data;
    const data = isRecord(raw) && isRecord(raw.data) ? raw.data : raw;
    if (!isRecord(data)) throw new Error('Unexpected preview response');
    const variants = (Array.isArray(data.variants) ? data.variants : []).filter(isRecord).map(v => ({
      variantId: asString(v.variantId),
      sku: asString(v.sku),
      productName: asString(v.productName),
      barcode: asString(v.barcode),
      copies: toNumber(v.copies),
    }));
    return {
      totalLabels: toNumber(data.totalLabels),
      totalPages: toNumber(data.totalPages),
      startPosition: typeof data.startPosition === 'number' ? data.startPosition : undefined,
      preset: toPreset(data.preset) ?? undefined,
      variants,
      skipped: toSkippedList(data.skipped),
    };
  } catch (err) {
    if (isLabelRequestCanceled(err)) throw err;
    throw await toLabelPrintError(err);
  }
};

// ─── PDF printing ────────────────────────────────────────────────────────────

export interface PrintLabelPdfOptions {
  /**
   * Called with the PDF's object URL as soon as it is ready. When given, the caller owns the
   * URL (for an "Open PDF" link) and must release it with `releaseLabelPdfUrl`.
   */
  onPdfReady?: (url: string) => void;
  /**
   * Printing from the hidden iframe failed (Safari can block it) and the PDF was opened in a
   * new tab instead. `opened: false` means a popup blocker stopped that too.
   */
  onFallback?: (info: { url: string; opened: boolean }) => void;
}

export const releaseLabelPdfUrl = (url: string) => URL.revokeObjectURL(url);

const readCountHeader = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Fetches a label PDF and opens the browser's print dialog through a hidden iframe, so the
 * user stays on the page. Throws a LabelPrintError on failure.
 * `path` is relative to the API base URL (which already ends in /api/v1).
 */
export const printLabelPdf = async (
  path: string,
  body?: LabelBulkRequest,
  options: PrintLabelPdfOptions = {}
): Promise<LabelPrintResult> => {
  let response;
  try {
    response = body
      ? await adminApi.post(path, body, { responseType: 'blob', timeout: PDF_TIMEOUT_MS })
      : await adminApi.get(path, { responseType: 'blob', timeout: PDF_TIMEOUT_MS });
  } catch (err) {
    throw await toLabelPrintError(err);
  }

  const blob: unknown = response.data;
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new LabelPrintError('The label PDF was empty. Please try again.', response.status, null, null);
  }

  const pdf = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  const url = URL.createObjectURL(pdf);
  const callerOwnsUrl = typeof options.onPdfReady === 'function';
  options.onPdfReady?.(url);

  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      // Fallback: open the PDF and let the user print from the viewer
      const tab = window.open(url, '_blank');
      options.onFallback?.({ url, opened: !!tab });
    }
  };
  frame.src = url;
  document.body.appendChild(frame);
  window.setTimeout(() => {
    frame.remove();
    if (!callerOwnsUrl) URL.revokeObjectURL(url);
  }, PRINT_FRAME_CLEANUP_MS);

  // Readable only if the backend lists them in Access-Control-Expose-Headers
  const headers = response.headers;
  return {
    labels: readCountHeader(headers['x-label-count']),
    pages: readCountHeader(headers['x-label-pages']),
    skipped: readCountHeader(headers['x-label-skipped']),
  };
};

/** Only the render options that differ from the server defaults */
export const toLabelRenderParams = (options: LabelRenderOptions): LabelRenderOptions => {
  const out: LabelRenderOptions = { preset: options.preset, price: options.price };
  if (options.startPosition !== undefined && options.startPosition > 1) out.startPosition = options.startPosition;
  if (options.showName === false) out.showName = false;
  if (options.showAttributes === false) out.showAttributes = false;
  if (options.showSku === false) out.showSku = false;
  if (options.showBrand === false) out.showBrand = false;
  return out;
};

/** GET /admin/product-variants/:variantId/barcode/label — PDF for one variant ("Print Tag") */
export const printVariantLabel = (
  variantId: string,
  params: LabelRenderOptions & { copies: number },
  options?: PrintLabelPdfOptions
): Promise<LabelPrintResult> => {
  const render = toLabelRenderParams(params);
  const q = new URLSearchParams({ copies: String(params.copies), preset: render.preset, price: render.price });
  if (render.startPosition !== undefined) q.set('startPosition', String(render.startPosition));
  (['showName', 'showAttributes', 'showSku', 'showBrand'] as const).forEach(key => {
    if (render[key] === false) q.set(key, 'false');
  });
  return printLabelPdf(`/admin/product-variants/${encodeURIComponent(variantId)}/barcode/label?${q}`, undefined, options);
};

/** POST /barcodes/labels — one PDF for many variants or whole products */
export const printBulkLabels = (body: LabelBulkRequest, options?: PrintLabelPdfOptions): Promise<LabelPrintResult> => {
  // Never ask for a dry run here; that returns JSON, not a PDF
  const { dryRun: _dryRun, ...printBody } = body;
  return printLabelPdf('/barcodes/labels', printBody, options);
};
