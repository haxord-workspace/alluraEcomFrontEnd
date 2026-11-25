import type { LabelPrintPrefs } from '../../../hooks/useLabelPresets';
import type {
  LabelPreset,
  LabelPresetsResponse,
  LabelPriceMode,
  LabelRenderOptions,
  LabelShowFlags,
} from '../../../types/barcodeLabels';

/** State of the shared "label size / price / start at / show on label" fields */
export interface LabelOptionsValue {
  preset: string;
  price: LabelPriceMode;
  /** Kept as text so the field can be cleared while typing */
  startPosition: string;
  show: LabelShowFlags;
}

export const DEFAULT_SHOW_FLAGS: LabelShowFlags = {
  showName: true,
  showAttributes: true,
  showSku: true,
  showBrand: true,
};

export const PRICE_MODE_LABELS: Record<LabelPriceMode, string> = {
  MRP: 'MRP',
  SELLING: 'Selling price',
  BOTH: 'Both (MRP crossed out, then selling price)',
  NONE: 'None',
};

export const createLabelOptions = (prefs: LabelPrintPrefs): LabelOptionsValue => ({
  preset: prefs.preset,
  price: prefs.price,
  startPosition: '1',
  show: { ...DEFAULT_SHOW_FLAGS },
});

export const findPreset = (config: LabelPresetsResponse, code: string): LabelPreset | undefined =>
  config.presets.find(p => p.code === code);

/** Stickers on one sheet, when the preset says so */
export const sheetCapacity = (preset: LabelPreset | undefined): number | null =>
  preset?.layout === 'SHEET' && preset.columns && preset.rows ? preset.columns * preset.rows : null;

export interface ParsedInt {
  value: number | null;
  error: string | null;
}

/** Parses a whole number field and checks it is within [min, max] */
export const parseIntInRange = (raw: string, min: number, max: number, label: string): ParsedInt => {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: `Enter ${label}.` };
  if (!/^\d+$/.test(trimmed)) return { value: null, error: `${label[0].toUpperCase()}${label.slice(1)} must be a whole number.` };
  const value = Number(trimmed);
  if (value < min || value > max) return { value: null, error: `Use a number from ${min} to ${max}.` };
  return { value, error: null };
};

export const validateStartPosition = (value: LabelOptionsValue, preset: LabelPreset | undefined): ParsedInt => {
  if (preset?.layout !== 'SHEET') return { value: 1, error: null };
  const max = sheetCapacity(preset) ?? 1000;
  return parseIntInRange(value.startPosition, 1, max, 'a sticker number');
};

/** Render options for a request; null while a field is invalid */
export const toRenderOptions = (value: LabelOptionsValue, preset: LabelPreset | undefined): LabelRenderOptions | null => {
  const start = validateStartPosition(value, preset);
  if (start.error || start.value === null) return null;
  return {
    preset: value.preset,
    price: value.price,
    ...(preset?.layout === 'SHEET' && start.value > 1 ? { startPosition: start.value } : {}),
    ...value.show,
  };
};

export const plural = (n: number, one: string, many: string = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
