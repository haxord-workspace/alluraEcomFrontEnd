import { useCallback, useEffect, useState } from 'react';
import { FALLBACK_LABEL_PRESETS, getLabelPresets } from '../service/barcodeLabels';
import { LABEL_PRICE_MODES, type LabelPresetsResponse, type LabelPriceMode } from '../types/barcodeLabels';

const PREFS_KEY = 'allura:barcode-label-prefs';

export interface LabelPrintPrefs {
  preset: string;
  price: LabelPriceMode;
}

const readPrefs = (): Partial<LabelPrintPrefs> => {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const { preset, price } = parsed as Record<string, unknown>;
    return {
      preset: typeof preset === 'string' ? preset : undefined,
      price: LABEL_PRICE_MODES.includes(price as LabelPriceMode) ? (price as LabelPriceMode) : undefined,
    };
  } catch {
    return {};
  }
};

const writePrefs = (prefs: LabelPrintPrefs) => {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage blocked (private mode etc.): the choice just isn't remembered
  }
};

/** Last choices, ignoring saved values that the current preset list no longer offers */
const resolvePrefs = (config: LabelPresetsResponse): LabelPrintPrefs => {
  const saved = readPrefs();
  const preset = saved.preset && config.presets.some(p => p.code === saved.preset) ? saved.preset : config.defaultPreset;
  const price = saved.price && config.priceModes.includes(saved.price) ? saved.price : config.priceModes.includes('MRP') ? 'MRP' : config.priceModes[0];
  return { preset, price };
};

export interface UseLabelPresetsResult {
  config: LabelPresetsResponse;
  isLoading: boolean;
  /** True when the presets call failed and the small built-in list is in use */
  isFallback: boolean;
  /** Initial values for a print dialog (last used preset and price mode) */
  prefs: LabelPrintPrefs;
  /** Remember the preset and price mode the user just printed with */
  savePrefs: (prefs: LabelPrintPrefs) => void;
}

/** Loads GET /barcodes/labels/presets once (when enabled) and the user's last print choices */
export const useLabelPresets = (enabled: boolean): UseLabelPresetsResult => {
  const [config, setConfig] = useState<LabelPresetsResponse>(FALLBACK_LABEL_PRESETS);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isFallback, setIsFallback] = useState(false);
  const [prefs, setPrefs] = useState<LabelPrintPrefs>(() => resolvePrefs(FALLBACK_LABEL_PRESETS));

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    getLabelPresets()
      .then(result => {
        if (!active) return;
        setConfig(result);
        setPrefs(resolvePrefs(result));
        setIsFallback(false);
      })
      .catch(() => {
        if (!active) return;
        setIsFallback(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  const savePrefs = useCallback((next: LabelPrintPrefs) => {
    setPrefs(next);
    writePrefs(next);
  }, []);

  return { config, isLoading, isFallback, prefs, savePrefs };
};
