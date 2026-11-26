import { normalizeHex } from '../utils/colorConversion';

export const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];

// Named colours offered before the advanced colour picker existed. No longer shown as
// suggestions anywhere — kept only so older products/orders that stored one of these
// bare names (no hex attached) still resolve a swatch colour.
const LEGACY_COLOR_HEX: Record<string, string> = {
  black: '#1C1B1A', white: '#FFFFFF', ivory: '#FFFFF0', cream: '#F3E9D2', beige: '#D9C9B4',
  gold: '#C9A24B', silver: '#C0C0C0', grey: '#8A8A8A', red: '#B3202A', maroon: '#6B1E23',
  wine: '#5A1A2B', pink: '#E8A0B4', peach: '#F4B79A', orange: '#E07B39', yellow: '#E8C547',
  mustard: '#C9A227', green: '#2F6B3F', mint: '#A8D5BA', olive: '#6B6B2F', teal: '#1F6F6B',
  'sky blue': '#8EC5E8', blue: '#2B4C9B', navy: '#151F30', lavender: '#B9A6D9', purple: '#5B2A6E',
  brown: '#561C08', 'rose gold': '#B76E79', 'rani pink': '#C71585', 'bottle green': '#004225',
  'emerald green': '#046307', 'pista green': '#93C572', rust: '#B7410E', coral: '#FF6F61',
  turquoise: '#40E0D0', indigo: '#2E3192', champagne: '#F7E7CE', mauve: '#915F6D', copper: '#B87333',
};

export interface DecodedColor {
  name: string;
  hex?: string;
}

// A variant colour is stored as a single string on the backend (`attributes.color`).
// To carry an exact custom HEX without a backend/schema change, the hex is encoded as a
// trailing "#RRGGBB" on that string, e.g. "Bottle Green #0F5132". Plain names (no hex, or
// legacy data saved before this feature existed) decode to just { name }.
const HEX_SUFFIX_RE = /\s#([0-9A-Fa-f]{6})$/;

export const encodeColor = (name: string, hex?: string): string => {
  const trimmedName = (name || '').trim();
  const normalized = hex ? normalizeHex(hex) : null;
  if (!normalized) return trimmedName;
  return trimmedName ? `${trimmedName} ${normalized}` : normalized;
};

export const decodeColor = (value?: string): DecodedColor => {
  const trimmed = (value || '').trim();
  const match = trimmed.match(HEX_SUFFIX_RE);
  if (match) {
    return { name: trimmed.slice(0, match.index).trim(), hex: `#${match[1].toUpperCase()}` };
  }
  return { name: trimmed, hex: undefined };
};

/** Hex to draw a swatch for a variant colour string (encoded or legacy plain name), or undefined if unknown */
export const colorHex = (value?: string): string | undefined => {
  if (!value) return undefined;
  const { name, hex } = decodeColor(value);
  return hex || LEGACY_COLOR_HEX[name.toLowerCase()];
};
