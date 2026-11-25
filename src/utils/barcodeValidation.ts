// Client-side format checks for barcode values, per symbology. Mirrors the GS1 check-digit
// algorithm shared by EAN-13 and UPC-A. The backend remains the source of truth (see
// POST /barcodes/validate) — this only catches obviously malformed input before it's saved.

const gs1CheckDigit = (dataDigits: string): number => {
  let sum = 0;
  for (let i = 0; i < dataDigits.length; i++) {
    const posFromRight = dataDigits.length - i;
    const weight = posFromRight % 2 === 1 ? 3 : 1;
    sum += Number(dataDigits[i]) * weight;
  }
  return (10 - (sum % 10)) % 10;
};

const isValidGs1 = (value: string, totalLength: number): boolean => {
  if (!new RegExp(`^\\d{${totalLength}}$`).test(value)) return false;
  const data = value.slice(0, -1);
  const checkDigit = Number(value.slice(-1));
  return gs1CheckDigit(data) === checkDigit;
};

export interface BarcodeFormatCheck {
  valid: boolean;
  message?: string;
}

/** Empty values are treated as valid — callers decide whether a barcode is required. */
export const validateBarcodeFormat = (value: string, type: string): BarcodeFormatCheck => {
  const trimmed = (value || '').trim();
  if (!trimmed) return { valid: true };

  switch (type) {
    case 'EAN13':
      if (!/^\d{13}$/.test(trimmed)) return { valid: false, message: 'EAN13 must be exactly 13 digits.' };
      if (!isValidGs1(trimmed, 13)) return { valid: false, message: 'EAN13 check digit is incorrect for these digits.' };
      return { valid: true };
    case 'UPC-A':
      if (!/^\d{12}$/.test(trimmed)) return { valid: false, message: 'UPC-A must be exactly 12 digits.' };
      if (!isValidGs1(trimmed, 12)) return { valid: false, message: 'UPC-A check digit is incorrect for these digits.' };
      return { valid: true };
    case 'CODE128':
      if (!/^[\x20-\x7E]+$/.test(trimmed)) return { valid: false, message: 'CODE128 must contain only printable ASCII characters.' };
      return { valid: true };
    case 'QR':
    default:
      return { valid: true };
  }
};
