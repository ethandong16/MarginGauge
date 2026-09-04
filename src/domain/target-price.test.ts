import { describe, expect, it } from "vitest";

import { calculateOrder } from "./calculator";
import { compareRateTarget, multiplyRate } from "./money";
import { calculateTargetPrice, TARGET_PRICE_CAP_CENTS } from "./target-price";
import { DEFAULT_US_CONTEXT } from "./types";
import type {
  OrderCalculationInput,
  TargetDefinition,
  TargetPriceInput,
} from "./types";

function baseTarget(overrides: Partial<TargetPriceInput> = {}): TargetPriceInput {
  return {
    context: { ...DEFAULT_US_CONTEXT },
    quantity: 1,
    unitCogsCents: 500,
    discount: { kind: "none" },
    taxScenario: { kind: "no_tax" },
    target: { kind: "profit", amountCents: 1_000 },
    attribution: "none",
    ...overrides,
  };
}

function minimum(input: TargetPriceInput, cap?: number): number {
  const result = calculateTargetPrice(input, cap === undefined ? {} : { maxUnitPriceCents: cap });
  if (!result.ok) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }
  return result.value.minimumUnitListPriceCents;
}

describe("target-price frozen fixtures", () => {
  it("T01 finds the minimum cent for a target contribution profit", () => {
    const result = calculateTargetPrice(baseTarget());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.minimumUnitListPriceCents).toBe(1_707);
      expect(result.value.calculation.unitEconomics.contributionProfitCents).toBe(1_000);
      expect(result.value.previousUnitPriceMeetsTarget).toBe(false);
    }
  });

  it("T02 finds the minimum cent for a target margin", () => {
    expect(
      minimum(
        baseTarget({
          unitCogsCents: 1_000,
          target: { kind: "margin", ratePpm: 400_000 },
        }),
      ),
    ).toBe(2_069);
  });

  it("T03 returns the pre-discount unit price for a percentage discount", () => {
    expect(
      minimum(baseTarget({ discount: { kind: "percentage", ratePpm: 100_000 } })),
    ).toBe(1_897);
  });

  it("T04 includes the user-selected effective tax scenario in P", () => {
    expect(
      minimum(
        baseTarget({ taxScenario: { kind: "custom_effective_rate_on_r", ratePpm: 100_000 } }),
      ),
    ).toBe(1_712);
  });

  it("T05 includes an attributed 15% Offsite Ads fee", () => {
    expect(minimum(baseTarget({ attribution: "offsite_ads_15" }))).toBe(2_046);
  });

  it("T06 treats the profit target as an order target when quantity is greater than one", () => {
    expect(
      minimum(
        baseTarget({
          quantity: 2,
          unitCogsCents: 500,
          target: { kind: "profit", amountCents: 2_000 },
        }),
      ),
    ).toBe(1_694);
  });

  it("T07 searches from the first price where a fixed discount is valid", () => {
    expect(
      minimum(baseTarget({ discount: { kind: "fixed", amountCents: 500 } })),
    ).toBe(2_207);
  });

  it("T08-T09 reports that no value under the frozen cap satisfies the target", () => {
    const margin = calculateTargetPrice(
      baseTarget({ target: { kind: "margin", ratePpm: 990_000 } }),
    );
    const profit = calculateTargetPrice(
      baseTarget({ target: { kind: "profit", amountCents: 100_000_000 } }),
    );
    for (const result of [margin, profit]) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NO_VALID_PRICE_WITHIN_CAP");
        expect(result.error.details?.maxUnitPriceCents).toBe(TARGET_PRICE_CAP_CENTS);
      }
    }
  });

  it("T10 requires an explicit tax scenario", () => {
    const result = calculateTargetPrice(baseTarget({ taxScenario: undefined }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TAX_SCENARIO_REQUIRED");
    }
  });

  it("requires exactly one target", () => {
    const missing = calculateTargetPrice(baseTarget({ target: undefined }));
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.error.code).toBe("TARGET_REQUIRED");
    }

    const malformed = baseTarget() as TargetPriceInput & {
      targetProfitCents: number;
      targetMarginRatePpm: number;
    };
    malformed.targetProfitCents = 100;
    malformed.targetMarginRatePpm = 200_000;
    const multiple = calculateTargetPrice(malformed);
    expect(multiple.ok).toBe(false);
    if (!multiple.ok) {
      expect(multiple.error.code).toBe("MULTIPLE_TARGETS");
    }
  });

  it("T11 rejects unsupported target inputs rather than ignoring them", () => {
    const coupon = calculateTargetPrice(baseTarget({ etsyFundedCouponCents: 100 }));
    const gross = calculateTargetPrice(
      baseTarget({ paymentProcessingGrossOverrideCents: 2_000 }),
    );
    for (const result of [coupon, gross]) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("UNSUPPORTED_TARGET_SCENARIO");
      }
    }
  });

  it("validates malformed unsupported inputs before classifying their scenario", () => {
    const coupon = calculateTargetPrice(baseTarget({ etsyFundedCouponCents: -1 }));
    const gross = calculateTargetPrice(
      baseTarget({ paymentProcessingGrossOverrideCents: Number.NaN }),
    );
    for (const result of [coupon, gross]) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    }
  });

  it("rejects invalid quantities, money, and rates with typed validation issues", () => {
    const inputs = [
      baseTarget({ quantity: 0 }),
      baseTarget({ quantity: 1.5 }),
      baseTarget({ unitCogsCents: 1.25 }),
      baseTarget({ discount: { kind: "percentage", ratePpm: 1_000_000 } }),
      baseTarget({ target: { kind: "margin", ratePpm: 1_000_000 } }),
      baseTarget({ taxScenario: { kind: "custom_effective_rate_on_r", ratePpm: -1 } }),
    ];
    for (const input of inputs) {
      const result = calculateTargetPrice(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    }
  });

  it("rejects impossible Share & Save eligibility dates", () => {
    const result = calculateTargetPrice(
      baseTarget({
        attribution: "share_save_intro_6_5",
        eligibility: {
          shareSaveIntroConfirmed: true,
          shareSaveIntroEndsOn: "2026-02-30",
        },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.issues?.some((issue) => issue.code === "INVALID_DATE")).toBe(true);
    }
  });
});

