/** Helpers for displaying values from GET /store/settings (boutiqueProfile). */

/** Treats missing, blank or the backend's "string" placeholder as no value */
export const cleanProfileValue = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed.toLowerCase() !== 'string' ? trimmed : undefined;
};

/** "Allura Boutique Pvt. Ltd." → "Allura Boutique" (company suffixes dropped for friendly copy) */
export const storeDisplayName = (legalName?: string | null): string | undefined => {
  const name = cleanProfileValue(legalName);
  if (!name) return undefined;
  const short = name
    .replace(/[\s,]*\b(pvt\.?|private)?\s*(ltd\.?|limited|llp|inc\.?|co\.)\.?$/i, '')
    .trim();
  return short || name;
};

/** Digits-only phone for tel: / wa.me links; adds the 91 country code to 10-digit Indian numbers */
export const phoneDigits = (raw?: string | null): string => {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length === 10 ? `91${digits}` : digits;
};

/** Formats an Indian phone number as "+91 XXXXX XXXXX"; returns the raw value when it can't be parsed */
export const formatPhoneDisplay = (raw?: string | null): string => {
  if (!raw || typeof raw !== 'string') return '';
  const digits = raw.replace(/\D/g, '');
  const national = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits.length === 10 ? digits : null;
  return national ? `+91 ${national.slice(0, 5)} ${national.slice(5)}` : raw;
};
