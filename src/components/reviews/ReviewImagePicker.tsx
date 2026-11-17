import React, { useCallback, useId, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { REVIEW_LIMITS } from '../../config/reviews';

/**
 * Preview for a selected file. The object URL is created when the <img> mounts and
 * revoked when it unmounts (React 19 ref cleanup), so nothing leaks and no state is needed.
 */
const FilePreview: React.FC<{ file: File; alt: string }> = ({ file, alt }) => {
  const attach = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return;
      const url = URL.createObjectURL(file);
      img.src = url;
      return () => URL.revokeObjectURL(url);
    },
    [file]
  );
  return <img ref={attach} alt={alt} className="w-full h-full object-cover" />;
};

interface ReviewImagePickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  /** Server-side error for the images field, if any */
  serverError?: string;
}

const MB = 1024 * 1024;

/**
 * Optional review photos: up to 5 JPG/PNG/WebP files, 5 MB each (Swagger limits).
 * Previews use object URLs, which are revoked when removed or unmounted.
 */
export const ReviewImagePicker: React.FC<ReviewImagePickerProps> = ({ files, onChange, disabled, serverError }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const hintId = useId();
  const [rejected, setRejected] = useState<string[]>([]);

  const remaining = REVIEW_LIMITS.imagesMax - files.length;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const accepted: File[] = [];
    const problems: string[] = [];
    Array.from(list).forEach(file => {
      if (!REVIEW_LIMITS.imageMimeTypes.includes(file.type)) {
        problems.push(`${file.name}: only JPG, PNG or WebP images are allowed.`);
      } else if (file.size > REVIEW_LIMITS.imageMaxBytes) {
        problems.push(`${file.name}: larger than ${REVIEW_LIMITS.imageMaxBytes / MB} MB.`);
      } else if (accepted.length >= remaining) {
        problems.push(`${file.name}: you can add up to ${REVIEW_LIMITS.imagesMax} photos.`);
      } else {
        accepted.push(file);
      }
    });
    setRejected(problems);
    if (accepted.length) onChange([...files, ...accepted]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (index: number) => {
    setRejected([]);
    onChange(files.filter((_, i) => i !== index));
  };

  const errorText = [serverError, ...rejected].filter(Boolean);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="block text-xs font-sans font-bold text-allura-darkBrown uppercase tracking-wider">
          Photos <span className="font-normal normal-case tracking-normal text-allura-muted">(optional)</span>
        </label>
        <span id={hintId} className="text-[11px] font-sans text-allura-muted">
          {files.length}/{REVIEW_LIMITS.imagesMax} · JPG, PNG, WebP · max {REVIEW_LIMITS.imageMaxBytes / MB} MB each
        </span>
      </div>

      <ul className="flex flex-wrap gap-2">
        {files.map((file, idx) => (
          <li key={`${file.name}-${file.size}-${idx}`} className="relative w-20 h-20 rounded-xl overflow-hidden border border-allura-border bg-allura-bg">
            <FilePreview file={file} alt={`Selected photo ${idx + 1}: ${file.name}`} />
            <button
              type="button"
              onClick={() => removeAt(idx)}
              disabled={disabled}
              className="absolute top-0.5 right-0.5 w-8 h-8 flex items-center justify-center rounded-full bg-allura-darkBrown/80 text-white hover:bg-allura-darkBrown disabled:opacity-50"
              aria-label={`Remove photo ${idx + 1}`}
            >
              <X size={14} />
            </button>
          </li>
        ))}
        {remaining > 0 && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              aria-describedby={hintId}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-allura-border text-allura-muted hover:border-allura-gold hover:text-allura-darkBrown flex flex-col items-center justify-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider disabled:opacity-50"
            >
              <Camera size={18} />
              <span>Add</span>
            </button>
          </li>
        )}
      </ul>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={REVIEW_LIMITS.imageMimeTypes.join(',')}
        multiple
        disabled={disabled || remaining <= 0}
        onChange={e => addFiles(e.target.files)}
        className="sr-only"
        tabIndex={-1}
      />

      {errorText.length > 0 && (
        <ul role="alert" className="text-[11px] font-sans text-rose-700 space-y-0.5">
          {errorText.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
