import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateOrder } from "../domain/calculator";
import { DEFAULT_US_CONTEXT } from "../domain/types";

const exampleInput = {
  basis: "unit_economics" as const,
  context: { ...DEFAULT_US_CONTEXT },
  listings: [{ unitListPriceCents: 12_000, quantity: 1, unitCogsCents: 4_500 }],
  discount: { kind: "none" as const },
  shippingChargedCents: 1_000,
  salesTaxCents: 0,
  costs: {
    fulfillmentShipping: { amountCents: 1_000, billingChannel: "external" as const },
    packaging: { amountCents: 500, billingChannel: "external" as const },
  },
};

function calculate(attribution: "none" | "offsite_ads_12" | "offsite_ads_15") {
  const result = calculateOrder({
    ...exampleInput,
    attribution,
    eligibility: attribution === "offsite_ads_12" ? { offsiteAds12Confirmed: true } : undefined,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe("published G5 Offsite Ads examples", () => {
  it("reproduces the non-attributed, 15%, and 12% profit comparison", () => {
    const none = calculate("none");
    const fifteen = calculate("offsite_ads_15");
    const twelve = calculate("offsite_ads_12");

    expect(none.amounts.sellerOrderRevenueCents).toBe(13_000);
    expect([none.transactionFeeCents, none.paymentProcessingFeeCents, none.unitEconomics.listingFeeCents]).toEqual([845, 415, 20]);
    expect(none.unitEconomics.netEtsyMarketplaceFeesCents).toBe(1_280);
    expect(none.unitEconomics.operatingCostsCents).toBe(6_000);
    expect(none.unitEconomics.contributionProfitCents).toBe(5_720);
    expect(none.unitEconomics.contributionMargin.basisPoints).toBe(4_400);

    expect(fifteen.offsiteAdsFeeCents).toBe(1_950);
    expect(fifteen.unitEconomics.netEtsyMarketplaceFeesCents).toBe(3_230);
    expect(fifteen.unitEconomics.contributionProfitCents).toBe(3_770);
    expect(fifteen.unitEconomics.contributionMargin.basisPoints).toBe(2_900);

    expect(twelve.offsiteAdsFeeCents).toBe(1_560);
    expect(twelve.unitEconomics.netEtsyMarketplaceFeesCents).toBe(2_840);
    expect(twelve.unitEconomics.contributionProfitCents).toBe(4_160);
    expect(twelve.unitEconomics.contributionMargin.basisPoints).toBe(3_200);
  });

  it("reproduces the $100 per-order cap for both tiers", () => {
    for (const attribution of ["offsite_ads_15", "offsite_ads_12"] as const) {
      const result = calculateOrder({
        ...exampleInput,
        listings: [{ unitListPriceCents: 100_000, quantity: 1, unitCogsCents: 0 }],
        shippingChargedCents: 0,
        costs: {},
        attribution,
        eligibility: attribution === "offsite_ads_12" ? { offsiteAds12Confirmed: true } : undefined,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.error.message);
      expect(result.value.offsiteAdsFeeCents).toBe(10_000);
      expect(result.value.unitEconomics.netEtsyMarketplaceFeesCents).toBe(19_545);
    }
  });

  it("keeps every published engine value in sync with the article", () => {
    const html = readFileSync("guides/etsy-offsite-ads-fees/index.html", "utf8");
    const values = {
      revenue: 13_000,
      baseFees: 1_280,
      noneOffsite: 0,
      costs: 6_000,
      noneProfit: 5_720,
      noneMargin: 4_400,
      fifteenOffsite: 1_950,
      fifteenFees: 3_230,
      fifteenProfit: 3_770,
      fifteenMargin: 2_900,
      twelveOffsite: 1_560,
      twelveFees: 2_840,
      twelveProfit: 4_160,
      twelveMargin: 3_200,
      capRevenue: 100_000,
      fifteenCap: 10_000,
      twelveCap: 10_000,
    };
    for (const [key, value] of Object.entries(values)) {
      expect(html).toContain(`data-example-${key}="${value}"`);
    }
  });
});
