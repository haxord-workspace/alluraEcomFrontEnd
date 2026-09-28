import React, { useState } from 'react';
import { Check, Plus, Trash2, ImagePlus, ChevronDown, ChevronUp } from 'lucide-react';
import { COLOR_PALETTE, SIZE_PRESETS, colorHex } from '../../data/colorPalette';

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

interface ProductVariantsEditorProps {
  variants: VariantRow[];
  onChange: (variants: VariantRow[]) => void;
  productSku: string;
  isLoading?: boolean;
}

const slug = (v: string) => v.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');

/** e.g. TES44-MAROON-XL */
export const buildVariantSku = (productSku: string, color: string, size: string) =>
  [slug(productSku) || 'SKU', slug(color), slug(size)].filter(Boolean).join('-');

const comboKey = (color: string, size: string) => `${color.trim().toLowerCase()}|${size.trim().toLowerCase()}`;

const Swatch: React.FC<{ name: string; size?: number }> = ({ name, size = 14 }) => {
  const hex = colorHex(name);
  return (
    <span
      className="inline-block rounded-full border border-stone-300 shrink-0"
      style={{
        width: size,
        height: size,
        background: hex || 'repeating-linear-gradient(45deg,#e7e5e4 0 3px,#fafaf9 3px 6px)',
      }}
    />
  );
};

