/**
 * Downscales an image (data URL or same-origin URL) so its longest side is at most `maxDimension`.
 * Returns the original source when it is already small enough, isn't a raster image, or can't be read
 * (e.g. a cross-origin URL without CORS headers).
 */
export const resizeImageSource = (src: string, maxDimension = 1400, quality = 0.78): Promise<string> =>
  new Promise(resolve => {
    if (!src || /^data:image\/(svg\+xml|gif)/.test(src)) return resolve(src);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => resolve(src);
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(src);

        // Fill background white for PNGs before converting to JPEG to prevent black backgrounds
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Always compress to JPEG for optimal payload size (<150KB vs 3-10MB)
        const out = canvas.toDataURL('image/jpeg', quality);
        resolve(out && out.length > 0 && (out.length < src.length || scale < 1) ? out : src);
      } catch {
        // Tainted canvas (cross-origin image): keep original
        resolve(src);
      }
    };
    img.src = src;
  });

/** URL-friendly slug: "Summer Collection 2026" -> "summer-collection-2026" */
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
