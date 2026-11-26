/**
 * Formats a storefront product title.
 * If SKU exists and is non-empty, returns `{sku} - {name}` (e.g. "103556 - COTTON EMBOIDERY").
 * If SKU is missing or empty, returns just `{name}` with no leading separator.
 */
export function getProductTitle(product: { name?: string | null; sku?: string | null } | null | undefined): string {
  if (!product) return '';
  const name = (product.name || '').trim();
  const sku = (product.sku || '').trim();

  if (sku) {
    return name ? `${sku} - ${name}` : sku;
  }
  return name;
}
