import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminErrorBanner } from '../AdminErrorBanner';
import { useConfirm } from '../../../context/ConfirmContext';
import { toSupplierApiError } from '../../../service/adminSuppliers';
import { SUPPLIER_STATUSES, SUPPLIER_STATUS_LABELS, SUPPLIER_TYPES, SUPPLIER_TYPE_LABELS } from '../../../types/suppliers';
import type { SupplierFieldKey, SupplierStatus } from '../../../types/suppliers';
import {
  getSupplierFieldMax,
  isSupplierFormKey,
  validateSupplierForm,
} from './supplierFormModel';
import type { SupplierFormErrors, SupplierFormValues } from './supplierFormModel';

interface SupplierFormProps {
  mode: 'create' | 'edit';
  initialValues: SupplierFormValues;
  /** Edit only: shown read-only at the top */
  supplierCode?: string;
  submitLabel: string;
  /** Throw (reject) to keep the form open; field errors in the response are mapped under fields */
  onSubmit: (values: SupplierFormValues) => Promise<void>;
  onCancel: () => void;
}

const omit = (errors: SupplierFormErrors, key: string): SupplierFormErrors => {
  const rest = { ...errors };
  delete rest[key as keyof SupplierFormErrors];
  return rest;
};

const INPUT_BASE =
  'w-full p-2.5 bg-stone-50 border rounded-xl text-xs font-sans text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-800';

