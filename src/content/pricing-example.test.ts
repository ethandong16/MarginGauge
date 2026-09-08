import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateTargetPrice } from "../domain/target-price";
import { calculateOrder } from "../domain/calculator";
import { DEFAULT_US_CONTEXT, type TargetPriceInput } from "../domain/types";

describe("published G3 worked example", () => {
  it("reproduces the published breakdown and rejects the previous cent using the production engine", () => {
    const input: TargetPriceInput = {
      context: { ...DEFAULT_US_CONTEXT }, quantity: 1, unitCogsCents: 500,
      discount: { kind: "none" }, attribution: "none",
      taxScenario: { kind: "no_tax" }, target: { kind: "profit", amountCents: 1000 },
      costs: {
        variableLabor: { amountCents: 300, billingChannel: "external" },
        packaging: { amountCents: 100, billingChannel: "external" },
        fulfillmentShipping: { amountCents: 400, billingChannel: "external" },
      },
    };
    const result = calculateTargetPrice(input);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    const c = result.value.calculation;
    expect(result.value.minimumUnitListPriceCents).toBe(2591);
    expect([c.transactionFeeCents, c.paymentProcessingFeeCents, c.unitEconomics.listingFeeCents]).toEqual([168, 103, 20]);
    expect(c.unitEconomics.contributionProfitCents).toBe(1000);
    expect(c.unitEconomics.operatingCostsCents).toBe(1300);
    expect(c.unitEconomics.contributionMargin.basisPoints).toBe(3860);
    const previous = calculateOrder({ ...input, listings: [{ unitListPriceCents: 2590, quantity: 1, unitCogsCents: 500 }], salesTaxCents: 0 });
    if (!previous.ok) throw new Error(previous.error.message);
    expect(previous.value.unitEconomics.contributionProfitCents).toBe(999);
    const html = readFileSync("guides/how-to-price-etsy-products/index.html", "utf8");
    for (const [key, value] of Object.entries({price:2591,transaction:168,processing:103,listing:20,costs:1300,fees:291,profit:1000,margin:3860,previousProfit:999})) {
      expect(html).toContain(`data-example-${key}="${value}"`);
    }
    for (const amount of ["$25.91", "$1.68", "$1.03", "$0.20", "$13.00", "$2.91", "$10.00", "38.60%", "$9.99"]) expect(html).toContain(amount);
  });
});
