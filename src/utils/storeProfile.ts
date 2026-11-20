/** Helpers for displaying values from GET /store/settings (boutiqueProfile). */

/** Treats missing, blank or the backend's "string" placeholder as no value */
export const cleanProfileValue = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed.toLowerCase() !== 'string' ? trimmed : undefined;
};

/** Formats an Indian phone number as "+91 XXXXX XXXXX"; returns the raw value when it can't be parsed */
export const formatPhoneDisplay = (raw?: string | null): string => {
  if (!raw || typeof raw !== 'string') return '';
  const digits = raw.replace(/\D/g, '');
  const national = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits.length === 10 ? digits : null;
  return national ? `+91 ${national.slice(0, 5)} ${national.slice(5)}` : raw;
};
