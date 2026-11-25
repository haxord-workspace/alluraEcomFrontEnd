import React from 'react';
import { AlertCircle } from 'lucide-react';
import { describeSkipReason, type LabelErrorView } from '../../../service/barcodeLabels';

/** Inline error for the print dialogs, with field errors and the variants that couldn't be printed */
export const LabelErrorNotice: React.FC<{ error: LabelErrorView }> = ({ error }) => (
  <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 space-y-1.5">
    <p className="flex items-start gap-1.5 font-bold">
      <AlertCircle size={13} className="flex-shrink-0 mt-px" aria-hidden="true" />
      <span>{error.message}</span>
    </p>
    {error.lines.length > 0 && (
      <ul className="list-disc pl-6 space-y-0.5">
        {error.lines.map(line => <li key={line}>{line}</li>)}
      </ul>
    )}
    {error.skipped.length > 0 && (
      <ul className="pl-5 space-y-0.5 max-h-32 overflow-y-auto">
        {error.skipped.map((s, i) => (
          <li key={`${s.variantId}-${i}`}>
            <span className="font-mono font-semibold">{s.sku || s.variantId}</span>
            {s.productName && <span className="text-rose-600/80"> · {s.productName}</span>}
            <span>: {describeSkipReason(s.reason)}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);
