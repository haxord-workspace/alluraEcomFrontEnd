// Validation for the "Dispatch address" section of the Boutique Profile form
// (src/pages/admin/AdminSettingsPage.tsx), sent as `pickupAddress` on
// PATCH /admin/settings/boutique-profile. Mirrors boutiqueSettingsValidation.ts.
//
// Self-contained (no relative imports), like supplierFormModel.ts, so it can run
// under Node's `--test` directly — Node's native TS loader needs explicit file
// extensions on relative specifiers, which the rest of this codebase doesn't use.
// The phone/PIN rules below are intentionally identical to addressValidation.ts's
// `mobileError`/`pincodeError`.
import type { PickupAddress } from '../types/settings';

/** Keeps digits only and drops a leading +91 / 91 / 0, e.g. "+91 98471 23456" -> "9847123456" */
const normalizeMobile = (value: string): string => {
  let digits = (value || '').replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length > 10 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
};

/** Digits only, at most 6 */
const normalizePincode = (value: string): string => (value || '').replace(/\D/g, '').slice(0, 6);

export interface PickupAddressForm {
  contactName: string;
  /** 10 digits, no +91 prefix — the form always shows the prefix fixed in the UI */
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export type PickupAddressErrors = Partial<Record<keyof PickupAddressForm, string>>;

export const EMPTY_PICKUP_ADDRESS_FORM: PickupAddressForm = {
  contactName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
};

/** Strips a leading `+91` for display in the 10-digit phone field */
export const parsePickupAddressToForm = (address: PickupAddress | null | undefined): PickupAddressForm => {
  if (!address) return { ...EMPTY_PICKUP_ADDRESS_FORM };
  return {
    contactName: address.contactName || '',
    phone: normalizeMobile(address.phone || ''),
    addressLine1: address.addressLine1 || '',
    addressLine2: address.addressLine2 || '',
    city: address.city || '',
    state: address.state || '',
    postalCode: normalizePincode(address.postalCode || ''),
    country: address.country || 'India',
  };
};

export const contactNameError = (value: string): string => {
  const v = (value || '').trim();
  if (!v) return 'Contact name is required.';
  if (v.length > 100) return 'Must be 100 characters or fewer.';
  return '';
};

/** Same Indian-mobile check as addressValidation.ts's `mobileError` (10 digits, starts 6-9) */
export const pickupPhoneError = (value: string): string => {
  const digits = normalizeMobile(value);
  if (!digits) return 'Please enter a mobile number.';
  if (digits.length !== 10) return 'Mobile number must be 10 digits.';
  if (!/^[6-9]/.test(digits)) return 'Enter a valid Indian mobile number (starts with 6, 7, 8 or 9).';
  return '';
};

export const addressLine1Error = (value: string): string => {
  const v = (value || '').trim();
  if (!v) return 'Address line 1 is required.';
  if (v.length > 200) return 'Must be 200 characters or fewer.';
  return '';
};

export const addressLine2Error = (value: string): string => {
  if (value && value.length > 200) return 'Must be 200 characters or fewer.';
  return '';
};

export const cityError = (value: string): string => {
  const v = (value || '').trim();
  if (!v) return 'City is required.';
  if (v.length > 100) return 'Must be 100 characters or fewer.';
  return '';
};

export const stateError = (value: string): string => {
  const v = (value || '').trim();
  if (!v) return 'State is required.';
  if (v.length > 100) return 'Must be 100 characters or fewer.';
  return '';
};

/** Same 6-digit, not-starting-with-0 PIN code check as addressValidation.ts's `pincodeError` */
export const pickupPostalCodeError = (value: string): string => {
  const digits = normalizePincode(value);
  if (!digits) return 'Please enter a PIN code.';
  if (digits.length !== 6) return 'PIN code must be 6 digits.';
  if (digits.startsWith('0')) return 'Enter a valid PIN code (it can’t start with 0).';
  return '';
};

export const validatePickupAddressForm = (form: PickupAddressForm): PickupAddressErrors => {
  const errors: PickupAddressErrors = {};
  const set = (field: keyof PickupAddressForm, msg: string) => {
    if (msg) errors[field] = msg;
  };
  set('contactName', contactNameError(form.contactName));
  set('phone', pickupPhoneError(form.phone));
  set('addressLine1', addressLine1Error(form.addressLine1));
  set('addressLine2', addressLine2Error(form.addressLine2));
  set('city', cityError(form.city));
  set('state', stateError(form.state));
  set('postalCode', pickupPostalCodeError(form.postalCode));
  return errors;
};

export const isPickupAddressFormValid = (form: PickupAddressForm): boolean =>
  Object.keys(validatePickupAddressForm(form)).length === 0;

/** Builds the full `pickupAddress` object to PATCH — always sent whole, never merged. */
export const buildPickupAddressPayload = (form: PickupAddressForm): PickupAddress => ({
  contactName: form.contactName.trim(),
  phone: `+91${normalizeMobile(form.phone)}`,
  addressLine1: form.addressLine1.trim(),
  ...(form.addressLine2.trim() ? { addressLine2: form.addressLine2.trim() } : {}),
  city: form.city.trim(),
  state: form.state.trim(),
  postalCode: normalizePincode(form.postalCode),
  country: (form.country || 'India').trim() || 'India',
});

/** Strips the `body.pickupAddress.` prefix the backend puts on field-error paths */
export const stripPickupAddressFieldPrefix = (path: string): string =>
  path.replace(/^(body\.)?pickupAddress\./, '');
