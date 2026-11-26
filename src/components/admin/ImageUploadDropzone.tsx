import React, { useState, useRef, useEffect } from 'react';
import { Upload, Link as LinkIcon, Sparkles, X, Check, RefreshCw, Loader2 } from 'lucide-react';
import { validateImageFile, compressImage } from '../../utils/imageUpload';
import { uploadImage } from '../../service/uploadService';

interface PresetOption {
  label: string;
  url: string;
}

export interface ImageUploadMeta {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  bytes?: number;
}

interface ImageUploadDropzoneProps {
  label: string;
  value: string;
  onChange: (value: string, meta?: ImageUploadMeta) => void;
  aspectRatioLabel?: string;
  presets?: PresetOption[];
  required?: boolean;
  helperText?: string;
  showUrlTab?: boolean;
  showPresetsTab?: boolean;
  className?: string;
  folder?: string;
  allowSvg?: boolean;
  maxMB?: number;
  maxSide?: number;
}

export const ImageUploadDropzone: React.FC<ImageUploadDropzoneProps> = ({
  label,
  value,
  onChange,
  aspectRatioLabel = 'Recommended: High Resolution',
  presets = [],
  required = false,
  helperText,
  className = '',
  showUrlTab = true,
  showPresetsTab = true,
  folder = 'general',
  allowSvg = false,
  maxMB = 10,
  maxSide = 1920,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState(value && !value.startsWith('data:') ? value : '');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [fileError, setFileError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value) {
      setUrlInput('');
      setFileName('');
      setFileSize('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else if (!value.startsWith('data:')) {
      setUrlInput(value);
    }
  }, [value]);

  const handleFile = async (file: File) => {
    setFileError('');

    // 1. Validate
    const validation = validateImageFile(file, { maxMB, allowSvg });
    if (!validation.valid) {
      setFileError(validation.error || 'Invalid image file.');
      return;
    }

    setFileName(file.name);
    setIsUploading(true);
    setUploadPercent(10);

    try {
      // 2. Compress before upload
      const compressed = await compressImage(file, {
        maxSide,
        quality: 0.8,
        outputType: 'image/webp',
      });

      setUploadPercent(40);

      // 3. Upload to R2 via POST /api/v1/admin/uploads/image
      const res = await uploadImage(compressed, folder, (percent) => {
        setUploadPercent(40 + Math.round(percent * 0.55));
      });

      setUploadPercent(100);

      const finalUrl = res.secureUrl || res.url;
      const originalKb = Math.round(file.size / 1024);
      const compressedKb = Math.round(compressed.size / 1024);

      if (originalKb > compressedKb) {
        setFileSize(`${compressedKb} KB (optimized from ${originalKb > 1024 ? (originalKb / 1024).toFixed(1) + ' MB' : originalKb + ' KB'})`);
      } else {
        setFileSize(`${compressedKb} KB`);
      }

      onChange(finalUrl, {
        url: finalUrl,
        publicId: res.publicId,
        width: res.width,
        height: res.height,
        bytes: res.bytes,
      });
    } catch (err: any) {
      setFileError(err.message || 'Failed to process and upload image.');
    } finally {
      setIsUploading(false);
      setUploadPercent(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleUrlSubmit = async () => {
    const raw = urlInput.trim();
    if (!raw) return;

    // If user pastes base64 data:image/, upload as file instead of saving raw data
    if (raw.startsWith('data:image/')) {
      try {
        setIsUploading(true);
        const res = await fetch(raw);
        const blob = await res.blob();
        const file = new File([blob], 'pasted-image.webp', { type: blob.type || 'image/webp' });
        await handleFile(file);
      } catch {
        setFileError('Could not process pasted base64 image data.');
        setIsUploading(false);
      }
      return;
    }

    // Normal external URL
    onChange(raw, { url: raw });
    setFileName('');
    setFileSize('');
  };

  const handleClear = () => {
    onChange('');
    setUrlInput('');
    setFileName('');
    setFileSize('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 font-sans ${className}`}>
      {/* Header Label */}
      <div className="flex items-center justify-between">
        <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-700">
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
        {aspectRatioLabel && (
          <span className="text-[10px] text-stone-400 font-medium">
            {aspectRatioLabel}
          </span>
        )}
      </div>

      {/* Tabs Selector: Upload vs URL vs Presets */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100/80 rounded-xl border border-stone-200/80 w-fit text-[11px]">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
            activeTab === 'upload'
              ? 'bg-white text-[#561C08] shadow-xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Upload size={12} />
          <span>Upload File</span>
        </button>

        {showUrlTab && (
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'url'
                ? 'bg-white text-[#561C08] shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <LinkIcon size={12} />
            <span>Image URL</span>
          </button>
        )}

        {showPresetsTab && presets.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'presets'
                ? 'bg-white text-[#561C08] shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sparkles size={12} />
            <span>Presets ({presets.length})</span>
          </button>
        )}
      </div>

      {/* 1. UPLOAD TAB */}
      {activeTab === 'upload' && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-[#561C08] bg-[#561C08]/5 scale-[0.99]'
              : 'border-stone-300 hover:border-stone-400 bg-stone-50/50'
          } ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={allowSvg ? 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml' : 'image/jpeg,image/png,image/webp,image/gif,image/avif'}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
              e.target.value = '';
            }}
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#561C08]/10 text-[#561C08] flex items-center justify-center">
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-800">
                {isUploading ? `Uploading image (${uploadPercent || 0}%)…` : 'Click to choose image or drag & drop'}
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">
                {allowSvg ? 'JPEG, PNG, WebP, GIF, AVIF or SVG' : 'PNG, JPG, WEBP, AVIF or GIF'} • Max {maxMB} MB (Auto-compressed to WebP)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. IMAGE URL TAB */}
      {activeTab === 'url' && showUrlTab && (
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://example.com/banner-image.webp"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleUrlSubmit();
              }
            }}
            className="flex-1 px-3.5 py-2 text-xs border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim() || isUploading}
            className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-800 disabled:opacity-50 transition-colors"
          >
            Apply
          </button>
        </div>
      )}

      {/* 3. PRESETS TAB */}
      {activeTab === 'presets' && showPresetsTab && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
          {presets.map((preset) => {
            const isSelected = value === preset.url;
            return (
              <button
                key={preset.url}
                type="button"
                onClick={() => {
                  onChange(preset.url, { url: preset.url });
                  setFileName(preset.label);
                  setFileSize('');
                }}
                className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                  isSelected
                    ? 'border-[#561C08] bg-[#561C08]/5 font-bold text-[#561C08]'
                    : 'border-stone-200 hover:border-stone-300 bg-white text-stone-700'
                }`}
              >
                <img
                  src={preset.url}
                  alt={preset.label}
                  className="w-8 h-8 rounded-lg object-cover bg-stone-100 flex-shrink-0"
                />
                <span className="text-[11px] truncate">{preset.label}</span>
                {isSelected && <Check size={12} className="ml-auto text-[#561C08] flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {/* LIVE PREVIEW CARD */}
      {value && (
        <div className="relative mt-2 p-2 bg-stone-50 border border-stone-200 rounded-2xl flex items-center gap-3 animate-fade-in">
          <div className="relative w-20 h-14 rounded-xl overflow-hidden bg-stone-200 border border-stone-200 flex-shrink-0">
            <img
              src={value}
              alt="Banner preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                <Check size={10} /> Active Image
              </span>
              {fileSize && (
                <span className="text-[10px] text-stone-400 font-mono">
                  {fileSize}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-stone-800 truncate mt-0.5">
              {fileName || (value.startsWith('data:') ? 'Uploaded Device Image' : value)}
            </p>
          </div>

          <div className="flex items-center gap-1 pr-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200 transition-colors"
              title="Replace Image"
            >
              <RefreshCw size={13} />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
              title="Clear Image"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {fileError && (
        <p role="alert" className="text-[11px] font-sans text-rose-700 mt-1.5">{fileError}</p>
      )}

      {helperText && (
        <p className="text-[11px] text-stone-400 leading-relaxed">
          {helperText}
        </p>
      )}
    </div>
  );
};
