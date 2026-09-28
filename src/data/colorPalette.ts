// Named colours offered when creating product variants. The backend stores only the
// colour name (variant.attributes.color), so the storefront uses this map to draw swatches.
export const COLOR_PALETTE: { name: string; hex: string }[] = [
  { name: 'Black', hex: '#1C1B1A' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Ivory', hex: '#FFFFF0' },
  { name: 'Cream', hex: '#F3E9D2' },
  { name: 'Beige', hex: '#D9C9B4' },
  { name: 'Gold', hex: '#C9A24B' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Grey', hex: '#8A8A8A' },
  { name: 'Red', hex: '#B3202A' },
  { name: 'Maroon', hex: '#6B1E23' },
  { name: 'Wine', hex: '#5A1A2B' },
  { name: 'Pink', hex: '#E8A0B4' },
  { name: 'Peach', hex: '#F4B79A' },
  { name: 'Orange', hex: '#E07B39' },
  { name: 'Yellow', hex: '#E8C547' },
  { name: 'Mustard', hex: '#C9A227' },
  { name: 'Green', hex: '#2F6B3F' },
  { name: 'Mint', hex: '#A8D5BA' },
  { name: 'Olive', hex: '#6B6B2F' },
  { name: 'Teal', hex: '#1F6F6B' },
  { name: 'Sky Blue', hex: '#8EC5E8' },
  { name: 'Blue', hex: '#2B4C9B' },
  { name: 'Navy', hex: '#151F30' },
  { name: 'Lavender', hex: '#B9A6D9' },
  { name: 'Purple', hex: '#5B2A6E' },
  { name: 'Brown', hex: '#561C08' },
];

export const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];

/** Hex for a palette colour name (case-insensitive), or undefined for custom names */
export const colorHex = (name?: string): string | undefined =>
  name ? COLOR_PALETTE.find(c => c.name.toLowerCase() === name.trim().toLowerCase())?.hex : undefined;
