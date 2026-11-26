const INR_NUMBER = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * The one money formatter: "₹ 2,000.00", Indian digit grouping ("₹ 12,34,567.00"),
 * always 2 decimals and one space after the symbol. Negative amounts become "-₹ 300.00".
 * Non-numeric input is treated as 0 so a bad API value never prints "NaN".
 */
export const formatINR = (amount: number | string | null | undefined): string => {
  const value = Number(amount);
  const safe = Number.isFinite(value) ? value : 0;
  const body = `₹ ${INR_NUMBER.format(Math.abs(safe))}`;
  // Compare the rounded paise so -0.001 doesn't print as "-₹ 0.00"
  return Math.round(safe * 100) < 0 ? `-${body}` : body;
};

/** A deduction: always shown with a leading minus, e.g. "-₹ 300.00" */
export const formatINRDeduction = (amount: number | string | null | undefined): string =>
  formatINR(-Math.abs(Number(amount) || 0));
