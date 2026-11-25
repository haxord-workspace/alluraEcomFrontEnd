import React from 'react';
import { MapPinned, Trash2 } from 'lucide-react';
import type { PickupAddressErrors, PickupAddressForm as PickupAddressFormData } from '../../utils/pickupAddressValidation';

interface DispatchAddressFormProps {
  form: PickupAddressFormData;
  errors: PickupAddressErrors;
  disabled: boolean;
  /** True once a dispatch address has been saved on the server (and hasn't been cleared in this session) */
  isConfigured: boolean;
  onChange: (field: keyof PickupAddressFormData, value: string) => void;
  onBlur: (field: keyof PickupAddressFormData) => void;
  onClear: () => void;
}

const fieldClass = (hasError: boolean) =>
  `w-full px-3.5 py-2 text-sm bg-white border rounded-lg text-primary-900 focus:outline-none focus:border-accent-gold disabled:bg-primary-100/60 disabled:text-primary-500 ${
    hasError ? 'border-rose-400 focus:border-rose-500' : 'border-primary-200'
  }`;

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-xs font-semibold uppercase tracking-wider text-primary-700 mb-1.5">{children}</label>
);

const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? <p role="alert" className="text-[11px] text-rose-600 mt-1">{message}</p> : null;

/** "Dispatch address" section of the Boutique Profile form — the "From" address on shipping slips and invoices. */
export const DispatchAddressForm: React.FC<DispatchAddressFormProps> = ({
  form,
  errors,
  disabled,
  isConfigured,
  onChange,
  onBlur,
  onClear,
}) => (
  <div className="bg-primary-50 rounded-xl border border-primary-200/80 p-6 shadow-sm space-y-6">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <h2 className="font-serif text-xl text-primary-900 flex items-center gap-2">
        <MapPinned className="text-accent-gold" size={20} />
        Dispatch Address
      </h2>
      {isConfigured && (
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="flex items-center gap-1.5 text-xs font-sans font-semibold text-rose-700 hover:text-rose-800 disabled:opacity-40"
        >
          <Trash2 size={13} />
          <span>Clear dispatch address</span>
        </button>
      )}
    </div>

    <p className="text-xs text-primary-500 font-sans">Used as the From address on shipping slips and on invoices.</p>

    {!isConfigured && (
      <p className="text-xs font-sans text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5">
        Not set. Shipping slips and invoices use your general address until you add this.
      </p>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <Label>Contact Name</Label>
        <input
          type="text"
          value={form.contactName}
          onChange={e => onChange('contactName', e.target.value)}
          onBlur={() => onBlur('contactName')}
          disabled={disabled}
          maxLength={100}
          className={fieldClass(!!errors.contactName)}
        />
        <FieldError message={errors.contactName} />
      </div>

      <div>
        <Label>Phone</Label>
        <div className="flex items-center gap-2">
          <span className="px-3 py-2 text-sm bg-primary-100/60 border border-primary-200 rounded-lg text-primary-700 font-mono">
            +91
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={form.phone}
            onChange={e => onChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            onBlur={() => onBlur('phone')}
            disabled={disabled}
            placeholder="9847012345"
            className={fieldClass(!!errors.phone)}
          />
        </div>
        <FieldError message={errors.phone} />
      </div>

      <div className="md:col-span-2">
        <Label>Address Line 1</Label>
        <input
          type="text"
          value={form.addressLine1}
          onChange={e => onChange('addressLine1', e.target.value)}
          onBlur={() => onBlur('addressLine1')}
          disabled={disabled}
          maxLength={200}
          className={fieldClass(!!errors.addressLine1)}
        />
        <FieldError message={errors.addressLine1} />
      </div>

      <div className="md:col-span-2">
        <Label>Address Line 2 (optional)</Label>
        <input
          type="text"
          value={form.addressLine2}
          onChange={e => onChange('addressLine2', e.target.value)}
          onBlur={() => onBlur('addressLine2')}
          disabled={disabled}
          maxLength={200}
          className={fieldClass(!!errors.addressLine2)}
        />
        <FieldError message={errors.addressLine2} />
      </div>

      <div>
        <Label>City</Label>
        <input
          type="text"
          value={form.city}
          onChange={e => onChange('city', e.target.value)}
          onBlur={() => onBlur('city')}
          disabled={disabled}
          maxLength={100}
          className={fieldClass(!!errors.city)}
        />
        <FieldError message={errors.city} />
      </div>

      <div>
        <Label>State</Label>
        <input
          type="text"
          value={form.state}
          onChange={e => onChange('state', e.target.value)}
          onBlur={() => onBlur('state')}
          disabled={disabled}
          maxLength={100}
          className={fieldClass(!!errors.state)}
        />
        <FieldError message={errors.state} />
      </div>

      <div>
        <Label>Postal Code</Label>
        <input
          type="text"
          inputMode="numeric"
          value={form.postalCode}
          onChange={e => onChange('postalCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
          onBlur={() => onBlur('postalCode')}
          disabled={disabled}
          className={fieldClass(!!errors.postalCode)}
        />
        <FieldError message={errors.postalCode} />
      </div>

      <div>
        <Label>Country</Label>
        <input
          type="text"
          value={form.country}
          onChange={e => onChange('country', e.target.value)}
          onBlur={() => onBlur('country')}
          disabled={disabled}
          className={fieldClass(false)}
        />
      </div>
    </div>
  </div>
);
