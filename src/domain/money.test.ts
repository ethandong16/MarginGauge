import { describe, expect, it } from "vitest";

import {
  divideCents,
  multiplyRate,
  multiplyRateFactors,
  ratioToBasisPoints,
  roundHalfUpFraction,
} from "./money";

describe("integer money primitives", () => {
  it("rounds positive and negative ties half-up", () => {
    expect(roundHalfUpFraction(5n, 2n)).toBe(3n);
    expect(roundHalfUpFraction(4n, 2n)).toBe(2n);
    expect(roundHalfUpFraction(-5n, 2n)).toBe(-3n);
  });

  it("calculates fees using integer ppm rates", () => {
    expect(multiplyRate(99, 65_000)).toBe(6);
    expect(multiplyRate(100, 65_000)).toBe(7);
    expect(multiplyRate(1_005, 150_000)).toBe(151);
  });

  it("rounds compound Texas factors only once", () => {
    expect(multiplyRateFactors(10, [800_000, 62_500])).toBe(1);
    expect(multiplyRateFactors(650, [800_000, 62_500])).toBe(33);
  });

  it("returns display basis points without floating arithmetic", () => {
    expect(ratioToBasisPoints(1_265, 2_000)).toBe(6_325);
    expect(ratioToBasisPoints(-340, 1_000)).toBe(-3_400);
    expect(ratioToBasisPoints(1, 0)).toBeNull();
    expect(divideCents(2_428, 3)).toBe(809);
  });
});
