import React, { useEffect, useId, useRef, useState } from 'react';
import { Loader2, Printer } from 'lucide-react';
import type { UseLabelPresetsResult } from '../../../hooks/useLabelPresets';
import {
  describeLabelError,
  isLabelRequestCanceled,
  previewLabels,
  printBulkLabels,
  toLabelPrintError,
  toLabelRenderParams,
  type LabelErrorView,
  type PrintLabelPdfOptions,
} from '../../../service/barcodeLabels';
import type { LabelBulkRequest, LabelPreviewResponse, LabelRenderOptions } from '../../../types/barcodeLabels';
import { LabelDialogShell, dialogCancelClass, dialogPrimaryClass, fieldErrorClass, fieldInputClass, fieldLabelClass } from './LabelDialogShell';
import { LabelOptionsFields } from './LabelOptionsFields';
import { LabelPreviewSummary } from './LabelPreviewSummary';
import { LabelErrorNotice } from './LabelErrorNotice';
import { PrintSettingsNote } from './PrintSettingsNote';
import { createLabelOptions, findPreset, parseIntInRange, plural, toRenderOptions } from './labelOptions';

export interface BulkPrintRow {
  variantId: string;
  sku: string;
  productName: string;
  /** null when the variant has no barcode yet (the preview lists it as skipped) */
  barcode: string | null;
}

export interface BulkPrintProduct {
  id: string;
  name: string;
  variantCount: number;
}

export type BulkPrintSource =
  | { kind: 'variants'; rows: BulkPrintRow[] }
  | { kind: 'products'; products: BulkPrintProduct[] };

type CopiesMode = 'SAME' | 'PER_ROW' | 'STOCK';

interface BulkPrintDialogProps {
  source: BulkPrintSource;
  presets: UseLabelPresetsResult;
  pdfHandlers: PrintLabelPdfOptions;
  onClose: () => void;
  onPrinted: (message: string) => void;
  /** 404 from the server: something in the list was deleted, reload it */
  onVariantMissing: () => void;
}

const PREVIEW_DEBOUNCE_MS = 300;

interface BuildResult {
  body: LabelBulkRequest | null;
  /** Why there's no body yet (an input is invalid) */
  hint: string | null;
}

/** Builds the POST /barcodes/labels body, sending only the fields the chosen mode needs */
const buildBulkBody = (
  source: BulkPrintSource,
  mode: CopiesMode,
  copiesText: string,
  perRow: Record<string, string>,
  includeInactive: boolean,
  render: LabelRenderOptions | null,
  maxCopies: number
): BuildResult => {
  if (render === null) return { body: null, hint: 'Check the label options above.' };
  const base: LabelBulkRequest = { ...toLabelRenderParams(render), ...(includeInactive ? { includeInactive: true as const } : {}) };

  if (source.kind === 'variants' && source.rows.length === 0) return { body: null, hint: 'No variants selected.' };
  if (source.kind === 'products' && source.products.length === 0) return { body: null, hint: 'No products selected.' };

  const target: Pick<LabelBulkRequest, 'variantIds' | 'productIds'> =
    source.kind === 'variants' ? { variantIds: source.rows.map(r => r.variantId) } : { productIds: source.products.map(p => p.id) };

  if (mode === 'STOCK') return { body: { ...target, copiesFrom: 'STOCK', ...base }, hint: null };

  if (mode === 'PER_ROW' && source.kind === 'variants') {
    const items = [];
    for (const row of source.rows) {
      const parsed = parseIntInRange(perRow[row.variantId] ?? '1', 1, maxCopies, 'a quantity');
      if (parsed.value === null) return { body: null, hint: `${row.sku}: ${parsed.error}` };
      items.push({ variantId: row.variantId, copies: parsed.value });
    }
    return { body: { items, ...base }, hint: null };
  }

  const copies = parseIntInRange(copiesText, 1, maxCopies, 'the number of labels');
  if (copies.value === null) return { body: null, hint: copies.error };
  return { body: { ...target, copies: copies.value, ...base }, hint: null };
};

interface PreviewState {
  key: string;
  data: LabelPreviewResponse | null;
  error: LabelErrorView | null;
}

