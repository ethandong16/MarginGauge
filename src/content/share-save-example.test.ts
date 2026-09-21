import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateOrder } from "../domain/calculator";
import { DEFAULT_US_CONTEXT, type Attribution } from "../domain/types";

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

function calculate(attribution: Attribution) {
  const result = calculateOrder({
    ...exampleInput,
    attribution,
    eligibility:
      attribution === "offsite_ads_12"
        ? { offsiteAds12Confirmed: true }
        : attribution === "share_save_intro_6_5"
          ? { shareSaveIntroConfirmed: true, shareSaveIntroEndsOn: "2026-09-30" }
          : undefined,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe("published G6 Share & Save comparison", () => {
  it("reproduces the ordinary, Share & Save, and Offsite Ads outcomes", () => {
    const none = calculate("none");
    const share = calculate("share_save_4");
    const intro = calculate("share_save_intro_6_5");
    const fifteen = calculate("offsite_ads_15");
    const twelve = calculate("offsite_ads_12");

    expect(none.amounts.sellerOrderRevenueCents).toBe(13_000);
    expect(none.unitEconomics.netEtsyMarketplaceFeesCents).toBe(1_280);
    expect(none.unitEconomics.operatingCostsCents).toBe(6_000);
    expect(none.unitEconomics.contributionProfitCents).toBe(5_720);

    expect(share.shareSaveCreditCents).toBe(520);
    expect(share.unitEconomics.netEtsyMarketplaceFeesCents).toBe(760);
    expect(share.unitEconomics.contributionProfitCents).toBe(6_240);
    expect(share.unitEconomics.contributionMargin.basisPoints).toBe(4_800);

    expect(intro.shareSaveCreditCents).toBe(845);
    expect(intro.unitEconomics.netEtsyMarketplaceFeesCents).toBe(435);
    expect(intro.unitEconomics.contributionProfitCents).toBe(6_565);
    expect(intro.unitEconomics.contributionMargin.basisPoints).toBe(5_050);

    expect(fifteen.offsiteAdsFeeCents).toBe(1_950);
    expect(fifteen.unitEconomics.contributionProfitCents).toBe(3_770);
    expect(twelve.offsiteAdsFeeCents).toBe(1_560);
    expect(twelve.unitEconomics.contributionProfitCents).toBe(4_160);
  });

  it("keeps every published engine value in sync with the article", () => {
    const html = readFileSync("guides/etsy-share-save-vs-offsite-ads/index.html", "utf8");
    const values = {
      revenue: 13_000,
      baseFees: 1_280,
      costs: 6_000,
      noneProfit: 5_720,
      shareCredit: 520,
      shareFees: 760,
      shareProfit: 6_240,
      shareMargin: 4_800,
      introCredit: 845,
      introFees: 435,
      introProfit: 6_565,
      introMargin: 5_050,
      fifteenFee: 1_950,
      fifteenProfit: 3_770,
      twelveFee: 1_560,
      twelveProfit: 4_160,
    };
    for (const [key, value] of Object.entries(values)) {
      expect(html).toContain(`data-example-${key}="${value}"`);
    }
  });
});
