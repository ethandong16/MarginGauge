export type Cents = number;
export type RatePpm = number;

export const RATE_SCALE: RatePpm = 1_000_000;
export const PERCENT_DISPLAY_SCALE = 10_000;

function toSafeNumber(value: bigint, operation: string): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) {
    throw new RangeError(`${operation} exceeded the safe integer range.`);
  }
  return result;
}

/** Rounds ties away from zero. Fee inputs are non-negative; negative support keeps ratios symmetric. */
export function roundHalfUpFraction(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new RangeError("The rounding denominator must be positive.");
  }

  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  let quotient = absolute / denominator;
  const remainder = absolute % denominator;

  if (remainder * 2n >= denominator) {
    quotient += 1n;
  }

  return quotient * sign;
}

export function multiplyRate(cents: Cents, ratePpm: RatePpm): Cents {
  return toSafeNumber(
    roundHalfUpFraction(BigInt(cents) * BigInt(ratePpm), BigInt(RATE_SCALE)),
    "Rate multiplication",
  );
}

/** Applies multiple official factors, then rounds once at the end. */
export function multiplyRateFactors(cents: Cents, rateFactorsPpm: readonly RatePpm[]): Cents {
  let numerator = BigInt(cents);
  let denominator = 1n;

  for (const factor of rateFactorsPpm) {
    numerator *= BigInt(factor);
    denominator *= BigInt(RATE_SCALE);
  }

  return toSafeNumber(roundHalfUpFraction(numerator, denominator), "Compound rate multiplication");
}

export function divideCents(cents: Cents, divisor: number): Cents {
  return toSafeNumber(
    roundHalfUpFraction(BigInt(cents), BigInt(divisor)),
    "Cent division",
  );
}

/** Returns hundredths of one percentage point (10_000 = 100.00%). */
export function ratioToBasisPoints(numerator: Cents, denominator: Cents): number | null {
  if (denominator <= 0) {
    return null;
  }

  return toSafeNumber(
    roundHalfUpFraction(
      BigInt(numerator) * BigInt(PERCENT_DISPLAY_SCALE),
      BigInt(denominator),
    ),
    "Ratio conversion",
  );
}

export function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

export function sumSafe(values: readonly number[], operation = "Sum"): number {
  let total = 0n;
  for (const value of values) {
    total += BigInt(value);
  }
  return toSafeNumber(total, operation);
}

export function multiplySafe(left: number, right: number, operation = "Multiplication"): number {
  return toSafeNumber(BigInt(left) * BigInt(right), operation);
}

export function ceilDividePositive(numerator: bigint, denominator: bigint): bigint {
  if (numerator <= 0n) {
    return 0n;
  }
  if (denominator <= 0n) {
    throw new RangeError("The ceiling division denominator must be positive.");
  }
  return (numerator + denominator - 1n) / denominator;
}

export function compareRateTarget(
  numeratorCents: Cents,
  denominatorCents: Cents,
  targetRatePpm: RatePpm,
): boolean {
  return (
    BigInt(numeratorCents) * BigInt(RATE_SCALE) >=
    BigInt(denominatorCents) * BigInt(targetRatePpm)
  );
}