function bruteForceMinimum(input: TargetPriceInput, capCents: number): number | null {
  const target = input.target as TargetDefinition;
  for (let price = 1; price <= capCents; price += 1) {
    const merchandise = price * input.quantity;
    const discount =
      input.discount.kind === "fixed"
        ? input.discount.amountCents
        : input.discount.kind === "percentage"
          ? multiplyRate(merchandise, input.discount.ratePpm)
          : 0;
    const revenue =
      merchandise -
      discount +
      (input.personalizationCents ?? 0) +
      (input.shippingChargedCents ?? 0) +
      (input.giftWrapCents ?? 0);
    if (discount > merchandise + (input.personalizationCents ?? 0) || revenue <= 0) {
      continue;
    }
    const tax =
      input.taxScenario?.kind === "custom_effective_rate_on_r"
        ? multiplyRate(revenue, input.taxScenario.ratePpm)
        : 0;
    const order: OrderCalculationInput = {
      basis: "unit_economics",
      context: input.context,
      listings: [
        {
          unitListPriceCents: price,
          quantity: input.quantity,
          unitCogsCents: input.unitCogsCents,
        },
      ],
      discount: input.discount,
      personalizationCents: input.personalizationCents,
      shippingChargedCents: input.shippingChargedCents,
      giftWrapCents: input.giftWrapCents,
      salesTaxCents: tax,
      etsyFundedCouponCents: 0,
      attribution: input.attribution,
      eligibility: input.eligibility,
      costs: input.costs,
      etsyAds: input.etsyAds,
      manualAdjustments: input.manualAdjustments,
    };
    const result = calculateOrder(order);
    if (!result.ok) {
      throw new Error(`Oracle calculation failed: ${result.error.code}`);
    }
    const profit = result.value.unitEconomics.contributionProfitCents;
    const meets =
      target.kind === "profit"
        ? profit >= target.amountCents
        : compareRateTarget(profit, revenue, target.ratePpm);
    if (meets) {
      return price;
    }
  }
  return null;
}

describe("exact global-minimum search", () => {
  it("does not assume adjacent profit is monotone", () => {
    const result = calculateTargetPrice(
      baseTarget({
        unitCogsCents: 0,
        attribution: "offsite_ads_15",
        target: { kind: "profit", amountCents: 0 },
      }),
      { maxUnitPriceCents: 100 },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.minimumUnitListPriceCents).toBe(
        bruteForceMinimum(
          baseTarget({
            unitCogsCents: 0,
            attribution: "offsite_ads_15",
            target: { kind: "profit", amountCents: 0 },
          }),
          100,
        ),
      );
    }
  });

  it("T12 matches a cent-by-cent oracle across deterministic varied scenarios", () => {
    let state = 0x4d4b2026;
    const random = (max: number): number => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state % max;
    };

    for (let index = 0; index < 30; index += 1) {
      const quantity = 1 + random(4);
      const percentageDiscount = random(2) === 1;
      const tax = random(2) === 1;
      const attribution = (["none", "offsite_ads_15", "share_save_4"] as const)[random(3)];
      const input = baseTarget({
        quantity,
        unitCogsCents: random(120),
        personalizationCents: random(20),
        shippingChargedCents: random(30),
        discount: percentageDiscount
          ? { kind: "percentage", ratePpm: random(5) * 25_000 }
          : { kind: "fixed", amountCents: random(40) },
        taxScenario: tax
          ? { kind: "custom_effective_rate_on_r", ratePpm: random(6) * 20_000 }
          : { kind: "no_tax" },
        attribution,
        target: { kind: "profit", amountCents: random(120) },
        costs: {
          packaging: { amountCents: random(30), billingChannel: "external" },
        },
      });
      const oracle = bruteForceMinimum(input, 500);
      const result = calculateTargetPrice(input, { maxUnitPriceCents: 500 });
      if (oracle === null) {
        expect(result.ok, `scenario ${index}`).toBe(false);
        if (!result.ok) {
          expect(result.error.code, `scenario ${index}`).toBe("NO_VALID_PRICE_WITHIN_CAP");
        }
      } else {
        expect(result.ok, `scenario ${index}`).toBe(true);
        if (result.ok) {
          expect(result.value.minimumUnitListPriceCents, `scenario ${index}`).toBe(oracle);
        }
      }
    }
  });
});
