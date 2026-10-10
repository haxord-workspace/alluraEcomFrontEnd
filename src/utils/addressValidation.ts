// Indian mobile number and PIN code helpers for the address forms

/** Keeps digits only and drops a leading +91 / 91 / 0, e.g. "+91 98471 23456" -> "9847123456" */
export const normalizeMobile = (value: string): string => {
  let digits = (value || '').replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length > 10 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
};

/** Digits only, at most 6 */
export const normalizePincode = (value: string): string => (value || '').replace(/\D/g, '').slice(0, 6);

/** Error message, or '' when valid. Indian mobiles are 10 digits starting with 6, 7, 8 or 9. */
export const mobileError = (value: string): string => {
  const digits = normalizeMobile(value);
  if (!digits) return 'Please enter a mobile number.';
  if (digits.length !== 10) return 'Mobile number must be 10 digits.';
  if (!/^[6-9]/.test(digits)) return 'Enter a valid Indian mobile number (starts with 6, 7, 8 or 9).';
  return '';
};

/** Error message, or '' when valid. Indian PIN codes are 6 digits and don't start with 0. */
export const pincodeError = (value: string): string => {
  const digits = normalizePincode(value);
  if (!digits) return 'Please enter a PIN code.';
  if (digits.length !== 6) return 'PIN code must be 6 digits.';
  if (digits.startsWith('0')) return 'Enter a valid PIN code (it can’t start with 0).';
  return '';
};
