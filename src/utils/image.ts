/**
 * Downscales an image (data URL or same-origin URL) so its longest side is at most `maxDimension`.
 * Returns the original source when it is already small enough, isn't a raster image, or can't be read
 * (e.g. a cross-origin URL without CORS headers).
 */
export const resizeImageSource = (src: string, maxDimension: number, quality = 0.85): Promise<string> =>
  new Promise(resolve => {
    if (!src || /^data:image\/(svg\+xml|gif)/.test(src)) return resolve(src);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => resolve(src);
    img.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      if (scale === 1 && src.startsWith('data:')) return resolve(src);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(src);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const type = src.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
        const out = canvas.toDataURL(type, quality);
        resolve(src.startsWith('data:') && out.length >= src.length ? src : out);
      } catch {
        // Tainted canvas (cross-origin image): keep the original URL
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
