import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateTargetPrice } from "../domain/target-price";
import { DEFAULT_US_CONTEXT, type Attribution, type TargetPriceInput } from "../domain/types";

const baseInput: Omit<TargetPriceInput, "attribution" | "eligibility"> = {
  context: { ...DEFAULT_US_CONTEXT },
  quantity: 1,
  unitCogsCents: 450,
  discount: { kind: "none" },
  shippingChargedCents: 1000,
  taxScenario: { kind: "no_tax" },
  target: { kind: "profit", amountCents: 1000 },
  costs: {
    fulfillmentShipping: { amountCents: 1000, billingChannel: "external" },
    packaging: { amountCents: 500, billingChannel: "external" },
  },
};

function calculate(attribution: Attribution) {
  const result = calculateTargetPrice({
    ...baseInput,
    attribution,
    eligibility: attribution === "offsite_ads_12" ? { offsiteAds12Confirmed: true } : undefined,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe("published G8 Offsite Ads pricing example", () => {
  it("reproduces minimum prices for no attribution and both Offsite Ads tiers", () => {
    const none = calculate("none");
    const fifteen = calculate("offsite_ads_15");
    const twelve = calculate("offsite_ads_12");

    expect(none.minimumUnitListPriceCents).toBe(2309);
    expect(fifteen.minimumUnitListPriceCents).toBe(2967);
    expect(twelve.minimumUnitListPriceCents).toBe(2815);
    expect(fifteen.calculation.offsiteAdsFeeCents).toBe(595);
    expect(twelve.calculation.offsiteAdsFeeCents).toBe(458);
    expect(none.calculation.unitEconomics.contributionProfitCents).toBe(1000);
    expect(fifteen.calculation.unitEconomics.contributionProfitCents).toBe(1000);
    expect(twelve.calculation.unitEconomics.contributionProfitCents).toBe(1000);

    const html = readFileSync("guides/etsy-offsite-ads-pricing/index.html", "utf8");
    for (const [key, value] of Object.entries({ nonePrice: 2309, fifteenPrice: 2967, twelvePrice: 2815, fifteenFee: 595, twelveFee: 458 })) {
      expect(html).toContain(`data-example-${key}="${value}"`);
    }
  });
});