/** Bulk print: selected rows or whole products in one PDF, with a dry-run preview first */
export const BulkPrintDialog: React.FC<BulkPrintDialogProps> = ({ source, presets, pdfHandlers, onClose, onPrinted, onVariantMissing }) => {
  const id = useId();
  const { config, isLoading: isLoadingPresets, isFallback, prefs, savePrefs } = presets;
  const { maxCopiesPerVariant, maxLabelsPerRequest, maxVariantsPerRequest } = config.limits;

  const [options, setOptions] = useState(() => createLabelOptions(prefs));
  const [mode, setMode] = useState<CopiesMode>('SAME');
  const [copiesText, setCopiesText] = useState('1');
  const [perRow, setPerRow] = useState<Record<string, string>>({});
  const [includeInactive, setIncludeInactive] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState<LabelErrorView | null>(null);
  const inFlight = useRef(false);
  const previewSeq = useRef(0);

  const preset = findPreset(config, options.preset);
  const render = toRenderOptions(options, preset);
  const copiesError = mode === 'SAME' ? parseIntInRange(copiesText, 1, maxCopiesPerVariant, 'the number of labels').error : null;

  const { body, hint } = buildBulkBody(source, mode, copiesText, perRow, includeInactive, render, maxCopiesPerVariant);

  const selectedVariantCount = source.kind === 'variants' ? source.rows.length : null;
  const tooManySelected = selectedVariantCount !== null && selectedVariantCount > maxVariantsPerRequest;
  // Preview and print use the very same body (the preview adds only dryRun: true)
  const previewKey = body && !tooManySelected && !isLoadingPresets ? JSON.stringify(body) : null;

  useEffect(() => {
    if (previewKey === null) return;
    const seq = ++previewSeq.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await previewLabels(JSON.parse(previewKey) as LabelBulkRequest, controller.signal);
        if (seq === previewSeq.current) setPreview({ key: previewKey, data, error: null });
      } catch (err) {
        if (isLabelRequestCanceled(err) || seq !== previewSeq.current) return;
        const view = describeLabelError(await toLabelPrintError(err));
        if (seq === previewSeq.current) setPreview({ key: previewKey, data: null, error: view });
      }
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [previewKey]);

  const isPreviewing = previewKey !== null && preview?.key !== previewKey;
  // Keep showing the last numbers (dimmed) while the next preview loads, to avoid flicker
  const previewData = preview?.data ?? null;
  const previewError = isPreviewing ? null : preview?.error ?? null;

  const previewVariantCount = previewData ? previewData.variants.length + previewData.skipped.length : 0;
  let limitMessage: string | null = null;
  if (tooManySelected) {
    limitMessage = `Select at most ${maxVariantsPerRequest.toLocaleString()} variants per print job (${selectedVariantCount?.toLocaleString()} selected). Print in smaller batches.`;
  } else if (!isPreviewing && previewData && previewData.totalLabels > maxLabelsPerRequest) {
    limitMessage = `Too many labels in one job (${previewData.totalLabels.toLocaleString()}, max ${maxLabelsPerRequest.toLocaleString()}). Print in smaller batches.`;
  } else if (!isPreviewing && previewData && previewVariantCount > maxVariantsPerRequest) {
    limitMessage = `Too many variants in one job (max ${maxVariantsPerRequest.toLocaleString()}). Print in smaller batches.`;
  }

  const canPrint =
    !!body &&
    !isPrinting &&
    !isPreviewing &&
    !limitMessage &&
    !previewError &&
    !!previewData &&
    previewData.totalLabels > 0;

  const handlePrint = async () => {
    if (!canPrint || !body || inFlight.current) return;
    inFlight.current = true;
    setIsPrinting(true);
    setPrintError(null);
    try {
      const result = await printBulkLabels(body, pdfHandlers);
      savePrefs({ preset: options.preset, price: options.price });
      const labels = result.labels ?? previewData?.totalLabels ?? null;
      const skipped = result.skipped ?? previewData?.skipped.length ?? 0;
      const base = labels !== null ? `Sent ${plural(labels, 'label')} to the print dialog.` : 'Labels sent to the print dialog.';
      onPrinted(skipped > 0 ? `${base} ${plural(skipped, 'variant')} skipped.` : base);
      onClose();
    } catch (err) {
      const view = describeLabelError(await toLabelPrintError(err));
      setPrintError(view);
      if (view.variantMissing) onVariantMissing();
    } finally {
      inFlight.current = false;
      setIsPrinting(false);
    }
  };

  const subtitle =
    source.kind === 'variants'
      ? `${plural(source.rows.length, 'variant')} selected`
      : `${plural(source.products.length, 'product')} · every variant`;

  const modeOptions: { value: CopiesMode; label: string; hint: string }[] = [
    { value: 'SAME', label: 'Same number for each', hint: 'Every variant gets the same number of labels.' },
    { value: 'STOCK', label: 'One per unit in stock', hint: 'As many labels as each variant has in stock. Out-of-stock variants are skipped.' },
    ...(source.kind === 'variants'
      ? [{ value: 'PER_ROW' as const, label: 'Own quantity per row', hint: 'Set a quantity for each selected variant below.' }]
      : []),
  ];

  return (
    <LabelDialogShell
      title="Print Labels"
      subtitle={subtitle}
      onClose={onClose}
      isBusy={isPrinting}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={isPrinting} className={dialogCancelClass}>
            Cancel
          </button>
          <button type="button" onClick={handlePrint} disabled={!canPrint} className={dialogPrimaryClass}>
            {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            <span>
              {isPrinting
                ? 'Preparing…'
                : previewData && !isPreviewing && previewData.totalLabels > 0
                  ? `Print ${plural(previewData.totalLabels, 'label')}`
                  : 'Print'}
            </span>
          </button>
        </>
      }
    >
      <fieldset className="space-y-2">
        <legend className={fieldLabelClass}>How many labels</legend>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
          {modeOptions.map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-2 p-2.5 border rounded-xl cursor-pointer transition-colors ${
                mode === opt.value ? 'border-stone-800 bg-stone-50' : 'border-stone-200 hover:bg-stone-50'
              }`}
            >
              <input
                type="radio"
                name={`${id}-mode`}
                value={opt.value}
                checked={mode === opt.value}
                disabled={isPrinting}
                onChange={() => setMode(opt.value)}
                className="mt-0.5 accent-[#561C08]"
              />
              <span>
                <span className="block font-semibold text-stone-800">{opt.label}</span>
                <span className="block text-[11px] text-stone-500 leading-snug">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>

        {mode === 'SAME' && (
          <div className="sm:w-48">
            <label htmlFor={`${id}-copies`} className={fieldLabelClass}>Labels per variant</label>
            <input
              id={`${id}-copies`}
              data-autofocus
              type="number"
              inputMode="numeric"
              min={1}
              max={maxCopiesPerVariant}
              step={1}
              value={copiesText}
              disabled={isPrinting}
              aria-invalid={!!copiesError}
              onChange={e => setCopiesText(e.target.value)}
              className={fieldInputClass}
            />
            {copiesError && <p className={fieldErrorClass}>{copiesError}</p>}
          </div>
        )}
      </fieldset>

      {/* What will be printed */}
      <div>
        <p className={fieldLabelClass}>{source.kind === 'variants' ? 'Selected variants' : 'Selected products'}</p>
        <ul className="max-h-48 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-xl">
          {source.kind === 'variants'
            ? source.rows.map(row => {
                const qty = perRow[row.variantId] ?? '1';
                const qtyError = mode === 'PER_ROW' ? parseIntInRange(qty, 1, maxCopiesPerVariant, 'a quantity').error : null;
                return (
                  <li key={row.variantId} className="px-3 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-stone-800 truncate">{row.sku}</p>
                      <p className="text-[11px] text-stone-500 truncate">
                        {row.productName} ·{' '}
                        {row.barcode ? <span className="font-mono">{row.barcode}</span> : <span className="text-amber-700 font-semibold">No barcode</span>}
                      </p>
                    </div>
                    {mode === 'PER_ROW' && (
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={maxCopiesPerVariant}
                        step={1}
                        value={qty}
                        disabled={isPrinting}
                        aria-label={`Quantity for ${row.sku}`}
                        aria-invalid={!!qtyError}
                        onChange={e => setPerRow(prev => ({ ...prev, [row.variantId]: e.target.value }))}
                        className={`w-20 flex-shrink-0 p-2 bg-stone-50 border rounded-lg text-xs focus:outline-none focus:border-stone-800 ${
                          qtyError ? 'border-rose-400' : 'border-stone-200'
                        }`}
                      />
                    )}
                  </li>
                );
              })
            : source.products.map(p => (
                <li key={p.id} className="px-3 py-2 flex items-center justify-between gap-3">
                  <p className="font-serif text-stone-900 truncate">{p.name}</p>
                  <span className="text-[11px] text-stone-500 flex-shrink-0">{plural(p.variantCount, 'variant')}</span>
                </li>
              ))}
        </ul>
      </div>

      <LabelOptionsFields
        config={config}
        value={options}
        onChange={setOptions}
        disabled={isPrinting}
        isLoadingPresets={isLoadingPresets}
        isFallback={isFallback}
      />

      <label className="flex items-center gap-2 text-stone-700 cursor-pointer">
        <input
          type="checkbox"
          checked={includeInactive}
          disabled={isPrinting}
          onChange={e => setIncludeInactive(e.target.checked)}
          className="h-3.5 w-3.5 accent-[#561C08]"
        />
        <span>Include inactive variants <span className="text-stone-400">(skipped by default)</span></span>
      </label>

      <LabelPreviewSummary
        preview={previewData}
        error={previewError}
        isLoading={isPreviewing}
        layout={preset?.layout}
        inputHint={tooManySelected ? null : hint}
        limitMessage={limitMessage}
      />

      {printError && <LabelErrorNotice error={printError} />}

      <PrintSettingsNote />
    </LabelDialogShell>
  );
};
