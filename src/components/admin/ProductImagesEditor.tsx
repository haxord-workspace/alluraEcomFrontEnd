import React, { useRef, useState } from 'react';
import { ImagePlus, Star, Trash2, ChevronLeft, ChevronRight, Loader2, Upload } from 'lucide-react';

export interface ProductImage {
  url: string;
  isPrimary?: boolean;
}

interface ProductImagesEditorProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  maxImages?: number;
}

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/** Reads an image file and downsizes it so product payloads stay small (images are sent as base64). */
const fileToResizedDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const src = reader.result as string;
      // Keep SVG / GIF untouched (resizing would flatten them)
      if (/image\/(svg\+xml|gif)/.test(file.type)) return resolve(src);

      const img = new Image();
      img.onerror = () => resolve(src);
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(src);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const out = canvas.toDataURL(type, JPEG_QUALITY);
        // Use whichever is smaller
        resolve(out.length < src.length ? out : src);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });

/** First image is always the main (primary) one */
const normalize = (images: ProductImage[]): ProductImage[] =>
  images.map((img, i) => ({ ...img, isPrimary: i === 0 }));

export const ProductImagesEditor: React.FC<ProductImagesEditorProps> = ({ images, onChange, maxImages = 10 }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Put the image flagged primary first, whatever order the backend returned
  const ordered = [...images].sort((a, b) => Number(!!b.isPrimary) - Number(!!a.isPrimary));
  const main = ordered[0];
  const gallery = ordered.slice(1);
  const remaining = maxImages - ordered.length;

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/')).slice(0, Math.max(0, remaining));
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const urls = await Promise.all(files.map(fileToResizedDataUrl));
      onChange(normalize([...ordered, ...urls.map(url => ({ url }))]));
    } finally {
      setIsProcessing(false);
    }
  };

  const remove = (index: number) => onChange(normalize(ordered.filter((_, i) => i !== index)));

  const makeMain = (index: number) => {
    const next = [...ordered];
    const [picked] = next.splice(index, 1);
    onChange(normalize([picked, ...next]));
  };

  // Move within the gallery (index is the position in `ordered`, never 0)
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 1 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(normalize(next));
  };

  const openPicker = () => fileInputRef.current?.click();

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); },
    onDragLeave: () => setIsDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="block text-[10px] uppercase font-bold text-stone-500">Product Images</label>
        <span className="text-[10px] text-stone-400">{ordered.length} / {maxImages}</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="grid grid-cols-[140px_1fr] gap-3" {...dropHandlers}>
        {/* Main image */}
        <div>
          {main ? (
            <div className="relative group w-[140px] h-[175px] rounded-xl overflow-hidden border-2 border-stone-900 bg-stone-100">
              <img src={main.url} alt="Main product" className="w-full h-full object-cover" />
              <span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-stone-900 text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                <Star size={9} className="fill-current" /> Main
              </span>
              <button
                type="button"
                onClick={() => remove(0)}
                className="absolute top-1.5 right-1.5 bg-white/90 text-rose-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove main image"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openPicker}
              className={`w-[140px] h-[175px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 text-stone-400 transition-colors ${
                isDragging ? 'border-stone-900 bg-stone-50 text-stone-700' : 'border-stone-300 hover:border-stone-500 hover:text-stone-600'
              }`}
            >
              <Upload size={20} />
              <span className="text-[11px] font-semibold">Main image</span>
              <span className="text-[10px]">Click or drop</span>
            </button>
          )}
          <p className="text-[10px] text-stone-400 mt-1">Shown on product cards</p>
        </div>

        {/* Additional images */}
        <div>
          <p className="text-[10px] font-bold uppercase text-stone-400 mb-1.5">More images (gallery)</p>
          <div className="flex flex-wrap gap-2">
            {gallery.map((img, gi) => {
              const index = gi + 1;
              return (
                <div key={`${index}-${img.url.slice(-24)}`} className="relative group w-[72px] h-[90px] rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                  <img src={img.url} alt={`Product image ${index + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-stone-900/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1">
                    <div className="flex justify-between">
                      <button type="button" onClick={() => makeMain(index)} className="bg-white/90 rounded p-0.5 text-stone-800" title="Set as main image">
                        <Star size={11} />
                      </button>
                      <button type="button" onClick={() => remove(index)} className="bg-white/90 rounded p-0.5 text-rose-600" title="Remove">
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <div className="flex justify-between">
                      <button type="button" onClick={() => move(index, -1)} disabled={index === 1} className="bg-white/90 rounded p-0.5 text-stone-800 disabled:opacity-30" title="Move left">
                        <ChevronLeft size={11} />
                      </button>
                      <button type="button" onClick={() => move(index, 1)} disabled={index === ordered.length - 1} className="bg-white/90 rounded p-0.5 text-stone-800 disabled:opacity-30" title="Move right">
                        <ChevronRight size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {remaining > 0 && (
              <button
                type="button"
                onClick={openPicker}
                disabled={isProcessing}
                className={`w-[72px] h-[90px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-stone-400 transition-colors disabled:opacity-60 ${
                  isDragging ? 'border-stone-900 bg-stone-50 text-stone-700' : 'border-stone-300 hover:border-stone-500 hover:text-stone-600'
                }`}
                title="Add images (you can select several at once)"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                <span className="text-[10px] font-semibold">Add</span>
              </button>
            )}
          </div>
          <p className="text-[10px] text-stone-400 mt-1.5">
            Select several files at once or drag them here. Hover an image to make it the main one, reorder or remove it.
          </p>
        </div>
      </div>
    </div>
  );
};
