// Barcode label printing (Admin > Barcodes & Scanner).
// Backend: GET /admin/product-variants/:id/barcode/label, POST /barcodes/labels,
// GET /barcodes/labels/presets (Swagger section "Barcode Labels (Admin)").

export type LabelLayout = 'ROLL' | 'SHEET';

export type LabelPriceMode = 'MRP' | 'SELLING' | 'BOTH' | 'NONE';

export const LABEL_PRICE_MODES: readonly LabelPriceMode[] = ['MRP', 'SELLING', 'BOTH', 'NONE'];

export interface LabelPreset {
  code: string;
  name: string;
  layout: LabelLayout;
  labelWidthMm?: number;
  labelHeightMm?: number;
  /** SHEET presets only */
  columns?: number;
  rows?: number;
}

export interface LabelLimits {
  maxCopiesPerVariant: number;
  maxLabelsPerRequest: number;
  /** Not sent by the backend today; 1000 per the API docs */
  maxVariantsPerRequest: number;
}

export interface LabelPresetsResponse {
  defaultPreset: string;
  presets: LabelPreset[];
  priceModes: LabelPriceMode[];
  limits: LabelLimits;
}

/** "Show on label" flags. All default to true on the server; only `false` values are sent. */
export interface LabelShowFlags {
  showName: boolean;
  showAttributes: boolean;
  showSku: boolean;
  showBrand: boolean;
}

/** Options shared by the single and bulk print requests */
export interface LabelRenderOptions extends Partial<LabelShowFlags> {
  preset: string;
  price: LabelPriceMode;
  startPosition?: number;
}

export interface LabelBulkItem {
  variantId: string;
  copies: number;
}

/** POST /barcodes/labels body. Send only the fields a given mode needs. */
export interface LabelBulkRequest extends LabelRenderOptions {
  variantIds?: string[];
  items?: LabelBulkItem[];
  productIds?: string[];
  copies?: number;
  copiesFrom?: 'STOCK';
  includeInactive?: true;
  dryRun?: true;
}

export type LabelSkipReason = 'NO_BARCODE' | 'INACTIVE' | 'NO_STOCK' | 'NOT_FOUND';

export interface LabelPreviewVariant {
  variantId: string;
  sku: string;
  productName: string;
  barcode: string;
  copies: number;
}

export interface LabelSkippedVariant {
  variantId: string;
  sku: string;
  productName: string;
  reason: LabelSkipReason | string;
}

/** POST /barcodes/labels with dryRun: true */
export interface LabelPreviewResponse {
  totalLabels: number;
  totalPages: number;
  startPosition?: number;
  preset?: LabelPreset;
  variants: LabelPreviewVariant[];
  skipped: LabelSkippedVariant[];
}

/** Counts read from the X-Label-* response headers; null when the browser can't read them (CORS). */
export interface LabelPrintResult {
  labels: number | null;
  pages: number | null;
  skipped: number | null;
}

export type LabelPrintErrorCode =
  | 'NO_PRINTABLE_LABELS'
  | 'TOO_MANY_LABELS'
  | 'TOO_MANY_VARIANTS'
  | 'INVALID_LABEL_PRESET'
  | 'INVALID_LABEL_SIZE'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | (string & {});
