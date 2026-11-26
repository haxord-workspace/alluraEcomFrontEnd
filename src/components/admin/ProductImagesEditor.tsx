import React, { useRef, useState } from 'react';
import { ImagePlus, Star, Trash2, ChevronLeft, ChevronRight, Loader2, Upload, AlertCircle } from 'lucide-react';
import { validateImageFile, compressImage, createThumbnail } from '../../utils/imageUpload';
import { uploadImages } from '../../service/uploadService';

export interface ProductImageItem {
  url: string;
  thumbnailUrl?: string;
  publicId?: string;
  alt?: string;
  position?: number;
  isPrimary?: boolean;
}

interface ProductImagesEditorProps {
  images: ProductImageItem[];
  onChange: (images: ProductImageItem[]) => void;
  maxImages?: number;
  productName?: string;
  onRemoveExisting?: (publicId: string) => void;
}

/** First image is always primary unless explicitly flagged */
const normalize = (images: ProductImageItem[]): ProductImageItem[] =>
  images.map((img, i) => ({
    ...img,
    position: i + 1,
    isPrimary: i === 0,
  }));

export const ProductImagesEditor: React.FC<ProductImagesEditorProps> = ({
  images,
  onChange,
  maxImages = 10,
  productName = '',
  onRemoveExisting,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Ordered so primary image is at position 0
  const ordered = [...images].sort((a, b) => Number(!!b.isPrimary) - Number(!!a.isPrimary));
  const main = ordered[0];
  const gallery = ordered.slice(1);
  const remaining = maxImages - ordered.length;

  const handleFiles = async (fileList: FileList | File[]) => {
    setUploadError(null);
    const rawFiles = Array.from(fileList);
    if (!rawFiles.length) return;

    if (rawFiles.length > remaining) {
      setUploadError(`You can only add up to ${remaining} more image${remaining === 1 ? '' : 's'} (max ${maxImages} total).`);
    }

    const filesToUpload = rawFiles.slice(0, Math.max(0, remaining));
    if (!filesToUpload.length) return;

    // 1. Validate files
    for (const f of filesToUpload) {
      const val = validateImageFile(f, { maxMB: 10, allowSvg: false });
      if (!val.valid) {
        setUploadError(`${f.name}: ${val.error}`);
        return;
      }
    }

    setIsProcessing(true);
    setUploadProgress(10);

    try {
      // 2. Compress main file and generate thumbnail
      const processedPairs: { mainFile: File; thumbFile: File }[] = [];
      for (const f of filesToUpload) {
        const compressed = await compressImage(f, { maxSide: 1600, quality: 0.8, outputType: 'image/webp' });
        const thumb = await createThumbnail(f, 400);
        processedPairs.push({ mainFile: compressed, thumbFile: thumb });
      }

      setUploadProgress(40);

      // 3. Upload all main images in ONE call to /admin/uploads/images
      const mainFiles = processedPairs.map(p => p.mainFile);
      const thumbFiles = processedPairs.map(p => p.thumbFile);

      const [mainUploadResults, thumbUploadResults] = await Promise.all([
        uploadImages(mainFiles, 'products', p => setUploadProgress(40 + Math.round(p * 0.4))),
        uploadImages(thumbFiles, 'products'),
      ]);

      setUploadProgress(95);

      const newItems: ProductImageItem[] = mainUploadResults.map((res, i) => ({
        url: res.secureUrl || res.url,
        thumbnailUrl: thumbUploadResults[i]?.secureUrl || thumbUploadResults[i]?.url,
        publicId: res.publicId,
        alt: productName ? `${productName} photo ${ordered.length + i + 1}` : '',
        position: ordered.length + i + 1,
        isPrimary: ordered.length === 0 && i === 0,
      }));

      onChange(normalize([...ordered, ...newItems]));
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload images.');
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  };

  const remove = (index: number) => {
    const item = ordered[index];
    if (item?.publicId && onRemoveExisting) {
      onRemoveExisting(item.publicId);
    }
    onChange(normalize(ordered.filter((_, i) => i !== index)));
  };

  const makeMain = (index: number) => {
    const next = [...ordered];
    const [picked] = next.splice(index, 1);
    onChange(normalize([{ ...picked, isPrimary: true }, ...next]));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 1 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(normalize(next));
  };

  const updateAlt = (index: number, alt: string) => {
    const next = [...ordered];
    next[index] = { ...next[index], alt };
    onChange(next);
  };

  const openPicker = () => fileInputRef.current?.click();

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); },
    onDragLeave: () => setIsDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
    },
  };

  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-baseline justify-between">
        <div>
          <label className="block text-[11px] uppercase font-bold text-stone-700">Product Images</label>
          <span className="text-[10px] text-stone-400">
            Recommended: 1200×1600 px (3:4 portrait). Auto-compressed to WebP.
          </span>
        </div>
        <span className={`text-[11px] font-semibold ${ordered.length >= maxImages ? 'text-amber-600' : 'text-stone-500'}`}>
          {ordered.length} / {maxImages}
        </span>
      </div>

      {uploadError && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span className="flex-1">{uploadError}</span>
        </div>
      )}

      {isProcessing && uploadProgress !== null && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-stone-500">
            <span>Uploading & optimizing images…</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-stone-800 h-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        className="hidden"
        onChange={e => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="grid grid-cols-[140px_1fr] gap-4" {...dropHandlers}>
        {/* Main image */}
        <div>
          {main ? (
            <div className="space-y-1.5">
              <div className="relative group w-[140px] h-[175px] rounded-xl overflow-hidden border-2 border-stone-900 bg-stone-100 shadow-xs">
                <img src={main.thumbnailUrl || main.url} alt={main.alt || 'Main product'} className="w-full h-full object-cover" />
                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-stone-900 text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shadow-xs">
                  <Star size={9} className="fill-current text-amber-400" /> Main
                </span>
                <button
                  type="button"
                  onClick={() => remove(0)}
                  className="absolute top-1.5 right-1.5 bg-white/95 text-rose-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                  title="Remove main image"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <input
                type="text"
                placeholder={productName ? `${productName} front view` : 'Alt text'}
                value={main.alt || ''}
                onChange={e => updateAlt(0, e.target.value)}
                className="w-[140px] px-2 py-1 text-[11px] border border-stone-200 rounded-lg focus:outline-none focus:border-stone-800"
                title="Image alt description for SEO and accessibility"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={openPicker}
              disabled={isProcessing}
              className={`w-[140px] h-[175px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 text-stone-400 transition-colors disabled:opacity-50 ${
                isDragging ? 'border-stone-900 bg-stone-50 text-stone-700' : 'border-stone-300 hover:border-stone-500 hover:text-stone-600'
              }`}
            >
              {isProcessing ? <Loader2 size={22} className="animate-spin text-stone-600" /> : <Upload size={22} />}
              <span className="text-[11px] font-semibold text-stone-700">Main image</span>
              <span className="text-[10px]">Click or drop</span>
            </button>
          )}
          <p className="text-[10px] text-stone-400 mt-1">Shown on product cards</p>
        </div>

        {/* Additional gallery images */}
        <div>
          <p className="text-[10px] font-bold uppercase text-stone-500 mb-1.5">More images (gallery)</p>
          <div className="flex flex-wrap gap-2.5">
            {gallery.map((img, gi) => {
              const index = gi + 1;
              return (
                <div key={`${index}-${img.url.slice(-24)}`} className="space-y-1">
                  <div className="relative group w-[76px] h-[95px] rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shadow-2xs">
                    <img src={img.thumbnailUrl || img.url} alt={img.alt || `Product image ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1">
                      <div className="flex justify-between">
                        <button type="button" onClick={() => makeMain(index)} className="bg-white/95 rounded p-0.5 text-stone-800 hover:text-amber-600 shadow-xs" title="Set as main image">
                          <Star size={11} />
                        </button>
                        <button type="button" onClick={() => remove(index)} className="bg-white/95 rounded p-0.5 text-rose-600 shadow-xs" title="Remove">
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <div className="flex justify-between">
                        <button type="button" onClick={() => move(index, -1)} disabled={index === 1} className="bg-white/95 rounded p-0.5 text-stone-800 disabled:opacity-30 shadow-xs" title="Move left">
                          <ChevronLeft size={11} />
                        </button>
                        <button type="button" onClick={() => move(index, 1)} disabled={index === ordered.length - 1} className="bg-white/95 rounded p-0.5 text-stone-800 disabled:opacity-30 shadow-xs" title="Move right">
                          <ChevronRight size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Alt text"
                    value={img.alt || ''}
                    onChange={e => updateAlt(index, e.target.value)}
                    className="w-[76px] px-1.5 py-0.5 text-[10px] border border-stone-200 rounded focus:outline-none focus:border-stone-800 truncate"
                    title="Image alt description"
                  />
                </div>
              );
            })}

            {remaining > 0 && (
              <button
                type="button"
                onClick={openPicker}
                disabled={isProcessing}
                className={`w-[76px] h-[95px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-stone-400 transition-colors disabled:opacity-60 ${
                  isDragging ? 'border-stone-900 bg-stone-50 text-stone-700' : 'border-stone-300 hover:border-stone-500 hover:text-stone-600'
                }`}
                title="Add images (select several at once)"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin text-stone-600" /> : <ImagePlus size={16} />}
                <span className="text-[10px] font-semibold text-stone-700">Add</span>
              </button>
            )}
          </div>
          <p className="text-[10px] text-stone-400 mt-2">
            Select up to 10 files at once or drag them here. Hover an image to set it as main (★), reorder, or remove.
          </p>
        </div>
      </div>
    </div>
  );
};
