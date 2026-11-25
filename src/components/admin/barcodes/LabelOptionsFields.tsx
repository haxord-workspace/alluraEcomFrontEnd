import React, { useId, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { LabelPresetsResponse, LabelPriceMode, LabelShowFlags } from '../../../types/barcodeLabels';
import { PRICE_MODE_LABELS, findPreset, sheetCapacity, validateStartPosition, type LabelOptionsValue } from './labelOptions';
import { fieldErrorClass, fieldInputClass, fieldLabelClass } from './LabelDialogShell';

interface LabelOptionsFieldsProps {
  config: LabelPresetsResponse;
  value: LabelOptionsValue;
  onChange: (next: LabelOptionsValue) => void;
  disabled?: boolean;
  /** Presets are still loading */
  isLoadingPresets?: boolean;
  /** The presets call failed; only the built-in fallback sizes are offered */
  isFallback?: boolean;
}

const SHOW_FLAG_LABELS: { key: keyof LabelShowFlags; label: string }[] = [
  { key: 'showName', label: 'Product name' },
  { key: 'showAttributes', label: 'Size / colour' },
  { key: 'showSku', label: 'SKU' },
  { key: 'showBrand', label: 'Brand line (labels 28 mm or taller)' },
];

/** Label size, price on label, start sticker (A4 only) and "Show on label"; shared by both print dialogs */
export const LabelOptionsFields: React.FC<LabelOptionsFieldsProps> = ({
  config,
  value,
  onChange,
  disabled = false,
  isLoadingPresets = false,
  isFallback = false,
}) => {
  const id = useId();
  const [showAdvanced, setShowAdvanced] = useState(() => Object.values(value.show).some(v => !v));
  const preset = findPreset(config, value.preset);
  const isSheet = preset?.layout === 'SHEET';
  const capacity = sheetCapacity(preset);
  const startError = isSheet ? validateStartPosition(value, preset).error : null;

  const rolls = config.presets.filter(p => p.layout === 'ROLL');
  const sheets = config.presets.filter(p => p.layout === 'SHEET');
  const hiddenCount = Object.values(value.show).filter(v => !v).length;

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${id}-preset`} className={fieldLabelClass}>Label size</label>
        <select
          id={`${id}-preset`}
          value={value.preset}
          disabled={disabled || isLoadingPresets}
          onChange={e => onChange({ ...value, preset: e.target.value, startPosition: '1' })}
          className={fieldInputClass}
        >
          {rolls.length > 0 && (
            <optgroup label="Label printer (roll)">
              {rolls.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
            </optgroup>
          )}
          {sheets.length > 0 && (
            <optgroup label="A4 sticker sheet">
              {sheets.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
            </optgroup>
          )}
        </select>
        {isLoadingPresets && <p className="mt-1 text-[11px] text-stone-400">Loading label sizes…</p>}
        {isFallback && !isLoadingPresets && (
          <p className="mt-1 text-[11px] text-amber-700">Couldn't load all label sizes. Showing the standard sizes only.</p>
        )}
      </div>

      <div className={`grid gap-3 ${isSheet ? 'sm:grid-cols-2' : ''}`}>
        <div>
          <label htmlFor={`${id}-price`} className={fieldLabelClass}>Price on label</label>
          <select
            id={`${id}-price`}
            value={value.price}
            disabled={disabled}
            onChange={e => onChange({ ...value, price: e.target.value as LabelPriceMode })}
            className={fieldInputClass}
          >
            {config.priceModes.map(mode => <option key={mode} value={mode}>{PRICE_MODE_LABELS[mode]}</option>)}
          </select>
        </div>

        {isSheet && (
          <div>
            <label htmlFor={`${id}-start`} className={fieldLabelClass}>Start at sticker #</label>
            <input
              id={`${id}-start`}
              type="number"
              inputMode="numeric"
              min={1}
              max={capacity ?? undefined}
              step={1}
              value={value.startPosition}
              disabled={disabled}
              aria-invalid={!!startError}
              aria-describedby={`${id}-start-hint`}
              onChange={e => onChange({ ...value, startPosition: e.target.value })}
              className={fieldInputClass}
            />
            {startError ? (
              <p id={`${id}-start-hint`} className={fieldErrorClass}>{startError}</p>
            ) : (
              <p id={`${id}-start-hint`} className="mt-1 text-[11px] text-stone-400">
                For partly used sheets. 1 = top-left{capacity ? `, ${capacity} per sheet` : ''}.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="border border-stone-200 rounded-xl">
        <button
          type="button"
          onClick={() => setShowAdvanced(o => !o)}
          aria-expanded={showAdvanced}
          aria-controls={`${id}-advanced`}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[11px] font-bold text-stone-600 hover:text-stone-900"
        >
          <span className="flex items-center gap-1.5">
            {showAdvanced ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            Advanced: show on label
          </span>
          {hiddenCount > 0 && <span className="text-[10px] font-semibold text-amber-700">{hiddenCount} hidden</span>}
        </button>
        {showAdvanced && (
          <fieldset id={`${id}-advanced`} className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <legend className="sr-only">Show on label</legend>
            {SHOW_FLAG_LABELS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.show[key]}
                  disabled={disabled}
                  onChange={e => onChange({ ...value, show: { ...value.show, [key]: e.target.checked } })}
                  className="h-3.5 w-3.5 accent-[#561C08]"
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
        )}
      </div>
    </div>
  );
};