/** Shared create / edit supplier form: sectioned cards, inline validation, bottom action bar */
export const SupplierForm: React.FC<SupplierFormProps> = ({
  mode,
  initialValues,
  supplierCode,
  submitLabel,
  onSubmit,
  onCancel,
}) => {
  const confirm = useConfirm();
  const [values, setValues] = useState<SupplierFormValues>(initialValues);
  const [serverErrors, setServerErrors] = useState<SupplierFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isDirty = useMemo(
    () => (Object.keys(values) as (keyof SupplierFormValues)[]).some(k => values[k].trim() !== initialValues[k].trim()),
    [values, initialValues]
  );

  // Warn before closing the tab / reloading with unsaved changes
  useEffect(() => {
    if (!isDirty || isSaving) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, isSaving]);

  // Functional updates: several change events in one tick (browser autofill fills many
  // inputs at once) must each apply on top of the previous one, never on a stale copy.
  const set = (key: keyof SupplierFormValues) => (value: string) => {
    setValues(prev => ({ ...prev, [key]: value }) as SupplierFormValues);
    // Editing a field clears its server error
    setServerErrors(prev => omit(prev, key));
  };

  // Client errors are derived (shown after the first submit attempt, updated as the user types)
  const clientErrors = useMemo(() => (submitted ? validateSupplierForm(values) : {}), [submitted, values]);
  const errors: SupplierFormErrors = { ...serverErrors, ...clientErrors };

  const handleCancel = async () => {
    if (isDirty) {
      const leave = await confirm({
        title: 'Discard changes?',
        message: 'You have unsaved changes. Leave this page and lose them?',
        confirmLabel: 'Discard changes',
        cancelLabel: 'Keep editing',
        isDestructive: true,
      });
      if (!leave) return;
    }
    onCancel();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormError(null);
    setServerErrors({});
    const submitErrors = validateSupplierForm(values);
    if (Object.keys(submitErrors).length > 0) {
      const first = Object.keys(submitErrors)[0];
      document.getElementById(`supplier-${first}`)?.focus();
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit(values);
    } catch (err) {
      const apiError = toSupplierApiError(err, 'Could not save the supplier');
      const fieldErrors: SupplierFormErrors = {};
      const unmatched: string[] = [];
      Object.entries(apiError.fieldErrors).forEach(([field, message]) => {
        if (isSupplierFormKey(field)) fieldErrors[field] = message;
        else unmatched.push(`${field}: ${message}`);
      });
      setServerErrors(fieldErrors);
      const hasFieldErrors = Object.keys(fieldErrors).length > 0;
      setFormError(
        hasFieldErrors
          ? unmatched.length > 0
            ? `Please fix the highlighted fields. ${unmatched.join(' • ')}`
            : 'Please fix the highlighted fields.'
          : apiError.message
      );
    } finally {
      setIsSaving(false);
    }
  };

  const field = (key: SupplierFieldKey, label: string, opts: FieldOpts = {}) => (
    <TextField
      id={`supplier-${key}`}
      label={label}
      value={values[key]}
      onChange={set(key)}
      error={errors[key]}
      maxLength={getSupplierFieldMax(key)}
      {...opts}
    />
  );

  const allowEmptyType = mode === 'create' || !initialValues.supplierType;

  return (
    <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-6 max-w-5xl">
      {formError && (
        <AdminErrorBanner title="Supplier not saved" error={formError} onDismiss={() => setFormError(null)} />
      )}

      {mode === 'edit' && supplierCode && (
        <div className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl px-5 py-3 shadow-xs text-xs font-sans">
          <span className="text-[10px] uppercase font-bold text-stone-400">Supplier code</span>
          <span className="font-mono font-bold text-stone-900">{supplierCode}</span>
          <span className="text-stone-400">Generated automatically, can't be changed.</span>
        </div>
      )}

      <Section title="Basic information">
        {field('name', 'Supplier name *', { className: 'sm:col-span-2', required: true })}
        {field('companyName', 'Company name')}
        {field('contactPerson', 'Contact person')}
        <div>
          <label htmlFor="supplier-supplierType" className="block text-[10px] uppercase font-bold text-stone-500 mb-1">
            Supplier type
          </label>
          <select
            id="supplier-supplierType"
            value={values.supplierType}
            onChange={e => set('supplierType')(e.target.value)}
            aria-invalid={!!errors.supplierType}
            className={`${INPUT_BASE} ${errors.supplierType ? 'border-rose-400' : 'border-stone-200'}`}
          >
            {allowEmptyType && <option value="">Not set</option>}
            {SUPPLIER_TYPES.map(t => (
              <option key={t} value={t}>
                {SUPPLIER_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <ErrorText id="supplier-supplierType" error={errors.supplierType} />
        </div>
        {mode === 'create' && (
          <div>
            <label htmlFor="supplier-status" className="block text-[10px] uppercase font-bold text-stone-500 mb-1">
              Status
            </label>
            <select
              id="supplier-status"
              value={values.status}
              onChange={e => set('status')(e.target.value as SupplierStatus)}
              className={`${INPUT_BASE} ${errors.status ? 'border-rose-400' : 'border-stone-200'}`}
            >
              {SUPPLIER_STATUSES.map(s => (
                <option key={s} value={s}>
                  {SUPPLIER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-stone-400">Only active suppliers can be picked for products.</p>
            <ErrorText id="supplier-status" error={errors.status} />
          </div>
        )}
      </Section>

      <Section title="Contact details">
        {field('email', 'Email', { type: 'email', placeholder: 'orders@supplier.com' })}
        {field('phone', 'Phone', { type: 'tel', placeholder: '+91 98470 12345', mono: true })}
        {field('alternatePhone', 'Alternate phone', { type: 'tel', placeholder: '+91 487 2345678', mono: true })}
        {field('website', 'Website', { type: 'url', placeholder: 'https://' })}
      </Section>

      <Section title="Address">
        {field('address', 'Street address', { className: 'sm:col-span-2', multiline: true, rows: 2})}
        {field('city', 'City')}
        {field('state', 'State')}
        {field('country', 'Country')}
        {field('postalCode', 'Postal code', { mono: true })}
      </Section>

      <Section title="Business and tax details">
        {field('taxIdentificationNumber', 'GSTIN / Tax ID', { mono: true, help: 'e.g. 32ABCDE1234F1Z5' })}
        {field('paymentTerms', 'Payment terms', { placeholder: 'Net 30' })}
      </Section>

      <Section title="Notes">
        {field('notes', 'Internal notes', {
          className: 'sm:col-span-2',
          multiline: true,
          rows: 4,
          help: 'Only visible to admins.',
        })}
      </Section>

      {/* Actions */}
      <div className="px-5 py-3 bg-white border border-stone-200 rounded-2xl shadow-xs flex items-center justify-end gap-2">
        {mode === 'edit' && !isDirty && <span className="mr-auto text-[11px] text-stone-400 font-sans">No changes yet</span>}
        <button
          type="button"
          onClick={() => void handleCancel()}
          disabled={isSaving}
          className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500 hover:bg-stone-50 text-xs font-sans font-bold disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || (mode === 'edit' && !isDirty)}
          className="px-5 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
        >
          {isSaving && <Loader2 size={13} className="animate-spin" />}
          <span>{isSaving ? 'Saving...' : submitLabel}</span>
        </button>
      </div>
    </form>
  );
};

// ── Building blocks ──────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
    <h2 className="font-serif text-xl font-normal text-stone-900">{title}</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">{children}</div>
  </section>
);

const ErrorText: React.FC<{ id: string; error?: string }> = ({ id, error }) =>
  error ? (
    <p id={`${id}-error`} className="mt-1 text-[11px] text-rose-600">
      {error}
    </p>
  ) : null;

interface FieldOpts {
  className?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  multiline?: boolean;
  rows?: number;
  mono?: boolean;
  help?: string;
}

const TextField: React.FC<
  FieldOpts & {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    maxLength?: number;
  }
> = ({ id, label, value, onChange, error, maxLength, className, type = 'text', placeholder, required, autoComplete, multiline, rows, mono, help }) => {
  const overLimit = !!maxLength && value.length > maxLength;
  // Counter appears near the limit (always for long text fields); the value is never cut
  const showCounter = !!maxLength && (multiline || overLimit || value.length >= maxLength * 0.8);
  const describedBy = [error ? `${id}-error` : help ? `${id}-help` : '', showCounter ? `${id}-count` : '']
    .filter(Boolean)
    .join(' ') || undefined;
  const cls = `${INPUT_BASE} ${mono ? 'font-mono' : ''} ${error ? 'border-rose-400' : 'border-stone-200'}`;
  const common = {
    id,
    // Unique name + autofill off: browser autofill must never write one field's value into another
    name: id,
    value,
    placeholder,
    required,
    autoComplete: autoComplete ?? 'off',
    'aria-invalid': !!error,
    'aria-describedby': describedBy,
  };
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[10px] uppercase font-bold text-stone-500 mb-1">
        {label}
      </label>
      {multiline ? (
        <textarea
          {...common}
          rows={rows}
          onChange={e => onChange(e.target.value)}
          className={`${cls} resize-y`}
        />
      ) : (
        <input {...common} type={type} onChange={e => onChange(e.target.value)} className={cls} />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {help && !error && (
            <p id={`${id}-help`} className="mt-1 text-[10px] text-stone-400">
              {help}
            </p>
          )}
          <ErrorText id={id} error={error} />
        </div>
        {showCounter && (
          <p
            id={`${id}-count`}
            aria-live="polite"
            className={`mt-1 text-[10px] tabular-nums whitespace-nowrap ${overLimit ? 'text-rose-600 font-semibold' : 'text-stone-400'}`}
          >
            {value.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
};
