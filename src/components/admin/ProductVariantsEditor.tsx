import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Check,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Upload,
  Image as ImageIcon,
  Copy,
  Star,
  Loader2,
  Sparkles,
  Search,
  X,
  Pencil,
  Palette,
} from 'lucide-react';
import { SIZE_PRESETS, colorHex, encodeColor, decodeColor } from '../../data/colorPalette';
import { fileToResizedDataUrl } from './ProductImagesEditor';
import { ColorPickerPopover, COLOR_PICKER_PORTAL_ATTR } from './ColorPicker';
import type { PickedColor } from './ColorPicker';

export interface VariantRow {
  /** Present for variants that already exist on the backend */
  id?: string;
  sku: string;
  color: string;
  size: string;
  /** Optional per-variant prices; blank means "same as the product" */
  mrp?: number;
  price?: number;
  images: { url: string; isPrimary?: boolean }[];
  status?: string;
}

export const normalizeVariantImages = (images: VariantRow['images']): VariantRow['images'] => {
  if (images.length === 0) return [];
  const primaryIndex = images.findIndex(image => image.isPrimary);
  const selectedPrimaryIndex = primaryIndex === -1 ? 0 : primaryIndex;
  return images.map((image, index) => ({ ...image, isPrimary: index === selectedPrimaryIndex }));
};

interface ProductVariantsEditorProps {
  variants: VariantRow[];
  onChange: (variants: VariantRow[]) => void;
  productSku: string;
  isLoading?: boolean;
  /** The product's own selling price; variants with a blank price use it */
  productPrice?: number;
  /** Product's own images (can be copied to variants) */
  productImages?: { url: string; isPrimary?: boolean }[];
}

const slug = (v: string) => v.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');

/** e.g. TES44-MAROON-XL */
export const buildVariantSku = (productSku: string, color: string, size: string) =>
  [slug(productSku) || 'SKU', slug(decodeColor(color).name), slug(size)].filter(Boolean).join('-');

const comboKey = (color: string, size: string) => `${color.trim().toLowerCase()}|${size.trim().toLowerCase()}`;

const Swatch: React.FC<{ name: string; size?: number }> = ({ name, size = 16 }) => {
  const hex = colorHex(name);
  return (
    <span
      className="inline-block rounded-full border border-stone-300 shrink-0 shadow-2xs"
      style={{
        width: size,
        height: size,
        background: hex || 'repeating-linear-gradient(45deg,#e7e5e4 0 3px,#fafaf9 3px 6px)',
      }}
    />
  );
};

// ────────────────────────────────────────────────────────────
// SEARCHABLE COLOUR SELECTOR (Searchable dropdown + Custom Add)
// ────────────────────────────────────────────────────────────
interface SearchableColorSelectProps {
  value: string;
  onChange: (color: string) => void;
  customColorsInUse?: string[];
  placeholder?: string;
}

