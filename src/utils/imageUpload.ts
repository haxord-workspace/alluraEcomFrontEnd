import imageCompression from 'browser-image-compression';

export const MAX_IMAGE_MB = 10;
export const MAX_MULTI_UPLOAD_COUNT = 10;

/** Allowed MIME types accepted by the R2 upload endpoint */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export interface ImageValidationOptions {
  maxMB?: number;
  allowSvg?: boolean;
  allowedTypes?: readonly string[];
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file against size and MIME type restrictions.
 * For product, variant, and banner photos, SVG is explicitly forbidden.
 */
export function validateImageFile(
  file: File,
  options: ImageValidationOptions = {}
): ValidationResult {
  const {
    maxMB = MAX_IMAGE_MB,
    allowSvg = false,
    allowedTypes = ALLOWED_IMAGE_TYPES,
  } = options;

  if (!file) {
    return { valid: false, error: 'No image was selected.' };
  }

  // Check SVG restriction first
  const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
  if (isSvg && !allowSvg) {
    return {
      valid: false,
      error: 'SVG files are not allowed for this image type. Please choose JPEG, PNG, WebP, GIF or AVIF.',
    };
  }

  // Check MIME type
  const isAllowedType = allowedTypes.includes(file.type);
  if (!isAllowedType) {
    return {
      valid: false,
      error: 'Only JPEG, PNG, WebP, GIF or AVIF images are allowed.',
    };
  }

  // Check file size
  const maxBytes = maxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image is ${sizeMb} MB. Maximum allowed size is ${maxMB} MB.`,
    };
  }

  return { valid: true };
}

export interface CompressionOptions {
  maxSide?: number;
  quality?: number;
  outputType?: string;
}

/**
 * Compresses an image file before upload.
 * - Skips SVG (vector) and GIF (animations preserved).
 * - Converts to WebP by default at target quality ~0.8.
 * - If compressed output is somehow larger than original, retains original.
 * - Re-validates that the resulting file does not exceed 10 MB.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxSide = 1920,
    quality = 0.8,
    outputType = 'image/webp',
  } = options;

  // Do not compress SVG or GIF
  if (
    file.type === 'image/svg+xml' ||
    file.type === 'image/gif' ||
    file.name.toLowerCase().endsWith('.svg') ||
    file.name.toLowerCase().endsWith('.gif')
  ) {
    return file;
  }

  try {
    const compressedBlob = await imageCompression(file, {
      maxIteration: 10,
      maxWidthOrHeight: maxSide,
      initialQuality: quality,
      fileType: outputType,
      useWebWorker: true,
    });

    // If compression somehow produced a larger file, keep original
    if (compressedBlob.size >= file.size) {
      return file;
    }

    // Name with .webp extension if converted
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const newName = outputType === 'image/webp' ? `${baseName}.webp` : file.name;
    const compressedFile = new File([compressedBlob], newName, {
      type: outputType,
      lastModified: Date.now(),
    });

    // Re-check 10 MB limit
    if (compressedFile.size > MAX_IMAGE_MB * 1024 * 1024) {
      throw new Error(`Compressed image still exceeds ${MAX_IMAGE_MB} MB limit.`);
    }

    return compressedFile;
  } catch (err) {
    console.warn('[compressImage] compression error, falling back to original:', err);
    return file;
  }
}

/**
 * Creates a 400px wide WebP thumbnail for `thumbnailUrl`.
 */
export async function createThumbnail(file: File, maxSide = 400): Promise<File> {
  if (
    file.type === 'image/svg+xml' ||
    file.type === 'image/gif' ||
    file.name.toLowerCase().endsWith('.svg')
  ) {
    return file;
  }

  try {
    const thumbBlob = await imageCompression(file, {
      maxWidthOrHeight: maxSide,
      initialQuality: 0.75,
      fileType: 'image/webp',
      useWebWorker: true,
    });

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    return new File([thumbBlob], `${baseName}-thumb.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn('[createThumbnail] thumbnail creation failed, returning original file:', err);
    return file;
  }
}

/**
 * Maps backend upload error codes to user-friendly messages.
 */
export function mapUploadError(err: any): string {
  const code =
    err?.response?.data?.error?.code ||
    err?.response?.data?.code ||
    err?.code;

  switch (code) {
    case 'FILE_TOO_LARGE':
      return 'Image is larger than 10 MB.';
    case 'INVALID_FILE_TYPE':
      return 'This file format is not allowed.';
    case 'INVALID_FILE_CONTENT':
      return 'This file is not a valid image.';
    case 'TOO_MANY_FILES':
      return 'You can upload at most 10 images at a time.';
    case 'NO_IMAGE_PROVIDED':
      return 'No image was selected.';
    default:
      return (
        err?.response?.data?.message ||
        err?.message ||
        'Failed to upload image. Please check file format and size.'
      );
  }
}
