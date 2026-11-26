// Validation for the Boutique Profile form (src/pages/admin/AdminSettingsPage.tsx)
import { mobileError } from './addressValidation';

export interface BoutiqueSettingsForm {
  storeName: string;
  tagline: string;
  whatsapp: string;
  email: string;
  gstin: string;
  address: string;
  freeShippingThreshold: string;
  standardShippingFee: string;
  expressShippingFee: string;
}

export type BoutiqueSettingsErrors = Partial<Record<keyof BoutiqueSettingsForm, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_AMOUNT = 1_000_000;

/** Error message, or '' when valid. */
export const legalNameError = (value: string): string => {
  const v = (value || '').trim();
  if (!v) return 'Boutique legal name is required.';
  if (v.length < 2) return 'Must be at least 2 characters.';
  if (v.length > 100) return 'Must be 100 characters or fewer.';
  return '';
};

/** Error message, or '' when valid (tagline is optional). */
export const taglineError = (value: string): string => {
  if (value && value.length > 100) return 'Must be 100 characters or fewer.';
  return '';
};

/** Error message, or '' when valid. Reuses the same Indian-mobile check as the address forms. */
export const whatsappError = (value: string): string => mobileError(value);

/** Error message, or '' when valid. */
export const emailError = (value: string): string => {
  const v = (value || '').trim();
  if (!v) return 'Support email is required.';
  if (!EMAIL_PATTERN.test(v)) return 'Enter a valid email address.';
  return '';
};

/** Error message, or '' when valid (GSTIN is optional with no frontend validation). */
export const gstinError = (_value?: string): string => '';

/** Error message, or '' when valid. */
export const addressError = (value: string): string => {
  const v = (value || '').trim();
  if (!v) return 'Address is required.';
  if (v.length < 10) return 'Must be at least 10 characters.';
  if (v.length > 250) return 'Must be 250 characters or fewer.';
  return '';
};

const amountError = (value: string, label: string): string => {
  const v = (value ?? '').trim();
  if (!v) return `${label} is required.`;
  if (!/^\d+(\.\d{1,2})?$/.test(v)) {
    return Number.isNaN(Number(v))
      ? `${label} must be a number.`
      : `${label} allows at most 2 decimal places.`;
  }
  const n = Number(v);
  if (n < 0) return `${label} cannot be negative.`;
  if (n > MAX_AMOUNT) return `${label} must be ${MAX_AMOUNT.toLocaleString('en-IN')} or less.`;
  return '';
};

/** Error message, or '' when valid. */
export const freeShippingThresholdError = (value: string): string =>
  amountError(value, 'Free shipping minimum');

/** Error message, or '' when valid. */
export const standardShippingFeeError = (value: string): string =>
  amountError(value, 'Standard tariff');

/** Error message, or '' when valid. Also flags an express tariff cheaper than the standard one. */
export const expressShippingFeeError = (value: string, standardValue: string): string => {
  const base = amountError(value, 'Express tariff');
  if (base) return base;
  const express = Number(value);
  const standard = Number(standardValue);
  if (!Number.isNaN(express) && !Number.isNaN(standard) && express < standard) {
    return 'Express tariff should not be lower than the standard tariff.';
  }
  return '';
};

/** Validates the whole form and returns a field -> message map (only invalid fields are present). */
export const validateBoutiqueSettings = (form: BoutiqueSettingsForm): BoutiqueSettingsErrors => {
  const errors: BoutiqueSettingsErrors = {};
  const set = (field: keyof BoutiqueSettingsForm, msg: string) => {
    if (msg) errors[field] = msg;
  };

  set('storeName', legalNameError(form.storeName));
  set('tagline', taglineError(form.tagline));
  set('whatsapp', whatsappError(form.whatsapp));
  set('email', emailError(form.email));
  set('gstin', gstinError(form.gstin));
  set('address', addressError(form.address));
  set('freeShippingThreshold', freeShippingThresholdError(form.freeShippingThreshold));
  set('standardShippingFee', standardShippingFeeError(form.standardShippingFee));
  set('expressShippingFee', expressShippingFeeError(form.expressShippingFee, form.standardShippingFee));

  return errors;
};
