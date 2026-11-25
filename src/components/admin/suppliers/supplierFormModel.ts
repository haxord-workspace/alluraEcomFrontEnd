import type {
  CreateSupplierPayload,
  Supplier,
  SupplierEditableFields,
  SupplierFieldKey,
  SupplierStatus,
  SupplierType,
  UpdateSupplierPayload,
} from '../../../types/suppliers';

/** Form state: every editable field as a string ('' = empty) */
export type SupplierFormValues = Record<SupplierFieldKey, string> & { status: SupplierStatus };

export type SupplierFormErrors = Partial<Record<SupplierFieldKey | 'status', string>>;

export const SUPPLIER_FIELD_KEYS: SupplierFieldKey[] = [
  'name',
  'companyName',
  'contactPerson',
  'supplierType',
  'email',
  'phone',
  'alternatePhone',
  'website',
  'address',
  'city',
  'state',
  'country',
  'postalCode',
  'taxIdentificationNumber',
  'paymentTerms',
  'notes',
];

export const EMPTY_SUPPLIER_FORM: SupplierFormValues = {
  name: '',
  companyName: '',
  contactPerson: '',
  supplierType: '',
  email: '',
  phone: '',
  alternatePhone: '',
  website: '',
  address: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  taxIdentificationNumber: '',
  paymentTerms: '',
  notes: '',
  status: 'ACTIVE',
};

export const supplierToFormValues = (s: Supplier): SupplierFormValues => {
  const values = { ...EMPTY_SUPPLIER_FORM, status: s.status };
  SUPPLIER_FIELD_KEYS.forEach(key => {
    const v = s[key];
    values[key] = typeof v === 'string' ? v : '';
  });
  return values;
};

/**
 * Backend length limits, one entry per field (confirmed by the backend team).
 * Used for validation and counters only: inputs are never hard-capped, so a long
 * value is never silently cut. Each field reads only its own entry.
 */
export const SUPPLIER_FIELD_LIMITS = {
  name: { max: 200 },
  companyName: { max: 200 },
  contactPerson: { max: 200 },
  paymentTerms: { max: 200 },
  address: { max: 500 },
  city: { max: 100 },
  state: { max: 100 },
  country: { max: 100 },
  postalCode: { max: 20 },
  taxIdentificationNumber: { max: 30 },
  notes: { max: 2000 },
  phone: { min: 6, max: 20 },
  alternatePhone: { min: 6, max: 20 },
} as const satisfies Partial<Record<SupplierFieldKey, { min?: number; max: number }>>;

type LimitedField = keyof typeof SUPPLIER_FIELD_LIMITS;

export const getSupplierFieldMax = (key: SupplierFieldKey): number | undefined =>
  key in SUPPLIER_FIELD_LIMITS ? SUPPLIER_FIELD_LIMITS[key as LimitedField].max : undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARS_RE = /^[+\d\s()-]+$/;

const isHttpUrl = (value: string): boolean => {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return !!url.hostname && url.hostname.includes('.');
  } catch {
    return false;
  }
};

/** Client-side checks mirroring the backend rules. Server errors are still shown. */
export const validateSupplierForm = (values: SupplierFormValues): SupplierFormErrors => {
  const errors: SupplierFormErrors = {};
  const v = (k: SupplierFieldKey) => values[k].trim();

  if (!v('name')) errors.name = 'Supplier name is required.';
  (['phone', 'alternatePhone'] as const).forEach(k => {
    const value = v(k);
    const { min, max } = SUPPLIER_FIELD_LIMITS[k];
    if (value && (!PHONE_CHARS_RE.test(value) || value.length < min || value.length > max)) {
      errors[k] = `Use ${min}–${max} characters: digits, spaces, +, ( ) and - only.`;
    }
  });
  (Object.keys(SUPPLIER_FIELD_LIMITS) as LimitedField[]).forEach(k => {
    const max = SUPPLIER_FIELD_LIMITS[k].max;
    if (!errors[k] && v(k).length > max) errors[k] = `Use ${max} characters or fewer (now ${v(k).length}).`;
  });
  if (v('email') && !EMAIL_RE.test(v('email'))) errors.email = 'Enter a valid email address.';
  if (v('website') && !isHttpUrl(v('website'))) errors.website = 'Enter a full URL starting with http:// or https://';
  return errors;
};

const trimmedFields = (values: SupplierFormValues): Record<SupplierFieldKey, string> => {
  const out = {} as Record<SupplierFieldKey, string>;
  SUPPLIER_FIELD_KEYS.forEach(k => {
    out[k] = values[k].trim();
  });
  return out;
};

/** Create: empty optional fields are left out entirely (the API rejects unknown/empty junk) */
export const buildCreatePayload = (values: SupplierFormValues): CreateSupplierPayload => {
  const fields = trimmedFields(values);
  const payload: Partial<SupplierEditableFields> = {};
  SUPPLIER_FIELD_KEYS.forEach(k => {
    if (fields[k]) (payload as Record<string, string>)[k] = fields[k];
  });
  return { ...(payload as SupplierEditableFields), name: fields.name, status: values.status };
};

/**
 * Edit: only fields that changed. A cleared optional field is sent as '' so the
 * backend can remove it. Never includes status or supplierCode.
 */
export const buildUpdatePayload = (initial: SupplierFormValues, values: SupplierFormValues): UpdateSupplierPayload => {
  const before = trimmedFields(initial);
  const after = trimmedFields(values);
  const payload: Record<string, string> = {};
  SUPPLIER_FIELD_KEYS.forEach(k => {
    if (before[k] !== after[k]) payload[k] = after[k];
  });
  if (payload.supplierType === '') delete payload.supplierType;
  return payload as UpdateSupplierPayload & { supplierType?: SupplierType };
};

export const isSupplierFormKey = (key: string): key is SupplierFieldKey | 'status' =>
  (SUPPLIER_FIELD_KEYS as string[]).includes(key) || key === 'status';
