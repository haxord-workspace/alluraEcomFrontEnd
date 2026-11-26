/**
 * Static invoice wording, shared by the on-screen invoice and the PDF.
 * Company details (address, GSTIN, support contacts, tagline) are NOT here: they come
 * from the store settings (boutiqueProfile) so admins can change them without a deploy.
 */

/** Shown when the store settings have no legal name */
export const DEFAULT_COMPANY_NAME = 'Allura Boutique';

/** Plain "INVOICE": the document has no GST breakdown (CGST/SGST/HSN), so it isn't titled a tax invoice */
export const INVOICE_TITLE = 'INVOICE';

export const INVOICE_THANK_YOU = 'Thank you for shopping with us.';

export const INVOICE_TERMS: readonly string[] = [
  'All items are quality certified by Allura Boutique.',
  'Size exchanges are accepted within 7 days of delivery with original tags intact. No returns.',
  'This is a computer-generated invoice and requires no physical signature.',
];

/** "Invoice-ORD-20261124-0002.pdf" (characters that are unsafe in file names are dropped) */
export const invoiceFileName = (orderNumber: string): string =>
  `Invoice-${orderNumber.replace(/[^\w.-]+/g, '') || 'order'}.pdf`;
