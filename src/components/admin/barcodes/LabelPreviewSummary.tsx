import React, { useId, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { describeSkipReason, type LabelErrorView } from '../../../service/barcodeLabels';
import type { LabelLayout, LabelPreviewResponse } from '../../../types/barcodeLabels';
import { LabelErrorNotice } from './LabelErrorNotice';
import { plural } from './labelOptions';

interface LabelPreviewSummaryProps {
  preview: LabelPreviewResponse | null;
  error: LabelErrorView | null;
  isLoading: boolean;
  layout: LabelLayout | undefined;
  /** Shown instead of the summary when the inputs aren't valid yet */
  inputHint?: string | null;
  /** Client-side limit problem (too many labels / variants) */
  limitMessage?: string | null;
}

/** "34 labels · 1 A4 sheet. 2 variants skipped." with an expandable list of the skipped variants */
export const LabelPreviewSummary: React.FC<LabelPreviewSummaryProps> = ({ preview, error, isLoading, layout, inputHint, limitMessage }) => {
  const listId = useId();
  const [showSkipped, setShowSkipped] = useState(false);

  if (inputHint) {
    return <p className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-[11px] text-stone-500">{inputHint}</p>;
  }

  if (error && !isLoading) return <LabelErrorNotice error={error} />;

  const skipped = preview?.skipped ?? [];
  const total = preview?.totalLabels ?? 0;
  const pages = preview?.totalPages ?? 0;
  const sizeText = layout === 'SHEET' ? ` · ${plural(pages, 'A4 sheet')}` : ' on a roll';

  return (
    <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2" aria-live="polite">
      <div className="flex items-center gap-2 text-[12px]">
        {isLoading && <Loader2 size={13} className="animate-spin text-stone-400 flex-shrink-0" aria-hidden="true" />}
        {preview ? (
          <p className={`text-stone-800 ${isLoading ? 'opacity-60' : ''}`}>
            <span className="font-bold">{plural(total, 'label')}</span>
            {total > 0 && sizeText}.
            {skipped.length > 0 && <span className="text-amber-700"> {plural(skipped.length, 'variant')} skipped.</span>}
          </p>
        ) : (
          <p className="text-stone-500">{isLoading ? 'Counting labels…' : 'No preview yet.'}</p>
        )}
      </div>

      {preview && !isLoading && total === 0 && (
        <p className="text-[11px] font-semibold text-rose-600">
          Nothing to print. {skipped.length > 0 ? 'None of these variants can be printed (see below).' : 'No variants were found.'}
        </p>
      )}

      {limitMessage && <p className="text-[11px] font-semibold text-rose-600">{limitMessage}</p>}

      {skipped.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowSkipped(o => !o)}
            aria-expanded={showSkipped}
            aria-controls={listId}
            className="flex items-center gap-1 text-[11px] font-bold text-stone-600 hover:text-stone-900"
          >
            {showSkipped ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {showSkipped ? 'Hide skipped variants' : 'Show skipped variants'}
          </button>
          {showSkipped && (
            <ul id={listId} className="mt-1.5 max-h-40 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-lg bg-white">
              {skipped.map((s, i) => (
                <li key={`${s.variantId}-${i}`} className="px-2.5 py-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[11px]">
                  <span className="min-w-0">
                    <span className="font-mono font-semibold text-stone-800">{s.sku || s.variantId}</span>
                    {s.productName && <span className="text-stone-500"> · {s.productName}</span>}
                  </span>
                  <span className="text-amber-700 font-semibold">{describeSkipReason(s.reason)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
