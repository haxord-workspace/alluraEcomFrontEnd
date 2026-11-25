import React, { useId, useRef, useState } from 'react';
import { Loader2, Printer } from 'lucide-react';
import type { UseLabelPresetsResult } from '../../../hooks/useLabelPresets';
import { describeLabelError, printVariantLabel, toLabelPrintError, type LabelErrorView, type PrintLabelPdfOptions } from '../../../service/barcodeLabels';
import { LabelDialogShell, dialogCancelClass, dialogPrimaryClass, fieldErrorClass, fieldInputClass, fieldLabelClass } from './LabelDialogShell';
import { LabelOptionsFields } from './LabelOptionsFields';
import { LabelErrorNotice } from './LabelErrorNotice';
import { PrintSettingsNote } from './PrintSettingsNote';
import { createLabelOptions, findPreset, parseIntInRange, plural, toRenderOptions } from './labelOptions';

export interface PrintTagTarget {
  variantId: string;
  sku: string;
  productName: string;
  barcode: string;
}

interface PrintTagDialogProps {
  target: PrintTagTarget;
  presets: UseLabelPresetsResult;
  pdfHandlers: PrintLabelPdfOptions;
  onClose: () => void;
  /** Called after the PDF was sent to the print dialog, with a message for a toast */
  onPrinted: (message: string) => void;
  /** 404 from the server: the variant was deleted, the list should be reloaded */
  onVariantMissing: () => void;
}

/** "Print Tag": copies of one variant's label */
export const PrintTagDialog: React.FC<PrintTagDialogProps> = ({ target, presets, pdfHandlers, onClose, onPrinted, onVariantMissing }) => {
  const id = useId();
  const { config, isLoading: isLoadingPresets, isFallback, prefs, savePrefs } = presets;
  const [options, setOptions] = useState(() => createLabelOptions(prefs));
  const [copiesText, setCopiesText] = useState('1');
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<LabelErrorView | null>(null);
  const inFlight = useRef(false);

  const maxCopies = config.limits.maxCopiesPerVariant;
  const copies = parseIntInRange(copiesText, 1, maxCopies, 'the number of copies');
  const preset = findPreset(config, options.preset);
  const render = toRenderOptions(options, preset);
  const canPrint = !isPrinting && !isLoadingPresets && copies.value !== null && render !== null;

  const handlePrint = async () => {
    if (!canPrint || inFlight.current || copies.value === null || render === null) return;
    inFlight.current = true;
    setIsPrinting(true);
    setError(null);
    try {
      const result = await printVariantLabel(target.variantId, { ...render, copies: copies.value }, pdfHandlers);
      savePrefs({ preset: options.preset, price: options.price });
      const count = result.labels ?? copies.value;
      onPrinted(`Sent ${plural(count, 'label')} to the print dialog.`);
      onClose();
    } catch (err) {
      const view = describeLabelError(await toLabelPrintError(err));
      setError(view);
      if (view.variantMissing) onVariantMissing();
    } finally {
      inFlight.current = false;
      setIsPrinting(false);
    }
  };

  return (
    <LabelDialogShell
      title="Print Tag"
      subtitle={
        <span>
          <span className="font-semibold text-stone-700">{target.productName}</span> · <span className="font-mono">{target.sku}</span> ·{' '}
          <span className="font-mono">{target.barcode}</span>
        </span>
      }
      onClose={onClose}
      isBusy={isPrinting}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={isPrinting} className={dialogCancelClass}>
            Cancel
          </button>
          <button type="button" onClick={handlePrint} disabled={!canPrint} className={dialogPrimaryClass}>
            {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            <span>{isPrinting ? 'Preparing…' : 'Print'}</span>
          </button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={e => {
          e.preventDefault();
          void handlePrint();
        }}
      >
        <div>
          <label htmlFor={`${id}-copies`} className={fieldLabelClass}>Copies</label>
          <input
            id={`${id}-copies`}
            data-autofocus
            type="number"
            inputMode="numeric"
            min={1}
            max={maxCopies}
            step={1}
            value={copiesText}
            disabled={isPrinting}
            aria-invalid={!!copies.error}
            aria-describedby={`${id}-copies-hint`}
            onChange={e => setCopiesText(e.target.value)}
            className={fieldInputClass}
          />
          {copies.error ? (
            <p id={`${id}-copies-hint`} className={fieldErrorClass}>{copies.error}</p>
          ) : (
            <p id={`${id}-copies-hint`} className="mt-1 text-[11px] text-stone-400">1 to {maxCopies} labels.</p>
          )}
        </div>

        <LabelOptionsFields
          config={config}
          value={options}
          onChange={setOptions}
          disabled={isPrinting}
          isLoadingPresets={isLoadingPresets}
          isFallback={isFallback}
        />

        {error && <LabelErrorNotice error={error} />}

        <PrintSettingsNote />
        {/* Enter in a field submits */}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </LabelDialogShell>
  );
};
