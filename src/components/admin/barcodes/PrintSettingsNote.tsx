import React from 'react';
import { Info } from 'lucide-react';

/** Printer settings the user must pick for labels to come out at the right size */
export const PrintSettingsNote: React.FC = () => (
  <div className="flex gap-2.5 p-3 bg-stone-50 border border-stone-200 rounded-xl text-[11px] leading-relaxed text-stone-600" role="note">
    <Info size={14} className="text-allura-goldDark flex-shrink-0 mt-0.5" aria-hidden="true" />
    <div className="space-y-1">
      <p>
        <span className="font-bold text-stone-800">Before printing:</span> set <span className="font-semibold">Scale = 100% (Actual size)</span>, not
        "Fit to page", and <span className="font-semibold">Margins = None</span>.
      </p>
      <p>
        <span className="font-bold text-stone-800">Label printer:</span> in the printer settings, the paper size must match the label, for example 50 × 25 mm.
      </p>
      <p>
        <span className="font-bold text-stone-800">A4 sheets:</span> paper size A4, Actual size. If the scale is set to "Fit", the labels shrink and won't
        line up with the stickers.
      </p>
    </div>
  </div>
);
