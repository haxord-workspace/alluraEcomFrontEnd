import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pipette, Check } from 'lucide-react';
import type { RGB, HSL } from '../../utils/colorConversion';
import {
  normalizeHex,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToRgb,
} from '../../utils/colorConversion';

export interface PickedColor {
  name: string;
  hex: string;
}

interface ColorPickerPopoverProps {
  /** Pre-filled value when editing an existing colour */
  initial?: PickedColor | null;
  /** Normalised hex values already picked elsewhere, for the duplicate-colour warning */
  existingHexes?: string[];
  onApply: (color: PickedColor) => void;
  trigger: (open: () => void, isOpen: boolean) => React.ReactNode;
  title?: string;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const DEFAULT_HEX = '#561C08';
const PANEL_WIDTH = 288; // matches w-72
const GAP = 8;
const MARGIN = 12;
const MOBILE_BREAKPOINT = 640;

/** Anything inside a portaled colour-picker panel carries this attribute, so other
 * components' own "click outside closes me" handlers (e.g. a dropdown hosting the
 * picker as one of its entries) can tell a click inside the picker isn't "outside". */
export const COLOR_PICKER_PORTAL_ATTR = 'data-color-picker-portal';

interface FloatingState {
  mode: 'anchored' | 'sheet';
  style: React.CSSProperties;
}

const HIDDEN_STYLE: React.CSSProperties = { position: 'fixed', top: -9999, left: -9999, visibility: 'hidden' };

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  initial,
  existingHexes = [],
  onApply,
  trigger,
  title = 'Pick a colour',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const [floating, setFloating] = useState<FloatingState>({ mode: 'anchored', style: HIDDEN_STYLE });

  const startHex = (initial?.hex && normalizeHex(initial.hex)) || DEFAULT_HEX;

  // `hex` is the single lossless source of truth (RGB <-> HEX is exact, integer-for-integer).
  // `hue` only tracks the saturation panel's hue axis for achromatic colours (grey/black/white),
  // where hue can't be recovered from the colour itself — it's never used to derive `hex`.
  const [hex, setHex] = useState(startHex);
  const [hue, setHue] = useState(() => rgbToHsv(hexToRgb(startHex)).h);
  const [name, setName] = useState(initial?.name || '');
  const [hexText, setHexText] = useState(startHex);
  const [hexError, setHexError] = useState<string | null>(null);