const SearchableColorSelect: React.FC<SearchableColorSelectProps> = ({
  value,
  onChange,
  customColorsInUse = [],
  placeholder = 'No colour',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // A click inside the (portaled) advanced colour picker isn't "outside" this dropdown
      if (target instanceof Element && target.closest(`[${COLOR_PICKER_PORTAL_ATTR}]`)) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus input automatically when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  const trimmedQuery = query.trim();

  const hasExactMatch = useMemo(() => {
    if (!trimmedQuery) return false;
    const q = trimmedQuery.toLowerCase();
    return customColorsInUse.some(name => decodeColor(name).name.toLowerCase() === q);
  }, [trimmedQuery, customColorsInUse]);

  // Filter colours already in use on other variants
  const filteredCustomColors = useMemo(() => {
    if (!trimmedQuery) return customColorsInUse;
    const q = trimmedQuery.toLowerCase();
    return customColorsInUse.filter(name => decodeColor(name).name.toLowerCase().includes(q));
  }, [trimmedQuery, customColorsInUse]);

  const handleSelect = (colorName: string) => {
    onChange(colorName);
    setIsOpen(false);
    setQuery('');
  };

  const decodedValue = decodeColor(value);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-1.5 p-2 bg-white border border-stone-200 rounded-lg text-xs hover:border-stone-400 focus:outline-none focus:border-stone-800 text-left transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <Swatch name={value} size={15} />
          <span className={`truncate ${value ? 'text-stone-900 font-medium' : 'text-stone-400'}`}>
            {decodedValue.name || value || placeholder}
          </span>
        </div>
        <ChevronDown size={13} className={`text-stone-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-white border border-stone-200 rounded-xl shadow-2xl flex flex-col animate-fadeIn">
          {/* Search Bar */}
          <div className="p-2 border-b border-stone-100 bg-stone-50/90 sticky top-0 z-10">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search colour or type new..."
                className="w-full pl-7 pr-7 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-stone-800"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredCustomColors.length === 1) {
                      handleSelect(filteredCustomColors[0]);
                    } else if (trimmedQuery) {
                      handleSelect(trimmedQuery);
                    }
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List Options */}
          <div className="overflow-y-auto max-h-60 p-1 divide-y divide-stone-50">
            {/* Custom colour prompt when query doesn't match an exact preset */}
            {trimmedQuery && !hasExactMatch && (
              <button
                type="button"
                onClick={() => handleSelect(trimmedQuery)}
                className="w-full flex items-center gap-2 p-2 rounded-lg bg-amber-50 hover:bg-amber-100/90 text-amber-900 text-xs font-semibold text-left transition-colors mb-1"
              >
                <span className="w-5 h-5 rounded-full border border-dashed border-amber-500 bg-white flex items-center justify-center shrink-0 text-amber-700">
                  <Plus size={11} />
                </span>
                <div className="min-w-0 truncate">
                  <span className="text-[10px] uppercase tracking-wider block text-amber-700 font-bold">Use Custom Colour</span>
                  <span className="text-xs font-bold text-stone-900 truncate block">"{trimmedQuery}"</span>
                </div>
              </button>
            )}

            {/* "No colour" option */}
            {!trimmedQuery && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs text-left transition-colors ${
                  !value ? 'bg-stone-100 font-bold text-stone-900' : 'hover:bg-stone-50 text-stone-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border border-stone-200 bg-stone-100 flex items-center justify-center text-[10px] text-stone-400 font-mono">
                    Ø
                  </span>
                  <span>No colour</span>
                </div>
                {!value && <Check size={13} className="text-stone-900" />}
              </button>
            )}

            {/* Colours already in use on other variants */}
            {filteredCustomColors.map(name => {
              const isSelected = value.toLowerCase() === name.toLowerCase();
              const decoded = decodeColor(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelect(name)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs text-left transition-colors ${
                    isSelected ? 'bg-stone-100 font-bold text-stone-900' : 'hover:bg-stone-50 text-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Swatch name={name} size={16} />
                    <span className="truncate">{decoded.name || decoded.hex}</span>
                    {decoded.hex && <span className="text-[9px] text-stone-400 font-mono shrink-0">{decoded.hex}</span>}
                  </div>
                  {isSelected && <Check size={13} className="text-stone-900 shrink-0" />}
                </button>
              );
            })}

            {filteredCustomColors.length === 0 && !trimmedQuery && (
              <div className="p-3 text-center text-xs text-stone-400">
                No colours added yet
              </div>
            )}

            {/* Advanced visual picker — pick any colour, with HEX/RGB/HSL and eyedropper */}
            <ColorPickerPopover
              initial={value ? (decodedValue as PickedColor) : null}
              onApply={({ name, hex }) => handleSelect(encodeColor(name || decodedValue.name || 'Custom Colour', hex))}
              trigger={open => (
                <button
                  type="button"
                  onClick={open}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-stone-50 text-xs text-left text-stone-700 font-semibold transition-colors mt-1"
                >
                  <span className="w-5 h-5 rounded-full border border-dashed border-stone-400 bg-white flex items-center justify-center shrink-0 text-stone-500">
                    <Palette size={11} />
                  </span>
                  Pick any colour (visual picker / HEX)
                </button>
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const ProductVariantsEditor: React.FC<ProductVariantsEditorProps> = ({
  variants,
  onChange,
  productSku,
  isLoading,
  productPrice,
  productImages = [],
}) => {
  // Quick builder selections
  const [pickedColors, setPickedColors] = useState<string[]>([]);
  const [pickedSizes, setPickedSizes] = useState<string[]>([]);
  const [customSize, setCustomSize] = useState('');
  const [openImagesFor, setOpenImagesFor] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedColor, setDraggedColor] = useState<string | null>(null);

  const existingKeys = new Set(variants.map(v => comboKey(v.color, v.size)));

  const toggle = (list: string[], value: string) =>
    list.some(v => v.toLowerCase() === value.toLowerCase())
      ? list.filter(v => v.toLowerCase() !== value.toLowerCase())
      : [...list, value];

  // Normalised hex values already picked, so the colour picker can warn about duplicates
  const pickedColorHexes = useMemo(
    () => pickedColors.map(c => decodeColor(c).hex).filter((h): h is string => !!h),
    [pickedColors],
  );

  const addPickedColor = ({ name, hex }: PickedColor) => {
    const encoded = encodeColor(name || 'Custom Colour', hex);
    const isDuplicateHex = hex && pickedColors.some(c => decodeColor(c).hex?.toUpperCase() === hex.toUpperCase());
    if (isDuplicateHex) return;
    setPickedColors([...pickedColors, encoded]);
  };

  const editPickedColor = (oldValue: string, { name, hex }: PickedColor) => {
    const encoded = encodeColor(name || decodeColor(oldValue).name || 'Custom Colour', hex);
    setPickedColors(pickedColors.map(c => (c === oldValue ? encoded : c)));
  };

  const removePickedColor = (value: string) => setPickedColors(pickedColors.filter(c => c !== value));

  const addCustomSize = () => {
    const name = customSize.trim();
    if (!name) return;
    if (!pickedSizes.some(s => s.toLowerCase() === name.toLowerCase())) setPickedSizes([...pickedSizes, name]);
    setCustomSize('');
  };

  // Every colour × size pair (a missing side means "any"), minus ones already added
  const colorsForCombos = pickedColors.length ? pickedColors : [''];
  const sizesForCombos = pickedSizes.length ? pickedSizes : [''];
  const newCombos = colorsForCombos
    .flatMap(color => sizesForCombos.map(size => ({ color, size })))
    .filter(c => (c.color || c.size) && !existingKeys.has(comboKey(c.color, c.size)));

  const addCombos = () => {
    if (newCombos.length === 0) return;
    onChange([
      ...variants,
      ...newCombos.map(c => {
        // Inherit photos if another variant of the same colour already has photos
        const existingColorVariant = variants.find(v => v.color && v.color.toLowerCase() === c.color.toLowerCase() && v.images?.length);
        return {
          sku: buildVariantSku(productSku, c.color, c.size),
          color: c.color,
          size: c.size,
          images: existingColorVariant?.images ? [...existingColorVariant.images] : [],
        };
      }),
    ]);
    setPickedColors([]);
    setPickedSizes([]);
  };

  const updateRow = (index: number, patch: Partial<VariantRow>) => {
    const next = [...variants];
    const row = { ...next[index], ...patch };
    if (patch.images) row.images = normalizeVariantImages(patch.images);
    // Keep an auto-generated SKU in sync when colour / size change
    const prev = next[index];
    if (('color' in patch || 'size' in patch) && (!prev.sku || prev.sku === buildVariantSku(productSku, prev.color, prev.size))) {
      row.sku = buildVariantSku(productSku, row.color, row.size);
    }
    next[index] = row;
    onChange(next);
  };

  const removeRow = (index: number) => onChange(variants.filter((_, i) => i !== index));

  const addBlankRow = () => onChange([...variants, { sku: '', color: '', size: '', images: [] }]);

  // Process files with canvas resizing
  const processFiles = async (fileList: FileList | File[]): Promise<{ url: string; isPrimary?: boolean }[]> => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (!files.length) return [];
    setIsProcessing(true);
    try {
      const urls = await Promise.all(files.map(fileToResizedDataUrl));
      return urls.map((url, i) => ({ url, isPrimary: i === 0 }));
    } finally {
      setIsProcessing(false);
    }
  };

  // Upload photos for an individual row
  const handleRowImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const newImages = await processFiles(e.target.files);
    e.target.value = '';
    if (!newImages.length) return;
    const existing = variants[index].images || [];
    updateRow(index, { images: [...existing, ...newImages] });
  };

  // Apply photos to all variants of a given colour
  const applyImagesToColor = (colorName: string, images: { url: string; isPrimary?: boolean }[]) => {
    const normalized = colorName.trim().toLowerCase();
    const next = variants.map(v => {
      const vColor = (v.color || '').trim().toLowerCase();
      if (vColor === normalized) {
        return { ...v, images: normalizeVariantImages(images) };
      }
      return v;
    });
    onChange(next);
  };

  // Handle uploading photos directly for a colour group
  const handleColorImageUpload = async (colorName: string, fileList: FileList | File[]) => {
    const newImages = await processFiles(fileList);
    if (!newImages.length) return;
    // Find current images for this color
    const existing = variants.find(v => (v.color || '').trim().toLowerCase() === colorName.trim().toLowerCase() && v.images?.length)?.images || [];
    applyImagesToColor(colorName, [...existing, ...newImages]);
  };

  // Copy product's main/gallery image to all variants of a colour
  const copyProductImagesToColor = (colorName: string) => {
    if (!productImages.length) return;
    applyImagesToColor(colorName, productImages);
  };

  // Apply product main image to all empty variants
  const applyProductImageToEmptyVariants = () => {
    if (!productImages.length) return;
    const next = variants.map(v => {
      if (!v.images || v.images.length === 0) {
        return { ...v, images: normalizeVariantImages([productImages[0]]) };
      }
      return v;
    });
    onChange(next);
  };

  // Distinct colour groups from current variants
  const colorGroups = useMemo(() => {
    const map = new Map<
      string,
      { color: string; sizes: string[]; count: number; images: { url: string; isPrimary?: boolean }[] }
    >();

    variants.forEach(v => {
      const colorKey = v.color.trim() || 'No colour';
      const existing = map.get(colorKey) || {
        color: v.color.trim(),
        sizes: [],
        count: 0,
        images: [],
      };
      existing.count += 1;
      if (v.size && !existing.sizes.includes(v.size)) {
        existing.sizes.push(v.size);
      }
      if (v.images && v.images.length > 0 && existing.images.length === 0) {
        existing.images = v.images;
      }
      map.set(colorKey, existing);
    });

    return Array.from(map.values());
  }, [variants]);

  // Distinct colours already used on variants, offered for reuse in the per-row picker
  const customColorsInUse = useMemo(
    () => Array.from(new Set(variants.map(v => v.color.trim()).filter(Boolean))),
    [variants],
  );

  // All hexes currently in use (variants + pending quick-builder picks), for duplicate warnings
  const allHexesInUse = useMemo(() => {
    const fromVariants = variants.map(v => decodeColor(v.color).hex).filter((h): h is string => !!h);
    return Array.from(new Set([...fromVariants, ...pickedColorHexes]));
  }, [variants, pickedColorHexes]);

  // Rename every variant sharing a colour (used by the "Edit colour" action on a colour group)
  const renameColorGroup = (oldColor: string, newColor: string) => {
    const oldKey = oldColor.trim().toLowerCase();
    const next = variants.map(v => {
      if ((v.color || '').trim().toLowerCase() !== oldKey) return v;
      const hadAutoSku = v.sku === buildVariantSku(productSku, v.color, v.size);
      return { ...v, color: newColor, sku: hadAutoSku ? buildVariantSku(productSku, newColor, v.size) : v.sku };
    });
    onChange(next);
  };

  // Remove a colour and every variant that uses it
  const removeColorGroup = (color: string) => {
    const key = color.trim().toLowerCase();
    if (!window.confirm(`Remove "${decodeColor(color).name || color}" and all its variants?`)) return;
    onChange(variants.filter(v => (v.color || '').trim().toLowerCase() !== key));
  };

  const duplicateKeys = variants
    .map(v => comboKey(v.color, v.size))
    .filter((k, i, all) => k !== '|' && all.indexOf(k) !== i);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="block text-xs uppercase font-bold text-stone-700 tracking-wider">
            Colours, Sizes & Variant Photos
          </label>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Add different colours and sizes for this product. You can search or type any custom colour, and upload photos <strong>per colour</strong> or per variant.
          </p>
        </div>

        {productImages.length > 0 && variants.some(v => !v.images?.length) && (
          <button
            type="button"
            onClick={applyProductImageToEmptyVariants}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-[11px] font-semibold text-stone-700 shadow-2xs transition-colors shrink-0"
            title="Use product image for any variants that have no photos"
          >
            <Sparkles size={13} className="text-amber-600" />
            Apply Product Image to Empty Variants
          </button>
        )}
      </div>

      {/* Variants priced differently alert */}
      {variants.some(v => v.price !== undefined && v.price !== productPrice) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-[11px] text-amber-900">
          <span>
            {variants.filter(v => v.price !== undefined && v.price !== productPrice).length} variant(s) have their own price
            (e.g. ₹{variants.find(v => v.price !== undefined && v.price !== productPrice)?.price?.toLocaleString('en-IN')}),
            so customers pay that instead of the product price
            {productPrice !== undefined && <> (₹{productPrice.toLocaleString('en-IN')})</>}.
          </span>
          {productPrice !== undefined && (
            <button
              type="button"
              onClick={() => onChange(variants.map(v => ({ ...v, price: undefined, mrp: undefined })))}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              Use ₹{productPrice.toLocaleString('en-IN')} for all variants
            </button>
          )}
        </div>
      )}

      {/* Quick builder */}
      <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 space-y-3.5">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-600">1. Pick colours</p>
            {pickedColors.length > 0 && (
              <span className="text-[10px] text-stone-500 font-medium">{pickedColors.length} selected</span>
            )}
          </div>

          {pickedColors.length === 0 ? (
            <div className="p-3 border border-dashed border-stone-300 rounded-lg text-center bg-white/60">
              <p className="text-[11px] text-stone-400">
                No colours added yet. Pick any colour visually or enter its HEX code below.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {pickedColors.map(c => {
                const decoded = decodeColor(c);
                return (
                  <div
                    key={c}
                    className="flex items-center gap-1.5 pl-1.5 pr-1.5 py-1 rounded-full border border-stone-200 bg-white text-[11px] text-stone-800 shadow-2xs"
                  >
                    <Swatch name={c} size={16} />
                    <span className="font-semibold max-w-[110px] truncate" title={decoded.name}>
                      {decoded.name || decoded.hex}
                    </span>
                    {decoded.hex && <span className="text-[9px] text-stone-400 font-mono">{decoded.hex}</span>}
                    <ColorPickerPopover
                      initial={decoded as PickedColor}
                      existingHexes={pickedColorHexes.filter(h => h !== decoded.hex)}
                      onApply={color => editPickedColor(c, color)}
                      trigger={open => (
                        <button type="button" onClick={open} className="p-0.5 text-stone-400 hover:text-stone-800" title="Edit colour">
                          <Pencil size={11} />
                        </button>
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => removePickedColor(c)}
                      className="p-0.5 text-stone-400 hover:text-red-600"
                      title="Remove colour"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <ColorPickerPopover
            existingHexes={pickedColorHexes}
            onApply={addPickedColor}
            trigger={open => (
              <button
                type="button"
                onClick={open}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-stone-300 hover:border-stone-600 bg-white text-xs font-semibold text-stone-700 transition-colors"
              >
                <Plus size={13} /> Add Colour
              </button>
            )}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-600">2. Pick sizes</p>
            {pickedSizes.length > 0 && (
              <span className="text-[10px] text-stone-500 font-medium">
                {pickedSizes.length} selected ({pickedSizes.join(', ')})
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...SIZE_PRESETS, ...pickedSizes.filter(s => !SIZE_PRESETS.some(p => p.toLowerCase() === s.toLowerCase()))].map(s => {
              const active = pickedSizes.some(p => p.toLowerCase() === s.toLowerCase());
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPickedSizes(toggle(pickedSizes, s))}
                  className={`min-w-[42px] px-3 py-1 rounded-lg border text-xs font-semibold transition-all ${
                    active ? 'bg-[#561C08] border-[#561C08] text-white shadow-xs' : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              value={customSize}
              onChange={e => setCustomSize(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); } }}
              placeholder="Other size, e.g. 38, 40, 2-3Y, Plus Size"
              className="flex-1 p-2 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-stone-800"
            />
            <button type="button" onClick={addCustomSize} className="px-3 rounded-lg bg-stone-200 hover:bg-stone-300 text-xs font-semibold text-stone-700">
              Add Size
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={addCombos}
          disabled={newCombos.length === 0}
          className="w-full py-2.5 rounded-lg bg-[#561C08] hover:bg-[#561C08]/90 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
        >
          <Plus size={14} />
          {newCombos.length === 0
            ? 'Pick colours and/or sizes above'
            : `3. Generate & Add ${newCombos.length} variant${newCombos.length > 1 ? 's' : ''}`}
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* USER-FRIENDLY COLOR IMAGE UPLOAD SECTION */}
      {/* ──────────────────────────────────────────────────────────── */}
      {variants.length > 0 && colorGroups.some(g => g.color) && (
        <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
                <ImageIcon size={14} />
              </span>
              <div>
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Upload Photos by Colour
                </h4>
                <p className="text-[11px] text-stone-500">
                  Upload photos once for a colour — it automatically applies to all sizes (e.g. S, M, L, XL) of that colour.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {colorGroups.map(group => {
              const groupKey = group.color || 'No colour';
              const decodedGroup = decodeColor(group.color);
              const colorLabel = decodedGroup.name || groupKey;
              const fileInputId = `color-upload-${groupKey.replace(/[^a-zA-Z0-9]/g, '-')}`;
              const isOver = draggedColor === groupKey;

              return (
                <div
                  key={groupKey}
                  onDragOver={e => { e.preventDefault(); setDraggedColor(groupKey); }}
                  onDragLeave={() => setDraggedColor(null)}
                  onDrop={e => {
                    e.preventDefault();
                    setDraggedColor(null);
                    if (e.dataTransfer.files?.length) {
                      handleColorImageUpload(group.color, e.dataTransfer.files);
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all ${
                    isOver
                      ? 'border-stone-900 bg-stone-50 ring-2 ring-stone-900/10'
                      : 'border-stone-200 bg-stone-50/50 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Swatch name={group.color} size={18} />
                      <span className="font-bold text-xs text-stone-900 truncate">{colorLabel}</span>
                      {decodedGroup.hex && (
                        <span className="text-[9px] text-stone-400 font-mono shrink-0">{decodedGroup.hex}</span>
                      )}
                      <span className="text-[10px] text-stone-500 bg-stone-200/70 px-2 py-0.5 rounded-full font-medium shrink-0">
                        {group.count} size{group.count > 1 ? 's' : ''} ({group.sizes.filter(Boolean).join(', ') || 'Standard'})
                      </span>
                      {group.color && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <ColorPickerPopover
                            initial={decodedGroup as PickedColor}
                            existingHexes={allHexesInUse.filter(h => h !== decodedGroup.hex)}
                            onApply={color => renameColorGroup(group.color, encodeColor(color.name, color.hex))}
                            trigger={open => (
                              <button type="button" onClick={open} className="p-1 text-stone-400 hover:text-stone-800" title="Edit this colour">
                                <Pencil size={11} />
                              </button>
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => removeColorGroup(group.color)}
                            className="p-1 text-stone-400 hover:text-red-600"
                            title="Remove this colour and its variants"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>

                    {productImages.length > 0 && group.images.length === 0 && (
                      <button
                        type="button"
                        onClick={() => copyProductImagesToColor(group.color)}
                        className="text-[10px] text-stone-500 hover:text-stone-900 font-semibold inline-flex items-center gap-1"
                        title="Copy product's main gallery images to this colour"
                      >
                        <Copy size={11} /> Copy product photo
                      </button>
                    )}
                  </div>

                  {/* Thumbnail gallery */}
                  <div className="flex flex-wrap items-center gap-2 min-h-[52px]">
                    {group.images && group.images.length > 0 ? (
                      group.images.map((img, i) => (
                        <div key={i} className="relative group/thumb w-12 h-14 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                          <img src={img.url} alt={`${colorLabel} preview`} className="w-full h-full object-cover" />
                          {i === 0 && (
                            <span className="absolute bottom-0.5 left-0.5 bg-stone-900/80 text-white text-[8px] font-bold px-1 rounded">
                              Main
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const remaining = group.images.filter((_, idx) => idx !== i);
                              applyImagesToColor(group.color, remaining);
                            }}
                            className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                            title="Remove photo from this colour"
                          >
                            <Trash2 size={9} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] text-stone-400 italic py-1">
                        No photos yet for {colorLabel}.
                      </div>
                    )}

                    {/* Hidden input for this colour */}
                    <input
                      id={fileInputId}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => {
                        if (e.target.files) handleColorImageUpload(group.color, e.target.files);
                        e.target.value = '';
                      }}
                    />

                    {/* Upload button / Drop target */}
                    <label
                      htmlFor={fileInputId}
                      className="h-14 px-3 rounded-lg border border-dashed border-stone-300 hover:border-stone-600 bg-white hover:bg-stone-50 cursor-pointer flex items-center justify-center gap-1.5 text-stone-600 hover:text-stone-900 transition-colors text-[11px] font-semibold shrink-0"
                    >
                      {isProcessing ? (
                        <Loader2 size={13} className="animate-spin text-stone-500" />
                      ) : (
                        <Upload size={13} />
                      )}
                      <span>{group.images.length ? '+ Add more' : `Upload ${colorLabel} photos`}</span>
                    </label>
                  </div>

                  {group.images.length > 0 && (
                    <div className="flex items-center justify-between text-[10px] text-stone-400 mt-2 pt-1.5 border-t border-stone-200/50">
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <Check size={11} /> Applied to all {group.count} {colorLabel} variants
                      </span>
                      <button
                        type="button"
                        onClick={() => applyImagesToColor(group.color, [])}
                        className="text-stone-400 hover:text-red-500 transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* INDIVIDUAL VARIANT ROWS TABLE */}
      {/* ──────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="p-6 text-center text-stone-400 text-xs">
          <Loader2 size={16} className="animate-spin mx-auto mb-2 text-stone-600" />
          Loading variants…
        </div>
      ) : variants.length > 0 ? (
        <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 bg-white shadow-2xs">
          <div className="hidden sm:grid grid-cols-[54px_1.3fr_0.9fr_1.3fr_0.8fr_auto] gap-2 px-3 py-2 bg-stone-50 text-[10px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200">
            <span>Photo</span>
            <span>Colour (Searchable)</span>
            <span>Size</span>
            <span>SKU</span>
            <span>Price</span>
            <span className="text-right">Actions</span>
          </div>

          {variants.map((v, idx) => {
            const isDuplicate = duplicateKeys.includes(comboKey(v.color, v.size));
            const primaryImg = v.images?.find(img => img.isPrimary)?.url || v.images?.[0]?.url;
            const isOpen = openImagesFor === idx;

            return (
              <div key={v.id || idx} className={`px-3 py-2.5 transition-colors ${isOpen ? 'bg-stone-50/40' : ''}`}>
                <div className="grid grid-cols-2 sm:grid-cols-[54px_1.3fr_0.9fr_1.3fr_0.8fr_auto] gap-2 items-center">
                  {/* Photo thumbnail */}
                  <div className="col-span-2 sm:col-span-1 flex items-center">
                    {primaryImg ? (
                      <button
                        type="button"
                        onClick={() => setOpenImagesFor(isOpen ? null : idx)}
                        className="relative w-10 h-10 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 hover:ring-2 hover:ring-stone-800 transition-all shrink-0 group"
                        title="Click to view or edit photos for this variant"
                      >
                        <img src={primaryImg} alt={v.color || 'variant'} className="w-full h-full object-cover" />
                        {v.images.length > 1 && (
                          <span className="absolute bottom-0 right-0 bg-stone-900/90 text-white text-[8px] font-bold px-1 rounded-tl">
                            +{v.images.length - 1}
                          </span>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpenImagesFor(isOpen ? null : idx)}
                        className="w-10 h-10 rounded-lg border border-dashed border-stone-300 hover:border-stone-600 bg-stone-50 flex flex-col items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
                        title="Add photo for this variant"
                      >
                        <ImageIcon size={14} />
                        <span className="text-[8px] font-bold">+Pic</span>
                      </button>
                    )}
                  </div>

                  {/* Searchable Colour dropdown */}
                  <div className="flex items-center">
                    <SearchableColorSelect
                      value={v.color}
                      onChange={color => updateRow(idx, { color })}
                      customColorsInUse={customColorsInUse}
                    />
                  </div>

                  {/* Size dropdown */}
                  <div>
                    <select
                      value={v.size}
                      onChange={e => updateRow(idx, { size: e.target.value })}
                      className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-stone-800"
                    >
                      <option value="">No size</option>
                      {SIZE_PRESETS.map(s => <option key={s} value={s}>{s}</option>)}
                      {v.size && !SIZE_PRESETS.includes(v.size) && <option value={v.size}>{v.size}</option>}
                    </select>
                  </div>

                  {/* SKU input */}
                  <div>
                    <input
                      value={v.sku}
                      onChange={e => updateRow(idx, { sku: e.target.value })}
                      placeholder={buildVariantSku(productSku, v.color, v.size)}
                      className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-mono focus:outline-none focus:border-stone-800"
                    />
                  </div>

                  {/* Price input */}
                  <div>
                    <input
                      type="number"
                      min={0}
                      value={v.price ?? ''}
                      onChange={e => updateRow(idx, { price: e.target.value === '' ? undefined : Number(e.target.value) })}
                      placeholder="Same"
                      title="Leave blank to use product selling price"
                      className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-mono focus:outline-none focus:border-stone-800"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      type="button"
                      onClick={() => setOpenImagesFor(isOpen ? null : idx)}
                      className={`p-1.5 rounded-lg flex items-center gap-1 text-xs transition-colors ${
                        v.images?.length > 0
                          ? 'text-stone-800 hover:bg-stone-100 font-semibold'
                          : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
                      }`}
                      title="Manage photos for this variant"
                    >
                      <ImageIcon size={14} />
                      <span className="text-[10px] font-mono">{v.images?.length || 0}</span>
                      {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove variant"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isDuplicate && (
                  <p className="text-[10px] text-rose-600 font-medium mt-1">
                    ⚠️ This colour and size combination is listed more than once.
                  </p>
                )}

                {/* Expanded photo manager for this variant */}
                {isOpen && (
                  <div className="mt-2.5 p-3 rounded-lg border border-stone-200 bg-white space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-stone-800">
                        <span>Photos for:</span>
                        <Swatch name={v.color} size={14} />
                        <span>{decodeColor(v.color).name || 'No colour'} / {v.size || 'No size'}</span>
                        <span className="text-[10px] text-stone-400 font-normal font-mono">({v.sku})</span>
                      </div>

                      {v.color && v.images?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => applyImagesToColor(v.color, v.images)}
                          className="text-[11px] font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
                          title={`Apply these ${v.images.length} photo(s) to all other ${decodeColor(v.color).name} variants`}
                        >
                          <Copy size={11} />
                          Apply photos to all {decodeColor(v.color).name} sizes
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {v.images?.map((img, i) => (
                        <div key={i} className="relative group w-14 h-16 rounded-lg overflow-hidden border border-stone-300 bg-stone-100 shrink-0">
                          <img src={img.url} alt="variant" className="w-full h-full object-cover" />
                          {i === 0 ? (
                            <span className="absolute bottom-0.5 left-0.5 bg-stone-900 text-white text-[8px] font-bold px-1 rounded flex items-center gap-0.5">
                              <Star size={8} className="fill-current" /> Main
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...v.images];
                                const [picked] = next.splice(i, 1);
                                updateRow(idx, { images: [picked, ...next] });
                              }}
                              className="absolute bottom-0.5 left-0.5 bg-black/70 hover:bg-black text-white text-[8px] font-semibold px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Make main photo"
                            >
                              Set Main
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => updateRow(idx, { images: v.images.filter((_, j) => j !== i) })}
                            className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                            title="Delete photo"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}

                      {/* Upload more for this row */}
                      <label className="w-14 h-16 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 hover:border-stone-800 text-stone-400 hover:text-stone-700 bg-stone-50 cursor-pointer transition-colors shrink-0">
                        {isProcessing ? (
                          <Loader2 size={16} className="animate-spin text-stone-600" />
                        ) : (
                          <>
                            <Upload size={14} />
                            <span className="text-[9px] font-bold mt-0.5">+Upload</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={e => handleRowImageUpload(idx, e)}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 border border-dashed border-stone-200 rounded-xl text-center bg-stone-50/50">
          <p className="text-xs text-stone-500 font-medium">
            No variants created yet.
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            Pick colours and sizes in steps 1 & 2 above and click <strong>Generate & Add</strong> to create your product options.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={addBlankRow}
          className="text-xs uppercase font-bold text-stone-700 hover:text-stone-900 inline-flex items-center gap-1 transition-colors"
        >
          <Plus size={13} /> Add a single custom variant row
        </button>

        {variants.length > 0 && (
          <span className="text-[11px] text-stone-400 font-medium">
            {variants.length} variant{variants.length > 1 ? 's' : ''} total
          </span>
        )}
      </div>
    </div>
  );
};
