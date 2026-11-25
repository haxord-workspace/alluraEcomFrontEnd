import poppinsRegularUrl from '../../assets/fonts/Poppins-Regular.ttf?url';
import poppinsMediumUrl from '../../assets/fonts/Poppins-Medium.ttf?url';
import poppinsSemiBoldUrl from '../../assets/fonts/Poppins-SemiBold.ttf?url';
import poppinsBoldUrl from '../../assets/fonts/Poppins-Bold.ttf?url';
import { renderInvoicePdf, type InvoicePdfAssets, type PdfWeight } from './invoicePdf';
import type { InvoiceData } from './invoiceData';
import { saveBlob } from '../download';

/**
 * Browser entry for the invoice PDF. It is loaded with a dynamic import() from InvoiceModal,
 * so jsPDF and the fonts are only downloaded when someone actually downloads or prints.
 * The customer and admin sides both go through here, so they get the same file.
 */

const FONT_URLS: Record<PdfWeight, string> = {
  normal: poppinsRegularUrl,
  medium: poppinsMediumUrl,
  semibold: poppinsSemiBoldUrl,
  bold: poppinsBoldUrl,
};
const LOGO_URL = '/allura-logo.png';

const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

const fetchBuffer = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return response.arrayBuffer();
};

/** PNG width/height live at fixed offsets of the IHDR chunk */
const pngSize = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

const loadLogo = async (): Promise<InvoicePdfAssets['logo']> => {
  try {
    const data = new Uint8Array(await fetchBuffer(LOGO_URL));
    const { width, height } = pngSize(data);
    return width && height ? { data, width, height } : undefined;
  } catch {
    return undefined; // the generator falls back to the brand name in text
  }
};

let assetsPromise: Promise<InvoicePdfAssets> | null = null;

const loadAssets = (): Promise<InvoicePdfAssets> => {
  assetsPromise ??= (async () => {
    const weights = Object.keys(FONT_URLS) as PdfWeight[];
    const [buffers, logo] = await Promise.all([
      Promise.all(weights.map(w => fetchBuffer(FONT_URLS[w]))),
      loadLogo(),
    ]);
    const fonts = Object.fromEntries(weights.map((w, i) => [w, toBase64(buffers[i])])) as Record<PdfWeight, string>;
    return { fonts, logo };
  })().catch(error => {
    assetsPromise = null; // allow a retry after a network hiccup
    throw error;
  });
  return assetsPromise;
};

export const createInvoicePdfBlob = async (data: InvoiceData): Promise<Blob> => {
  const doc = renderInvoicePdf(data, await loadAssets());
  return doc.output('blob');
};

export const downloadInvoicePdf = async (data: InvoiceData): Promise<void> => {
  saveBlob(await createInvoicePdfBlob(data), data.fileName);
};

/**
 * Prints the generated PDF itself (not the HTML modal), so the printout has the same
 * layout, fonts and ₹ glyphs as the download. Where a browser can't print a PDF from a
 * hidden frame (mobile, some Safari builds), the PDF opens in a new tab instead.
 */
export const printInvoicePdf = async (data: InvoiceData): Promise<void> => {
  const url = URL.createObjectURL(await createInvoicePdfBlob(data));
  const isTouch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const openInTab = () => {
    // No 'noopener' here: with it window.open() always returns null (and it's our own blob URL)
    const tab = window.open(url, '_blank');
    if (!tab) window.location.assign(url);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  if (isTouch) {
    openInTab();
    return;
  }

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.title = 'Invoice print frame';
  // Off-screen but with a real size: some PDF viewers won't render (or print) a 0×0 frame
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:1100px;border:0;';
  const cleanup = () => {
    frame.remove();
    URL.revokeObjectURL(url);
  };
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      // The print dialog is modal in most browsers; give it plenty of time before tearing down
      setTimeout(cleanup, 60_000);
    } catch {
      frame.remove();
      openInTab();
    }
  };
  frame.src = url;
  document.body.appendChild(frame);
};
