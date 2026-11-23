/** WhatsApp click-to-chat helpers (number comes from GET /store/settings → boutiqueProfile.whatsappNumber). */

/**
 * Digits-only number for wa.me links: strips spaces, "+", dashes and brackets,
 * prefixes India's 91 to a bare 10-digit number. Returns null when it can't be a valid number.
 */
export const normalizeWhatsAppNumber = (raw?: string | null): string | null => {
  if (typeof raw !== 'string') return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  // Country code + subscriber number: E.164 allows at most 15 digits
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
};

export const buildWhatsAppUrl = (number: string, message: string): string =>
  `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

/**
 * Opens a WhatsApp chat in a new tab. Call it directly inside a click/submit handler so popup
 * blockers allow it. Falls back to navigating the current tab when the popup is blocked.
 *
 * Note: `window.open(url, '_blank', 'noopener')` always returns null, which would make the
 * fallback fire even when the tab opened. So the tab is opened without that feature and the
 * opener link is cut manually instead, which gives the same protection.
 */
export const openWhatsApp = (url: string): void => {
  const win = window.open(url, '_blank');
  if (win) {
    win.opener = null;
  } else {
    window.location.href = url;
  }
};