export const ProductVariantsEditor: React.FC<ProductVariantsEditorProps> = ({
  variants,
  onChange,
  productSku,
  isLoading,
}) => {
  // Quick builder selections
  const [pickedColors, setPickedColors] = useState<string[]>([]);
  const [pickedSizes, setPickedSizes] = useState<string[]>([]);
  const [customColor, setCustomColor] = useState('');
  const [customSize, setCustomSize] = useState('');
  const [openImagesFor, setOpenImagesFor] = useState<number | null>(null);

  const existingKeys = new Set(variants.map(v => comboKey(v.color, v.size)));

  const toggle = (list: string[], value: string) =>
    list.some(v => v.toLowerCase() === value.toLowerCase())
      ? list.filter(v => v.toLowerCase() !== value.toLowerCase())
      : [...list, value];

  const addCustomColor = () => {
    const name = customColor.trim();
    if (!name) return;
    if (!pickedColors.some(c => c.toLowerCase() === name.toLowerCase())) setPickedColors([...pickedColors, name]);
    setCustomColor('');
  };

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
      ...newCombos.map(c => ({
        sku: buildVariantSku(productSku, c.color, c.size),
        color: c.color,
        size: c.size,
        images: [],
      })),
    ]);
    setPickedColors([]);
    setPickedSizes([]);
  };

  const updateRow = (index: number, patch: Partial<VariantRow>) => {
    const next = [...variants];
    const row = { ...next[index], ...patch };
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

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const images = variants[index].images || [];
      updateRow(index, { images: [...images, { url: reader.result as string, isPrimary: images.length === 0 }] });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const duplicateKeys = variants
    .map(v => comboKey(v.color, v.size))
    .filter((k, i, all) => k !== '|' && all.indexOf(k) !== i);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] uppercase font-bold text-stone-500">Colours & Sizes (Variants)</label>
        <p className="text-[11px] text-stone-400 mt-0.5">
          Each colour / size combination becomes a variant customers can choose. Stock is tracked per variant.
        </p>
      </div>

      {/* Quick builder */}
      <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase text-stone-500 mb-1.5">1. Pick colours</p>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PALETTE.map(c => {
              const active = pickedColors.some(p => p.toLowerCase() === c.name.toLowerCase());
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setPickedColors(toggle(pickedColors, c.name))}
                  className={`flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border text-[11px] transition-colors ${
                    active ? 'border-stone-900 bg-white font-semibold text-stone-900' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-stone-300 flex items-center justify-center"
                    style={{ backgroundColor: c.hex }}
                  >
                    {active && <Check size={10} className={['#1C1B1A', '#151F30', '#561C08', '#5A1A2B', '#6B1E23', '#5B2A6E', '#2B4C9B', '#2F6B3F', '#1F6F6B'].includes(c.hex) ? 'text-white' : 'text-stone-900'} />}
                  </span>
                  {c.name}
                </button>
              );
            })}
            {pickedColors
              .filter(p => !colorHex(p))
              .map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPickedColors(toggle(pickedColors, p))}
                  className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border border-stone-900 bg-white text-[11px] font-semibold text-stone-900"
                  title="Remove"
                >
                  <Swatch name={p} size={16} />
                  {p} ×
                </button>
              ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              value={customColor}
              onChange={e => setCustomColor(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomColor(); } }}
              placeholder="Other colour, e.g. Rose Gold"
              className="flex-1 p-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-stone-800"
            />
            <button type="button" onClick={addCustomColor} className="px-2.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-[11px] font-semibold">
              Add
            </button>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase text-stone-500 mb-1.5">2. Pick sizes</p>
          <div className="flex flex-wrap gap-1.5">
            {[...SIZE_PRESETS, ...pickedSizes.filter(s => !SIZE_PRESETS.some(p => p.toLowerCase() === s.toLowerCase()))].map(s => {
              const active = pickedSizes.some(p => p.toLowerCase() === s.toLowerCase());
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPickedSizes(toggle(pickedSizes, s))}
                  className={`min-w-[40px] px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                    active ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'
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
              placeholder="Other size, e.g. 38, 2-3Y"
              className="flex-1 p-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-stone-800"
            />
            <button type="button" onClick={addCustomSize} className="px-2.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-[11px] font-semibold">
              Add
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={addCombos}
          disabled={newCombos.length === 0}
          className="w-full py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          <Plus size={13} />
          {newCombos.length === 0
            ? 'Pick colours and/or sizes above'
            : `3. Add ${newCombos.length} variant${newCombos.length > 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Variant rows */}
      {isLoading ? (
        <p className="text-[11px] text-stone-400 py-2">Loading variants…</p>
      ) : variants.length > 0 ? (
        <div className="border border-stone-200 rounded-xl divide-y divide-stone-100">
          <div className="hidden sm:grid grid-cols-[1.3fr_0.9fr_1.4fr_0.8fr_auto] gap-2 px-3 py-2 text-[9px] font-bold uppercase text-stone-400">
            <span>Colour</span><span>Size</span><span>SKU</span><span>Price</span><span />
          </div>
          {variants.map((v, idx) => {
            const isDuplicate = duplicateKeys.includes(comboKey(v.color, v.size));
            return (
              <div key={v.id || idx} className="px-3 py-2 space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-[1.3fr_0.9fr_1.4fr_0.8fr_auto] gap-2 items-center">
                  <div className="flex items-center gap-1.5">
                    <Swatch name={v.color} />
                    <select
                      value={v.color}
                      onChange={e => updateRow(idx, { color: e.target.value })}
                      className="w-full p-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-stone-800"
                    >
                      <option value="">No colour</option>
                      {COLOR_PALETTE.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      {v.color && !colorHex(v.color) && <option value={v.color}>{v.color}</option>}
                    </select>
                  </div>
                  <select
                    value={v.size}
                    onChange={e => updateRow(idx, { size: e.target.value })}
                    className="w-full p-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-stone-800"
                  >
                    <option value="">No size</option>
                    {SIZE_PRESETS.map(s => <option key={s} value={s}>{s}</option>)}
                    {v.size && !SIZE_PRESETS.includes(v.size) && <option value={v.size}>{v.size}</option>}
                  </select>
                  <input
                    value={v.sku}
                    onChange={e => updateRow(idx, { sku: e.target.value })}
                    placeholder={buildVariantSku(productSku, v.color, v.size)}
                    className="w-full p-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono focus:outline-none focus:border-stone-800"
                  />
                  <input
                    type="number"
                    min={0}
                    value={v.price ?? ''}
                    onChange={e => updateRow(idx, { price: e.target.value === '' ? undefined : Number(e.target.value) })}
                    placeholder="Same"
                    title="Leave blank to use the product's selling price"
                    className="w-full p-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono focus:outline-none focus:border-stone-800"
                  />
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      type="button"
                      onClick={() => setOpenImagesFor(openImagesFor === idx ? null : idx)}
                      className="p-1.5 text-stone-500 hover:bg-stone-100 rounded-lg flex items-center gap-0.5"
                      title="Variant images"
                    >
                      <ImagePlus size={14} />
                      {v.images?.length > 0 && <span className="text-[10px]">{v.images.length}</span>}
                      {openImagesFor === idx ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                    <button type="button" onClick={() => removeRow(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Remove variant">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isDuplicate && (
                  <p className="text-[10px] text-rose-600">This colour and size combination is listed more than once.</p>
                )}

                {openImagesFor === idx && (
                  <div className="flex flex-wrap items-center gap-2 pl-5">
                    {v.images?.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img.url} alt="variant" className="w-10 h-10 object-cover rounded border border-stone-200" />
                        <button
                          type="button"
                          onClick={() => updateRow(idx, { images: v.images.filter((_, j) => j !== i) })}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={8} />
                        </button>
                      </div>
                    ))}
                    <label className="w-10 h-10 flex items-center justify-center rounded border border-dashed border-stone-300 text-stone-400 hover:border-stone-500 cursor-pointer">
                      <Plus size={14} />
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(idx, e)} />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-stone-400">
          No variants yet. Without variants the product is sold as a single item with no colour or size choice.
        </p>
      )}

      <button type="button" onClick={addBlankRow} className="text-[10px] uppercase font-bold text-stone-600 hover:text-stone-900">
        + Add a single variant manually
      </button>
    </div>
  );
};
