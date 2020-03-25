/**
 *
 * @param n
 * @returns true on finite values, false on Infinity
 *          returns false on anything that is not convertible to a number (when not a number type), see isConvertibleToNumber
 */
export function isNumber(n: number): boolean {
  return Number.isFinite(n);
}

/**
 *
 * @param n
 * @returns true on: empty string, booleans, null, finite number values and +/- Infinity
 *          false on: everything else -> objects, non-empty string, undefined, NaN (obviously)
 */
export function isConvertibleToNumber(n: any): boolean {
  return !isNaN(n);
}

/**
 *
 * @param n
 * @returns a finite number or +/- Infinity (if n was that value)
 * @throws error when value is not convertible to a number
 */
export function toNumber(n: any): number {
  if (isConvertibleToNumber(n)) {
    return Number(n);
  }
  throw new Error('Value does not convert to number: ' + n);
}
