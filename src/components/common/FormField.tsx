import React from 'react';

export interface FormFieldControlProps {
  /** Put on the input as `id` */
  id: string;
  /** Put on the input as `aria-describedby` */
  describedBy?: string;
  /** Put on the input as `aria-invalid` */
  invalid: boolean;
  /** Border colour class for the input: the error border while invalid, the normal one otherwise */
  borderClass: string;
}

interface FormFieldProps {
  id: string;
  label: React.ReactNode;
  /** Error message shown under the input; nothing is shown when empty */
  error?: string;
  className?: string;
  /** Renders the input (with any icon / toggle around it) using the given props */
  children: (control: FormFieldControlProps) => React.ReactNode;
}

/** Label + input + error text, with aria-invalid / aria-describedby wired up */
export const FormField: React.FC<FormFieldProps> = ({ id, label, error, className, children }) => {
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
        {label}
      </label>
      {children({
        id,
        describedBy: error ? errorId : undefined,
        invalid: !!error,
        borderClass: error ? 'border-red-400' : 'border-allura-border',
      })}
      {error && (
        <p id={errorId} className="mt-1 text-[11px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
