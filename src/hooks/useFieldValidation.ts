import { useCallback, useState } from 'react';
import { getBackendFieldErrors } from '../utils/apiResponse';
import type { FieldRules } from '../utils/userValidation';

type ErrorMap<T> = Partial<Record<keyof T, string>>;

/**
 * Touched-based validation for a form built from a FieldRules set:
 * - a field shows its error after it is blurred (or the form is submitted), and
 *   re-validates on every change from then on, clearing as soon as it's valid;
 * - prefilled values show nothing until touched / submitted;
 * - backend field errors (from a 400/422 response) show under the matching field
 *   until that field is edited.
 */
export const useFieldValidation = <T extends Record<keyof T, string>>(rules: FieldRules<T>, values: T) => {
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<ErrorMap<T>>({});

  const ruleError = (field: keyof T): string => rules[field]?.(values[field] ?? '', values) || '';

  /** Message to show under a field ('' when none) */
  const errorFor = (field: keyof T): string => (touched[field] ? ruleError(field) : '') || serverErrors[field] || '';

  /** Call from onBlur */
  const touch = useCallback((field: keyof T) => {
    setTouched(prev => (prev[field] ? prev : { ...prev, [field]: true }));
  }, []);

  /** Call from onChange: a backend error no longer applies once the value is edited */
  const markChanged = useCallback((field: keyof T) => {
    setServerErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  /** Marks every field touched; returns the first invalid field (in rule order), or null */
  const validateAll = (): keyof T | null => {
    const fields = Object.keys(rules) as Array<keyof T>;
    setTouched(Object.fromEntries(fields.map(f => [f, true])) as Partial<Record<keyof T, boolean>>);
    return fields.find(f => ruleError(f)) ?? null;
  };

  /**
   * Puts backend validation errors under their fields. `fieldMap` maps backend paths
   * (e.g. "phone.number") to form fields. Returns the first mapped field, or null.
   */
  const applyServerErrors = (err: unknown, fieldMap: Record<string, keyof T>): keyof T | null => {
    const backend = getBackendFieldErrors(err);
    const mapped: ErrorMap<T> = {};
    Object.entries(backend).forEach(([path, message]) => {
      const field = fieldMap[path];
      if (field && !mapped[field]) mapped[field] = message;
    });
    setServerErrors(mapped);
    const fields = Object.keys(rules) as Array<keyof T>;
    return fields.find(f => mapped[f]) ?? null;
  };

  /** Forget touched state and backend errors (e.g. when switching forms) */
  const reset = useCallback(() => {
    setTouched({});
    setServerErrors({});
  }, []);

  return { errorFor, touch, markChanged, validateAll, applyServerErrors, reset };
};