  const rgb = useMemo(() => hexToRgb(hex), [hex]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const hsv = useMemo(() => rgbToHsv(rgb), [rgb]);
  // Use the derived hue whenever the colour actually has saturation; otherwise keep the
  // last hue the user picked so the panel/slider don't jump to red on black/white/grey.
  const displayHue = hsv.s === 0 ? hue : hsv.h;

  // Reset the draft every time the popover opens, so cancelling discards edits
  useEffect(() => {
    if (!isOpen) return;
    const openHex = (initial?.hex && normalizeHex(initial.hex)) || DEFAULT_HEX;
    setHex(openHex);
    setHue(rgbToHsv(hexToRgb(openHex)).h);
    setName(initial?.name || '');
    setHexText(openHex);
    setHexError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Keep the text field in sync whenever the canonical hex changes from any other control
  useEffect(() => {
    setHexText(hex);
    setHexError(null);
  }, [hex]);

  // Position the floating panel: anchored next to the trigger on desktop/tablet (flipping
  // above/below and clamping horizontally to stay inside the viewport), or as a bottom
  // sheet on narrow screens. Recomputed on open, resize, and scroll of any ancestor.
  useLayoutEffect(() => {
    if (!isOpen) return;

    const reposition = () => {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      if (isMobile) {
        setFloating({
          mode: 'sheet',
          style: {
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            maxHeight: '85vh',
            visibility: 'visible',
          },
        });
        return;
      }

      const triggerEl = triggerRef.current;
      const floatingEl = floatingRef.current;
      if (!triggerEl || !floatingEl) return;

      const triggerRect = triggerEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const fh = floatingEl.offsetHeight;

      const spaceBelow = vh - triggerRect.bottom - GAP - MARGIN;
      const spaceAbove = triggerRect.top - GAP - MARGIN;

      let top: number;
      let maxHeight: number;
      if (fh <= spaceBelow || spaceBelow >= spaceAbove) {
        top = triggerRect.bottom + GAP;
        maxHeight = Math.max(200, spaceBelow);
      } else {
        maxHeight = Math.max(200, spaceAbove);
        top = Math.max(MARGIN, triggerRect.top - GAP - Math.min(fh, maxHeight));
      }

      let left = triggerRect.left;
      if (left + PANEL_WIDTH > vw - MARGIN) left = vw - PANEL_WIDTH - MARGIN;
      if (left < MARGIN) left = MARGIN;

      setFloating({
        mode: 'anchored',
        style: { position: 'fixed', top, left, width: PANEL_WIDTH, maxHeight, visibility: 'visible' },
      });
    };

    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (floatingRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const commitHexText = (text: string) => {
    setHexText(text);
    const normalized = normalizeHex(text);
    if (!normalized) {
      setHexError('Enter a valid HEX colour, e.g. #FFFFFF');
      return;
    }
    setHex(normalized);
    setHue(rgbToHsv(hexToRgb(normalized)).h);
  };

  const updateRgbChannel = (channel: keyof RGB, value: number) => {
    const next = { ...rgb, [channel]: clamp(Math.round(value) || 0, 0, 255) };
    setHex(rgbToHex(next));
    setHue(rgbToHsv(next).h);
  };

  const updateHslChannel = (channel: keyof HSL, value: number) => {
    const max = channel === 'h' ? 360 : 100;
    const nextHsl: HSL = { ...hsl, [channel]: clamp(Math.round(value) || 0, 0, max) };
    const nextRgb = hslToRgb(nextHsl);
    setHex(rgbToHex(nextRgb));
    setHue(nextHsl.h);
  };

  const dragPanel = (e: React.PointerEvent) => {
    const rect = panelRef.current!.getBoundingClientRect();
    const update = (clientX: number, clientY: number) => {
      const x = clamp(clientX - rect.left, 0, rect.width);
      const y = clamp(clientY - rect.top, 0, rect.height);
      const s = (x / rect.width) * 100;
      const v = 100 - (y / rect.height) * 100;
      setHex(rgbToHex(hsvToRgb({ h: displayHue, s, v })));
    };
    update(e.clientX, e.clientY);
    const onMove = (ev: PointerEvent) => update(ev.clientX, ev.clientY);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const dragHue = (e: React.PointerEvent) => {
    const rect = hueRef.current!.getBoundingClientRect();
    const update = (clientX: number) => {
      const x = clamp(clientX - rect.left, 0, rect.width);
      const newHue = (x / rect.width) * 360;
      setHue(newHue);
      setHex(rgbToHex(hsvToRgb({ h: newHue, s: hsv.s, v: hsv.v })));
    };
    update(e.clientX);
    const onMove = (ev: PointerEvent) => update(ev.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const supportsEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;
  const useEyeDropper = async () => {
    try {
      const dropper = new (window as any).EyeDropper();
      const result = await dropper.open();
      const normalized = normalizeHex(result.sRGBHex);
      if (normalized) {
        setHex(normalized);
        setHue(rgbToHsv(hexToRgb(normalized)).h);
      }
    } catch {
      // user cancelled the eyedropper — ignore
    }
  };

  const normalizedExisting = existingHexes.map(h => (normalizeHex(h) || h).toUpperCase());
  const initialHexNormalized = initial?.hex ? normalizeHex(initial.hex) : null;
  const isDuplicate = normalizedExisting.includes(hex) && hex !== initialHexNormalized;

  const handleApply = () => {
    if (hexError) return;
    onApply({ name: name.trim(), hex });
    setIsOpen(false);
  };

  const panelBody = (
    <div
      ref={floatingRef}
      {...{ [COLOR_PICKER_PORTAL_ATTR]: 'true' }}
      style={{ ...floating.style, zIndex: 1000 }}
      className={`bg-white border border-stone-200 shadow-2xl p-3 space-y-3 animate-fadeIn overflow-y-auto overscroll-contain ${
        floating.mode === 'sheet' ? 'rounded-t-2xl' : 'rounded-xl'
      }`}
      role="dialog"
      aria-label={title}
    >
      {floating.mode === 'sheet' && (
        <div className="w-10 h-1 rounded-full bg-stone-300 mx-auto -mt-0.5 mb-1" aria-hidden="true" />
      )}

      {/* Saturation / brightness panel */}
      <div
        ref={panelRef}
        onPointerDown={dragPanel}
        role="slider"
        aria-label="Saturation and brightness"
        tabIndex={0}
        className="relative w-full h-32 rounded-lg cursor-crosshair touch-none select-none"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${displayHue}, 100%, 50%))`,
        }}
      >
        <span
          className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, background: hex }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        onPointerDown={dragHue}
        role="slider"
        aria-label="Hue"
        tabIndex={0}
        className="relative w-full h-3 rounded-full cursor-pointer touch-none select-none"
        style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
      >
        <span
          className="absolute top-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${(displayHue / 360) * 100}%`, background: `hsl(${displayHue},100%,50%)` }}
        />
      </div>

      {/* Preview + HEX input + eyedropper */}
      <div className="flex items-center gap-2">
        <span
          className="w-9 h-9 rounded-lg border border-stone-300 shadow-2xs shrink-0"
          style={{ background: hex }}
          title={`Preview: ${hex}`}
        />
        <input
          value={hexText}
          onChange={e => commitHexText(e.target.value)}
          placeholder="Enter HEX colour (e.g. #FFFFFF)"
          aria-label="HEX colour value"
          className={`flex-1 min-w-0 p-2 bg-white border rounded-lg text-xs font-mono focus:outline-none ${
            hexError ? 'border-red-400 focus:border-red-500' : 'border-stone-200 focus:border-stone-800'
          }`}
        />
        {supportsEyeDropper && (
          <button
            type="button"
            onClick={useEyeDropper}
            title="Pick colour from your screen"
            aria-label="Eyedropper: pick colour from screen"
            className="p-2 rounded-lg border border-stone-200 hover:border-stone-400 text-stone-600 hover:text-stone-900 transition-colors shrink-0"
          >
            <Pipette size={14} />
          </button>
        )}
      </div>
      {hexError && <p className="text-[10px] text-red-600 font-medium">{hexError}</p>}
      {isDuplicate && !hexError && (
        <p className="text-[10px] text-amber-600 font-medium">This colour is already in your list.</p>
      )}

      {/* RGB */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">RGB</p>
        <div className="grid grid-cols-3 gap-1.5">
          {(['r', 'g', 'b'] as const).map(channel => (
            <input
              key={channel}
              type="number"
              min={0}
              max={255}
              value={rgb[channel]}
              onChange={e => updateRgbChannel(channel, Number(e.target.value))}
              aria-label={`${channel.toUpperCase()} value`}
              className="w-full p-1.5 bg-white border border-stone-200 rounded-md text-[11px] font-mono text-center focus:outline-none focus:border-stone-800"
            />
          ))}
        </div>
      </div>

      {/* HSL */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">HSL</p>
        <div className="grid grid-cols-3 gap-1.5">
          {(['h', 's', 'l'] as const).map(channel => (
            <input
              key={channel}
              type="number"
              min={0}
              max={channel === 'h' ? 360 : 100}
              value={hsl[channel]}
              onChange={e => updateHslChannel(channel, Number(e.target.value))}
              aria-label={`${channel.toUpperCase()} value`}
              className="w-full p-1.5 bg-white border border-stone-200 rounded-md text-[11px] font-mono text-center focus:outline-none focus:border-stone-800"
            />
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">Colour name (optional)</p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Bottle Green, Rose Gold"
          aria-label="Colour name"
          className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-stone-800"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1 sticky bottom-0 bg-white">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-500 hover:bg-stone-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={!!hexError}
          className="px-3 py-1.5 rounded-lg bg-[#561C08] hover:bg-[#561C08]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors flex items-center gap-1"
        >
          <Check size={13} /> Apply
        </button>
      </div>
    </div>
  );

  return (
    <span ref={triggerRef} className="inline-block">
      {trigger(() => setIsOpen(true), isOpen)}

      {isOpen &&
        createPortal(
          <>
            {floating.mode === 'sheet' && (
              <div
                className="fixed inset-0 bg-stone-900/40 animate-fadeIn"
                style={{ zIndex: 999 }}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
              />
            )}
            {panelBody}
          </>,
          document.body,
        )}
    </span>
  );
};
