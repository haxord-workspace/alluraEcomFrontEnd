import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Sparkles, X, Check, RefreshCw } from 'lucide-react';

interface PresetOption {
  label: string;
  url: string;
}

interface ImageUploadDropzoneProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  aspectRatioLabel?: string;
  presets?: PresetOption[];
  required?: boolean;
  helperText?: string;
  className?: string;
}

export const ImageUploadDropzone: React.FC<ImageUploadDropzoneProps> = ({
  label,
  value,
  onChange,
  aspectRatioLabel = 'Recommended: High Resolution (1920×800px or 1080×1080px)',
  presets = [],
  required = false,
  helperText,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState(value && !value.startsWith('data:') ? value : '');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WebP, SVG, AVIF).');
      return;
    }

    setFileName(file.name);
    const sizeInKb = Math.round(file.size / 1024);
    setFileSize(sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onChange(result);
      }
    };
    reader.readAsDataURL(file);
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

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setFileName('');
      setFileSize('');
    }
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

        {presets.length > 0 && (
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
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-[#561C08] bg-[#F7E6C8]/40 scale-[1.01]'
              : 'border-stone-300 hover:border-[#561C08] bg-stone-50/70 hover:bg-[#F7E6C8]/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp, image/svg+xml, image/avif"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#561C08]/10 text-[#561C08] flex items-center justify-center">
              <Upload size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-800">
                Click to browse or drag & drop banner image
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">
                Supports PNG, JPG, WEBP, SVG, AVIF (Max 15MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. URL TAB */}
      {activeTab === 'url' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleUrlSubmit();
                  }
                }}
                placeholder="Paste direct image link (e.g. /images/hero-banners/slide-1.jpeg or https://...)"
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-800 focus:outline-none focus:border-[#561C08]"
              />
            </div>
            <button
              type="button"
              onClick={handleUrlSubmit}
              className="px-4 py-2.5 bg-[#561C08] hover:bg-[#3D1406] text-white rounded-xl text-xs font-bold transition-colors"
            >
              Apply URL
            </button>
          </div>
          <p className="text-[10px] text-stone-400">
            You can paste local paths (e.g. <code className="text-stone-600">/images/hero-banners/slide-1.jpeg</code>) or external CDN links.
          </p>
        </div>
      )}

      {/* 3. PRESETS TAB */}
      {activeTab === 'presets' && presets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {presets.map((preset) => {
            const isSelected = value === preset.url;
            return (
              <button
                key={preset.url}
                type="button"
                onClick={() => {
                  onChange(preset.url);
                  setUrlInput(preset.url);
                  setFileName('');
                }}
                className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-[#561C08] bg-[#F7E6C8]/60 text-[#561C08] font-bold shadow-xs'
                    : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
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

      {/* LIVE PREVIEW CARD (When an image is loaded or selected) */}
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
              {fileName || (value.startsWith('data:') ? 'Uploaded Device Image (Base64)' : value)}
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

      {helperText && (
        <p className="text-[11px] text-stone-400 leading-relaxed">
          {helperText}
        </p>
      )}
    </div>
  );
};
