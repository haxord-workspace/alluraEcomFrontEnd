import adminApi from './adminApi';
import { mapUploadError } from '../utils/imageUpload';

export interface UploadResponse {
  url: string;
  secureUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  provider?: string;
}

export interface UploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
}

/**
 * Upload a single image file via POST /api/v1/admin/uploads/image.
 * @param file The image File to upload
 * @param folder Target folder name (e.g. 'products', 'banners', 'variants', 'general')
 * @param onProgress Optional callback for progress percentage (0-100)
 */
export async function uploadImage(
  file: File,
  folder = 'general',
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('image', file);
  if (folder) {
    formData.append('folder', folder);
  }

  try {
    const res = await adminApi.post<{ success: boolean; data: UploadResponse } | UploadResponse>(
      '/admin/uploads/image',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      }
    );

    const body = res.data;
    const item = (body && typeof body === 'object' && 'data' in body ? body.data : body) as UploadResponse;
    const finalUrl = item.secureUrl || item.url;

    return {
      url: finalUrl,
      secureUrl: finalUrl,
      publicId: item.publicId,
      width: item.width,
      height: item.height,
      bytes: item.bytes,
      format: item.format,
    };
  } catch (err: any) {
    throw new Error(mapUploadError(err));
  }
}

/**
 * Upload multiple image files (up to 10 per request batch) via POST /api/v1/admin/uploads/images.
 * Automatically splits batches into at most 10 items.
 */
export async function uploadImages(
  files: File[],
  folder = 'products',
  onProgress?: (percent: number) => void
): Promise<UploadResult[]> {
  if (files.length === 0) return [];

  const BATCH_SIZE = 10;
  const allResults: UploadResult[] = [];
  const totalBatches = Math.ceil(files.length / BATCH_SIZE);

  for (let b = 0; b < totalBatches; b++) {
    const batch = files.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const formData = new FormData();
    batch.forEach((file) => {
      formData.append('images', file);
    });
    if (folder) {
      formData.append('folder', folder);
    }

    try {
      const res = await adminApi.post<
        { success: boolean; data: UploadResponse[] } | UploadResponse[]
      >('/admin/uploads/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const batchPercent = (progressEvent.loaded / progressEvent.total) * (1 / totalBatches);
            const totalPercent = Math.round(((b / totalBatches) + batchPercent) * 100);
            onProgress(Math.min(100, totalPercent));
          }
        },
      });

      const body = res.data;
      const list = (body && typeof body === 'object' && 'data' in body && Array.isArray((body as any).data)
        ? (body as any).data
        : Array.isArray(body)
        ? body
        : [body]) as UploadResponse[];

      list.forEach((item) => {
        const finalUrl = item.secureUrl || item.url;
        allResults.push({
          url: finalUrl,
          secureUrl: finalUrl,
          publicId: item.publicId,
          width: item.width,
          height: item.height,
          bytes: item.bytes,
          format: item.format,
        });
      });
    } catch (err: any) {
      throw new Error(mapUploadError(err));
    }
  }

  if (onProgress) onProgress(100);
  return allResults;
}

/**
 * Delete an image by its publicId via DELETE /api/v1/admin/uploads/image.
 * Safe delete: Never throws to UI, logs errors and continues.
 */
export async function deleteImage(publicId?: string | null): Promise<boolean> {
  if (!publicId) return true;
  try {
    await adminApi.delete('/admin/uploads/image', {
      data: { publicId },
    });
    return true;
  } catch (err) {
    console.warn(`[deleteImage] Could not delete image with publicId: ${publicId}`, err);
    return false;
  }
}
