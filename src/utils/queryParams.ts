/**
 * Builds an Axios `params` object, dropping values the API should never receive:
 * undefined, null, empty / whitespace-only strings and non-finite numbers.
 * Strings are trimmed. `false` and `0` are kept because they are meaningful values.
 */
export type QueryParamValue = string | number | boolean | null | undefined;

export const buildQueryParams = (
  params?: Record<string, QueryParamValue>
): Record<string, string | number | boolean> => {
  const result: Record<string, string | number | boolean> = {};
  if (!params) return result;

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) result[key] = trimmed;
      continue;
    }
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    result[key] = value;
  }

  return result;
};
