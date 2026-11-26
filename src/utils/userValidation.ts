// Shared validation rules + messages for the customer sign-up and profile edit forms.
// Each rule returns an error message, or '' when the value is valid. Values are
// trimmed before they are checked (passwords are checked as typed).
//
// Backend rules known so far: passwords need at least 8 characters (same rule as
// POST /auth/reset-password). Nothing here is stricter than that for passwords.

import { normalizeMobile } from './addressValidation';

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 50;
export const PASSWORD_MIN_LENGTH = 8;

// Letters in any language (plus combining marks), spaces, apostrophes, hyphens and dots,
// starting with a letter: "Anne-Marie", "D'Souza", "J. Thomas"
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} '.-]*$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRY_CODE_PATTERN = /^\+\d{1,4}$/;

/** Trimmed, lowercased email (what is validated and sent) */
export const normalizeEmail = (value: string): string => (value || '').trim().toLowerCase();

/** Trimmed name with inner runs of whitespace collapsed */
export const normalizeName = (value: string): string => (value || '').trim().replace(/\s+/g, ' ');

/** Country code without spaces, e.g. "+ 91" -> "+91" */
export const normalizeCountryCode = (value: string): string => (value || '').replace(/\s/g, '');

export const isIndianCountryCode = (countryCode: string): boolean => normalizeCountryCode(countryCode) === '+91';

export const nameError = (value: string, label = 'Name', required = true): string => {
  const name = normalizeName(value);
  if (!name) return required ? `Please enter your ${label.toLowerCase()}.` : '';
  if (name.length < NAME_MIN_LENGTH) return `${label} must be at least ${NAME_MIN_LENGTH} characters.`;
  if (name.length > NAME_MAX_LENGTH) return `${label} must be ${NAME_MAX_LENGTH} characters or fewer.`;
  if (!NAME_PATTERN.test(name)) return `${label} can only contain letters, spaces, apostrophes ('), hyphens (-) and dots (.).`;
  return '';
};

/** Optional free-text name (e.g. display name): only a length limit when filled in */
export const optionalTextError = (value: string, label: string, max = NAME_MAX_LENGTH): string => {
  const text = (value || '').trim();
  if (text.length > max) return `${label} must be ${max} characters or fewer.`;
  return '';
};

export const emailError = (value: string): string => {
  const email = normalizeEmail(value);
  if (!email) return 'Please enter your email address.';
  if (!EMAIL_PATTERN.test(email)) return 'Please enter a valid email address.';
  return '';
};

export const passwordError = (value: string): string => {
  if (!value) return 'Please enter a password.';
  if (value.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  return '';
};

export const confirmPasswordError = (value: string, password: string): string => {
  if (!value) return 'Please confirm your password.';
  if (value !== password) return 'Passwords do not match.';
  return '';
};

export const countryCodeError = (value: string): string => {
  const code = normalizeCountryCode(value);
  if (!code) return 'Please enter a country code.';
  if (!COUNTRY_CODE_PATTERN.test(code)) return 'Enter a valid country code, e.g. +91.';
  return '';
};

/** Mobile number validation: mandatory, exactly 10 digits */
export const mobileNumberError = (value: string): string => {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return 'Mobile number is required.';
  if (digits.length !== 10) return 'Please enter a valid 10-digit mobile number.';
  return '';
};

/** Indian numbers: 10 digits starting with 6–9. Other country codes: 6–15 digits. */
export const phoneNumberError = (value: string, countryCode: string): string => {
  if (isIndianCountryCode(countryCode)) return mobileNumberError(value);
  if (!value) return 'Mobile number is required.';
  return /^\d{6,15}$/.test(value) ? '' : 'Enter a valid phone number (digits only).';
};

/** Keeps only what the phone field accepts for the selected country code */
export const normalizePhoneInput = (value: string, countryCode: string): string =>
  isIndianCountryCode(countryCode) ? normalizeMobile(value) : (value || '').replace(/\D/g, '').slice(0, 15);

// ── Per-form rule sets ──────────────────────────────────────────────────────

/** One rule per field; the object's key order is the order fields are checked / focused */
export type FieldRules<T extends Record<keyof T, string>> = {
  [K in keyof T]?: (value: string, values: T) => string;
};

export type SignUpValues = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export const signUpRules: FieldRules<SignUpValues> = {
  name: value => nameError(value, 'Full name'),
  email: value => emailError(value),
  phone: value => mobileNumberError(value),
  password: value => passwordError(value),
  confirmPassword: (value, values) => confirmPasswordError(value, values.password),
};

/** Profile edit: no password / email fields (email can't be changed there) */
export type ProfileValues = {
  firstName: string;
  lastName: string;
  displayName: string;
  countryCode: string;
  phoneNumber: string;
};

export const profileRules: FieldRules<ProfileValues> = {
  firstName: value => nameError(value, 'First name'),
  lastName: value => nameError(value, 'Last name'),
  displayName: value => optionalTextError(value, 'Display name'),
  countryCode: value => countryCodeError(value),
  phoneNumber: (value, values) => phoneNumberError(value, values.countryCode),
};
