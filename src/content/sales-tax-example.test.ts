import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateOrder } from "../domain/calculator";
import { DEFAULT_US_CONTEXT } from "../domain/types";

const baseInput = {
  context: { ...DEFAULT_US_CONTEXT },
  listings: [{ unitListPriceCents: 3000, quantity: 1, unitCogsCents: 1000 }],
  discount: { kind: "none" as const },
  shippingChargedCents: 600,
  personalizationCents: 0,
  giftWrapCents: 0,
  attribution: "none" as const,
  costs: {
    fulfillmentShipping: { amountCents: 500, billingChannel: "external" as const },
    packaging: { amountCents: 100, billingChannel: "external" as const },
  },
};

describe("published G7 sales-tax example", () => {
  it("keeps buyer sales tax out of revenue and transaction fees", () => {
    const taxed = calculateOrder({ ...baseInput, salesTaxCents: 240 });
    const untaxed = calculateOrder({ ...baseInput, salesTaxCents: 0 });
    expect(taxed.ok).toBe(true);
    expect(untaxed.ok).toBe(true);
    if (!taxed.ok || !untaxed.ok) throw new Error("Expected valid example inputs");

    expect(taxed.value.amounts.sellerOrderRevenueCents).toBe(3600);
    expect(taxed.value.transactionFeeCents).toBe(234);
    expect(taxed.value.paymentProcessingFeeCents).toBe(140);
    expect(taxed.value.unitEconomics.listingFeeCents).toBe(20);
    expect(taxed.value.unitEconomics.netEtsyMarketplaceFeesCents).toBe(394);
    expect(taxed.value.unitEconomics.contributionProfitCents).toBe(1606);
    expect(untaxed.value.unitEconomics.contributionProfitCents).toBe(1613);

    const html = readFileSync("guides/etsy-seller-fees-sales-tax/index.html", "utf8");
    for (const [key, value] of Object.entries({ revenue: 3600, tax: 240, transaction: 234, processing: 140, listing: 20, fees: 394, costs: 1600, profit: 1606, noTaxProfit: 1613 })) {
      expect(html).toContain(`data-example-${key}="${value}"`);
    }
  });
});
