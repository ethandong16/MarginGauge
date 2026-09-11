import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateOrder } from "../domain/calculator";
import { DEFAULT_US_CONTEXT } from "../domain/types";

const baseInput = {
  context: { ...DEFAULT_US_CONTEXT },
  listings: [{ unitListPriceCents: 3000, quantity: 1, unitCogsCents: 1000 }],
  discount: { kind: "none" as const },
  personalizationCents: 0,
  giftWrapCents: 0,
  salesTaxCents: 0,
  attribution: "none" as const,
  costs: {
    fulfillmentShipping: { amountCents: 500, billingChannel: "external" as const },
    packaging: { amountCents: 100, billingChannel: "external" as const },
  },
};

describe("published G4 worked example", () => {
  it("reproduces buyer-paid shipping and free-shipping scenarios", () => {
    const charged = calculateOrder({ ...baseInput, shippingChargedCents: 600 });
    expect(charged.ok).toBe(true);
    if (!charged.ok) throw new Error(charged.error.message);
    expect(charged.value.amounts.sellerOrderRevenueCents).toBe(3600);
    expect([charged.value.transactionFeeCents, charged.value.paymentProcessingFeeCents, charged.value.unitEconomics.listingFeeCents]).toEqual([234, 133, 20]);
    expect(charged.value.unitEconomics.netEtsyMarketplaceFeesCents).toBe(387);
    expect(charged.value.unitEconomics.operatingCostsCents).toBe(1600);
    expect(charged.value.unitEconomics.contributionProfitCents).toBe(1613);
    expect(charged.value.unitEconomics.contributionMargin.basisPoints).toBe(4481);

    const free = calculateOrder({ ...baseInput, shippingChargedCents: 0 });
    expect(free.ok).toBe(true);
    if (!free.ok) throw new Error(free.error.message);
    expect(free.value.unitEconomics.netEtsyMarketplaceFeesCents).toBe(330);
    expect(free.value.unitEconomics.contributionProfitCents).toBe(1070);
    expect(free.value.unitEconomics.contributionMargin.basisPoints).toBe(3567);

    const html = readFileSync("guides/etsy-fees-on-shipping/index.html", "utf8");
    for (const [key, value] of Object.entries({ revenue: 3600, transaction: 234, processing: 133, listing: 20, fees: 387, costs: 1600, profit: 1613, margin: 4481, freeProfit: 1070 })) {
      expect(html).toContain(`data-example-${key}="${value}"`);
    }
    for (const amount of ["$36.00", "$2.34", "$1.33", "$0.20", "$3.87", "$16.00", "$16.13", "44.81%", "$10.70"]) {
      expect(html).toContain(amount);
    }
  });
});
