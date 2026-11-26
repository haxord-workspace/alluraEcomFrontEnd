/**
 * Reads a numeric value from an API response.
 * Money fields may arrive as a number, a numeric string ("4000.00"), or a MongoDB
 * Decimal128 serialised as { "$numberDecimal": "4000" }. Anything else is undefined.
 */
export const toNumber = (value: any): number | undefined => {
  if (typeof value === 'number') return Number.isNaN(value) ? undefined : value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  if (value && typeof value === 'object') {
    if ('$numberDecimal' in value) return toNumber(value.$numberDecimal);
    if ('$numberInt' in value) return toNumber(value.$numberInt);
    if ('$numberDouble' in value) return toNumber(value.$numberDouble);
  }
  return undefined;
};

/** First value in the list that reads as a number */
export const firstNumber = (...values: any[]): number | undefined => {
  for (const v of values) {
    const n = toNumber(v);
    if (n !== undefined) return n;
  }
  return undefined;
};
