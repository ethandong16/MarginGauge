import { describe, expect, it } from "vitest";

import { calculateOrder } from "./calculator";
import { DEFAULT_US_CONTEXT } from "./types";
import type { OrderCalculation, OrderCalculationInput } from "./types";

function baseOrder(overrides: Partial<OrderCalculationInput> = {}): OrderCalculationInput {
  return {
    basis: "unit_economics",
    context: { ...DEFAULT_US_CONTEXT },
    listings: [{ unitListPriceCents: 2_000, quantity: 1, unitCogsCents: 500 }],
    discount: { kind: "none" },
    salesTaxCents: 0,
    attribution: "none",
    ...overrides,
  };
}

function value(input: OrderCalculationInput): OrderCalculation {
  const result = calculateOrder(input);
  if (!result.ok) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }
  return result.value;
}

describe("order calculation fixtures", () => {
  it("C01 calculates contribution metrics", () => {
    const result = value(baseOrder());
    expect(result.transactionFeeCents).toBe(130);
    expect(result.paymentProcessingFeeCents).toBe(85);
    expect(result.unitEconomics.listingFeeCents).toBe(20);
    expect(result.unitEconomics.netEtsyMarketplaceFeesCents).toBe(235);
    expect(result.unitEconomics.contributionProfitCents).toBe(1_265);
    expect(result.unitEconomics.contributionMargin.basisPoints).toBe(6_325);
    expect(result.unitEconomics.contributionRoi.basisPoints).toBe(17_211);
    expect(result.unitEconomics.effectiveEtsyFeeRate.basisPoints).toBe(1_175);
  });

  it("C02 includes sales tax only in the processing base", () => {
    const result = value(
      baseOrder({
        listings: [{ unitListPriceCents: 4_500, quantity: 1, unitCogsCents: 1_800 }],
        salesTaxCents: 360,
      }),
    );
    expect(result.transactionFeeCents).toBe(293);
    expect(result.paymentProcessingFeeCents).toBe(171);
    expect(result.amounts.paymentProcessingGrossCents).toBe(4_860);
    expect(result.unitEconomics.contributionProfitCents).toBe(2_216);
  });

  it("C03 handles a three-item mixed basket", () => {
    const result = value(
      baseOrder({
        listings: [
          { unitListPriceCents: 2_000, quantity: 1, unitCogsCents: 1_000 },
          { unitListPriceCents: 1_500, quantity: 2, unitCogsCents: 500 },
        ],
        salesTaxCents: 400,
      }),
    );
    expect(result.amounts.sellerOrderRevenueCents).toBe(5_000);
    expect(result.unitEconomics.listingFeeCents).toBe(60);
    expect(result.unitEconomics.netEtsyMarketplaceFeesCents).toBe(572);
    expect(result.unitEconomics.contributionProfitCents).toBe(2_428);
    expect(result.unitEconomics.averageProfitPerItemCents).toBe(809);
  });

  it("C04 applies a fixed seller-funded merchandise discount", () => {
    const result = value(
      baseOrder({
        listings: [{ unitListPriceCents: 5_000, quantity: 1, unitCogsCents: 1_500 }],
        discount: { kind: "fixed", amountCents: 1_000 },
        salesTaxCents: 320,
      }),
    );
    expect(result.amounts.sellerFundedDiscountCents).toBe(1_000);
    expect(result.amounts.sellerOrderRevenueCents).toBe(4_000);
    expect(result.unitEconomics.netEtsyMarketplaceFeesCents).toBe(435);
    expect(result.unitEconomics.contributionProfitCents).toBe(2_065);
    expect(result.assumptions.some((assumption) => assumption.includes("M + U") || assumption.includes("merchandise plus personalization"))).toBe(true);
  });

  it("C05-C06 keeps an Etsy-funded coupon out of R and P but removes it from Share & Save base", () => {
    const withoutShare = value(
      baseOrder({
        listings: [{ unitListPriceCents: 5_000, quantity: 1, unitCogsCents: 1_500 }],
        etsyFundedCouponCents: 1_000,
        salesTaxCents: 400,
      }),
    );
    expect(withoutShare.amounts.sellerOrderRevenueCents).toBe(5_000);
    expect(withoutShare.amounts.buyerCheckoutTotalCents).toBe(4_400);
    expect(withoutShare.amounts.paymentProcessingGrossCents).toBe(5_400);
    expect(withoutShare.unitEconomics.netEtsyMarketplaceFeesCents).toBe(532);

    const withShare = value(
      baseOrder({
        listings: [{ unitListPriceCents: 5_000, quantity: 1, unitCogsCents: 1_500 }],
        etsyFundedCouponCents: 1_000,
        salesTaxCents: 400,
        attribution: "share_save_4",
      }),
    );
    expect(withShare.shareSaveCreditCents).toBe(160);
    expect(withShare.unitEconomics.netEtsyMarketplaceFeesCents).toBe(372);
    expect(withShare.unitEconomics.contributionProfitCents).toBe(3_128);
  });

  it("C07 applies a 15% Offsite Ads fee", () => {
    const result = value(
      baseOrder({
        listings: [{ unitListPriceCents: 9_000, quantity: 1, unitCogsCents: 4_000 }],
        salesTaxCents: 720,
        attribution: "offsite_ads_15",
      }),
    );
    expect(result.offsiteAdsFeeCents).toBe(1_350);
    expect(result.unitEconomics.netEtsyMarketplaceFeesCents).toBe(2_272);
    expect(result.unitEconomics.contributionProfitCents).toBe(2_728);
  });

  it("C08 caps a 12% Offsite Ads fee at $100", () => {
    const result = value(
      baseOrder({
        listings: [{ unitListPriceCents: 100_000, quantity: 1, unitCogsCents: 50_000 }],
        salesTaxCents: 8_000,
        attribution: "offsite_ads_12",
        eligibility: { offsiteAds12Confirmed: true },
      }),
    );
    expect(result.offsiteAdsFeeCents).toBe(10_000);
    expect(result.unitEconomics.netEtsyMarketplaceFeesCents).toBe(19_785);
    expect(result.unitEconomics.contributionProfitCents).toBe(30_215);
  });

  it("C09 calculates Texas tax from the rounded transaction fee", () => {
    const result = value(
      baseOrder({
        context: { ...DEFAULT_US_CONTEXT, sellerState: "TX" },
        listings: [{ unitListPriceCents: 10_000, quantity: 1, unitCogsCents: 5_000 }],
        salesTaxCents: 800,
      }),
    );
    expect(result.transactionFeeCents).toBe(650);
    expect(result.texasSellerFeeTaxCents).toBe(33);
    expect(result.unitEconomics.netEtsyMarketplaceFeesCents).toBe(1_052);
    expect(result.unitEconomics.contributionProfitCents).toBe(3_948);
  });

  it("C10 deducts allocated Etsy Ads from contribution, not the Etsy fee rate", () => {
    const result = value(
      baseOrder({
        listings: [{ unitListPriceCents: 3_000, quantity: 1, unitCogsCents: 1_200 }],
        salesTaxCents: 240,
        etsyAds: { allocatedCents: 450 },
      }),
    );
    expect(result.unitEconomics.netEtsyMarketplaceFeesCents).toBe(337);
    expect(result.unitEconomics.marketingSpendCents).toBe(450);
    expect(result.unitEconomics.contributionProfitCents).toBe(1_013);
    expect(result.unitEconomics.effectiveEtsyFeeRate.basisPoints).toBe(1_123);
  });

  it("C11 preserves a negative profit and margin", () => {
    const result = value(
      baseOrder({
        listings: [{ unitListPriceCents: 1_000, quantity: 1, unitCogsCents: 1_200 }],
      }),
    );
    expect(result.unitEconomics.contributionProfitCents).toBe(-340);
    expect(result.unitEconomics.contributionMargin.basisPoints).toBe(-3_400);
  });
});

describe("Payment Account statement estimate", () => {
  it("C12 separates statement listing events from unit allocation", () => {
    const result = value(
      baseOrder({
        basis: "statement_estimate",
        listings: [
          {
            unitListPriceCents: 2_000,
            quantity: 1,
            unitCogsCents: 0,
            statement: {
              listingType: "standard",
              initialListingFeePaid: true,
              inventoryAfterSale: "sold_out",
            },
          },
        ],
      }),
    );
    expect(result.unitEconomics.listingFeeCents).toBe(20);
    expect(result.statementEstimate?.listingFeeCents).toBe(0);
    expect(result.statementEstimate?.estimatedPaymentAccountChangeCents).toBe(1_785);
    expect(result.primary).toEqual({ kind: "payment_account_change", amountCents: 1_785 });
  });

  it("C13 derives sold-out and remaining-inventory debit counts", () => {
    const listing = {
      unitListPriceCents: 2_000,
      quantity: 3,
      unitCogsCents: 0,
    };
    const soldOut = value(
      baseOrder({
        basis: "statement_estimate",
        listings: [
          {
            ...listing,
            statement: {
              listingType: "standard",
              initialListingFeePaid: true,
              inventoryAfterSale: "sold_out",
            },
          },
        ],
      }),
    );
    const remains = value(
      baseOrder({
        basis: "statement_estimate",
        listings: [
          {
            ...listing,
            statement: {
              listingType: "standard",
              initialListingFeePaid: true,
              inventoryAfterSale: "remains",
            },
          },
        ],
      }),
    );
    expect(soldOut.statementEstimate?.listingFeeCents).toBe(40);
    expect(remains.statementEstimate?.listingFeeCents).toBe(60);
  });

  it("honors an actual listing debit override without changing unit economics", () => {
    const result = value(
      baseOrder({
        basis: "statement_estimate",
        listings: [
          {
            unitListPriceCents: 2_000,
            quantity: 3,
            unitCogsCents: 0,
            statement: { listingType: "private", actualDebitCount: 7 },
          },
        ],
      }),
    );
    expect(result.unitEconomics.listingFeeCents).toBe(60);
    expect(result.statementEstimate?.listingFeeCents).toBe(140);
  });

  it("C14 includes only Etsy-billed fulfillment costs in Payment Account movement", () => {
    const statementListing = {
      unitListPriceCents: 2_000,
      quantity: 1,
      unitCogsCents: 0,
      statement: {
        listingType: "standard" as const,
        initialListingFeePaid: true,
        inventoryAfterSale: "sold_out" as const,
      },
    };
    const etsyBilled = value(
      baseOrder({
        basis: "statement_estimate",
        listings: [statementListing],
        costs: {
          fulfillmentShipping: { amountCents: 500, billingChannel: "etsy_payment_account" },
        },
      }),
    );
    const external = value(
      baseOrder({
        basis: "statement_estimate",
        listings: [statementListing],
        costs: { fulfillmentShipping: { amountCents: 500, billingChannel: "external" } },
      }),
    );
    expect(etsyBilled.unitEconomics.contributionProfitCents).toBe(
      external.unitEconomics.contributionProfitCents,
    );
    expect(etsyBilled.statementEstimate?.estimatedPaymentAccountChangeCents).toBe(
      (external.statementEstimate?.estimatedPaymentAccountChangeCents ?? 0) - 500,
    );
  });

  it("C15 requires actual P for a physical Colorado statement order", () => {
    const input = baseOrder({
      basis: "statement_estimate",
      context: { ...DEFAULT_US_CONTEXT, buyerDestinationState: "CO", productType: "physical" },
      listings: [
        {
          unitListPriceCents: 10_000,
          quantity: 1,
          unitCogsCents: 0,
          statement: {
            listingType: "standard",
            initialListingFeePaid: true,
            inventoryAfterSale: "sold_out",
          },
        },
      ],
      coloradoRetailDeliveryFeeCents: 31,
    });
    const missing = calculateOrder(input);
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.error.code).toBe("PROCESSING_GROSS_REQUIRED");
    }
    const result = value({ ...input, paymentProcessingGrossOverrideCents: 10_031 });
    expect(result.paymentProcessingFeeCents).toBe(326);
  });

  it("keeps manual fee traces complete and projection-specific", () => {
    const result = value(
      baseOrder({
        basis: "statement_estimate",
        listings: [
          {
            unitListPriceCents: 2_000,
            quantity: 1,
            unitCogsCents: 0,
            statement: {
              listingType: "standard",
              initialListingFeePaid: true,
              inventoryAfterSale: "sold_out",
            },
          },
        ],
        manualAdjustments: [
          { kind: "etsy_fee_debit", amountCents: 100, appliesTo: "unit", label: "Unit only" },
          {
            kind: "etsy_fee_credit",
            amountCents: 50,
            appliesTo: "statement",
            label: "Statement only",
          },
          { kind: "etsy_fee_debit", amountCents: 25, appliesTo: "both", label: "Both" },
        ],
      }),
    );
    expect(result.unitEconomics.netEtsyMarketplaceFeesCents).toBe(360);
    expect(result.statementEstimate?.netEtsyStatementFeesCents).toBe(190);

    const unitOnly = result.feeTrace.find((line) => line.label === "Unit only");
    const statementOnly = result.feeTrace.find((line) => line.label === "Statement only");
    const both = result.feeTrace.find((line) => line.label === "Both");
    expect(unitOnly?.projections).toEqual(["unit_economics"]);
    expect(statementOnly?.projections).toEqual(["statement_estimate"]);
    expect(both?.projections).toEqual(["unit_economics", "statement_estimate"]);
    expect(
      result.feeTrace
        .filter((line) => line.projections.includes("statement_estimate"))
        .some((line) => line.label === "Unit only"),
    ).toBe(false);
  });
});

describe("rounding, fee caps, and invariants", () => {
  it("R01-R02 rounds transaction and processing fee lines independently", () => {
    expect(
      value(baseOrder({ listings: [{ unitListPriceCents: 99, quantity: 1, unitCogsCents: 0 }] }))
        .transactionFeeCents,
    ).toBe(6);
    expect(
      value(baseOrder({ listings: [{ unitListPriceCents: 100, quantity: 1, unitCogsCents: 0 }] }))
        .transactionFeeCents,
    ).toBe(7);
    expect(
      value(baseOrder({ listings: [{ unitListPriceCents: 49, quantity: 1, unitCogsCents: 0 }] }))
        .paymentProcessingFeeCents,
    ).toBe(26);
    expect(
      value(baseOrder({ listings: [{ unitListPriceCents: 50, quantity: 1, unitCogsCents: 0 }] }))
        .paymentProcessingFeeCents,
    ).toBe(27);
  });

  it("R03-R04 rounds percentage discount and target-style tax once", () => {
    const discounted = value(
      baseOrder({
        listings: [{ unitListPriceCents: 1_005, quantity: 1, unitCogsCents: 0 }],
        discount: { kind: "percentage", ratePpm: 150_000 },
      }),
    );
    expect(discounted.amounts.sellerFundedDiscountCents).toBe(151);

    const taxed = value(
      baseOrder({
        listings: [{ unitListPriceCents: 10, quantity: 1, unitCogsCents: 0 }],
        salesTaxCents: 1,
      }),
    );
    expect(taxed.amounts.paymentProcessingGrossCents).toBe(11);
  });

  it.each([
    ["offsite_ads_15" as const, 66_663, 9_999],
    ["offsite_ads_15" as const, 66_664, 10_000],
    ["offsite_ads_12" as const, 83_329, 9_999],
    ["offsite_ads_12" as const, 83_330, 10_000],
  ])("R05-R06 enforces the per-order cap for %s at %i cents", (attribution, revenue, fee) => {
    const result = value(
      baseOrder({
        listings: [{ unitListPriceCents: revenue, quantity: 1, unitCogsCents: 0 }],
        attribution,
        eligibility: attribution === "offsite_ads_12" ? { offsiteAds12Confirmed: true } : undefined,
      }),
    );
    expect(result.offsiteAdsFeeCents).toBe(fee);
  });

  it("R07-R08 handles half-cent Texas and Share & Save lines", () => {
    const texas = value(
      baseOrder({
        context: { ...DEFAULT_US_CONTEXT, sellerState: "TX" },
        listings: [{ unitListPriceCents: 154, quantity: 1, unitCogsCents: 0 }],
      }),
    );
    expect(texas.transactionFeeCents).toBe(10);
    expect(texas.texasSellerFeeTaxCents).toBe(1);
    const share = value(
      baseOrder({
        listings: [{ unitListPriceCents: 100, quantity: 1, unitCogsCents: 0 }],
        attribution: "share_save_intro_6_5",
        eligibility: {
          shareSaveIntroConfirmed: true,
          shareSaveIntroEndsOn: "2026-09-10",
        },
      }),
    );
    expect(share.shareSaveCreditCents).toBe(7);
  });

  it("R09 preserves local profit reversals caused by fee rounding", () => {
    const sixteen = value(
      baseOrder({
        listings: [{ unitListPriceCents: 16, quantity: 1, unitCogsCents: 0 }],
        attribution: "offsite_ads_15",
      }),
    );
    const seventeen = value(
      baseOrder({
        listings: [{ unitListPriceCents: 17, quantity: 1, unitCogsCents: 0 }],
        attribution: "offsite_ads_15",
      }),
    );
    expect(sixteen.unitEconomics.contributionProfitCents).toBe(-32);
    expect(seventeen.unitEconomics.contributionProfitCents).toBe(-33);
  });

  it("sales tax changes only processing-related values", () => {
    const untaxed = value(baseOrder({ attribution: "offsite_ads_15" }));
    const taxed = value(baseOrder({ attribution: "offsite_ads_15", salesTaxCents: 500 }));
    expect(taxed.amounts.sellerOrderRevenueCents).toBe(untaxed.amounts.sellerOrderRevenueCents);
    expect(taxed.transactionFeeCents).toBe(untaxed.transactionFeeCents);
    expect(taxed.offsiteAdsFeeCents).toBe(untaxed.offsiteAdsFeeCents);
    expect(taxed.paymentProcessingFeeCents).toBe(untaxed.paymentProcessingFeeCents + 15);
  });

  it("returns N/A ROI when net variable costs are zero or negative", () => {
    const result = value(
      baseOrder({
        listings: [{ unitListPriceCents: 100, quantity: 1, unitCogsCents: 0 }],
        manualAdjustments: [
          { kind: "etsy_fee_credit", amountCents: 55, appliesTo: "unit" },
        ],
      }),
    );
    expect(result.unitEconomics.totalNetVariableCostsCents).toBe(0);
    expect(result.unitEconomics.contributionRoi.basisPoints).toBeNull();

    const negative = value(
      baseOrder({
        listings: [{ unitListPriceCents: 100, quantity: 1, unitCogsCents: 0 }],
        manualAdjustments: [
          { kind: "etsy_fee_credit", amountCents: 56, appliesTo: "unit" },
        ],
      }),
    );
    expect(negative.unitEconomics.totalNetVariableCostsCents).toBe(-1);
    expect(negative.unitEconomics.contributionRoi.basisPoints).toBeNull();
  });
});

describe("validation and unsupported scenarios", () => {
  it.each([
    ["negative cents", baseOrder({ listings: [{ unitListPriceCents: -1, quantity: 1, unitCogsCents: 0 }] })],
    ["fractional cents", baseOrder({ listings: [{ unitListPriceCents: 10.5, quantity: 1, unitCogsCents: 0 }] })],
    ["zero quantity", baseOrder({ listings: [{ unitListPriceCents: 100, quantity: 0, unitCogsCents: 0 }] })],
    ["fractional quantity", baseOrder({ listings: [{ unitListPriceCents: 100, quantity: 1.5, unitCogsCents: 0 }] })],
  ])("rejects %s", (_label, input) => {
    const result = calculateOrder(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("requires an explicit sales-tax receipt amount, including zero", () => {
    const input = baseOrder() as Partial<OrderCalculationInput>;
    delete input.salesTaxCents;
    const result = calculateOrder(input as OrderCalculationInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.issues?.some((issue) => issue.path === "salesTaxCents")).toBe(true);
    }
  });

  it("rejects seller and Etsy-funded discounts together", () => {
    const result = calculateOrder(
      baseOrder({ discount: { kind: "fixed", amountCents: 100 }, etsyFundedCouponCents: 50 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNSUPPORTED_DISCOUNT_COMBINATION");
    }
  });

  it("rejects an Etsy-funded coupon with the unverified 6.5% Share & Save intro base", () => {
    const result = calculateOrder(
      baseOrder({
        attribution: "share_save_intro_6_5",
        etsyFundedCouponCents: 100,
        eligibility: {
          shareSaveIntroConfirmed: true,
          shareSaveIntroEndsOn: "2026-09-10",
        },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNSUPPORTED_DISCOUNT_COMBINATION");
    }
  });

  it("rejects discounts, coupons, and processing gross outside their defined bounds", () => {
    const discount = calculateOrder(
      baseOrder({
        listings: [{ unitListPriceCents: 100, quantity: 1, unitCogsCents: 0 }],
        discount: { kind: "fixed", amountCents: 101 },
      }),
    );
    const coupon = calculateOrder(baseOrder({ etsyFundedCouponCents: 2_001 }));
    const gross = calculateOrder(baseOrder({ paymentProcessingGrossOverrideCents: 1_999 }));
    for (const result of [discount, coupon, gross]) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    }
  });

  it("requires explicit program eligibility", () => {
    const offsite = calculateOrder(baseOrder({ attribution: "offsite_ads_12" }));
    const intro = calculateOrder(baseOrder({ attribution: "share_save_intro_6_5" }));
    for (const result of [offsite, intro]) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    }
  });

  it("treats the Share & Save intro deadline as seller-provided evidence, not a catalog date", () => {
    const result = calculateOrder(
      baseOrder({
        attribution: "share_save_intro_6_5",
        eligibility: {
          shareSaveIntroConfirmed: true,
          shareSaveIntroEndsOn: "2026-08-31",
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.assumptions.some((assumption) => assumption.includes("seller's confirmation"))).toBe(true);
    }
  });

  it("fails closed for context, historical, and nonstandard order scenarios", () => {
    const nonUsd = calculateOrder(
      baseOrder({ context: { ...DEFAULT_US_CONTEXT, listingCurrency: "EUR" } }),
    );
    const historical = calculateOrder(
      baseOrder({ context: { ...DEFAULT_US_CONTEXT, timing: "historical" } }),
    );
    const refund = calculateOrder(
      baseOrder({ context: { ...DEFAULT_US_CONTEXT, orderScenario: "refund" } }),
    );
    expect(!nonUsd.ok && nonUsd.error.code).toBe("UNSUPPORTED_CONTEXT");
    expect(!historical.ok && historical.error.code).toBe("UNSUPPORTED_CONTEXT");
    expect(!refund.ok && refund.error.code).toBe("UNSUPPORTED_ORDER_SCENARIO");
  });

  it("does not infer fees for zero-revenue orders", () => {
    const result = calculateOrder(
      baseOrder({ listings: [{ unitListPriceCents: 0, quantity: 1, unitCogsCents: 0 }] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNSUPPORTED_ZERO_REVENUE");
    }
  });

  it("requires actual debits for ambiguous private multi-item statement listings", () => {
    const result = calculateOrder(
      baseOrder({
        basis: "statement_estimate",
        listings: [
          {
            unitListPriceCents: 1_000,
            quantity: 2,
            unitCogsCents: 0,
            statement: { listingType: "private" },
          },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("pairwise-supported calculation surface", () => {
  it("covers attribution, state, tax, discount, quantity, product, and basis combinations", () => {
    const attributions = [
      "none",
      "offsite_ads_12",
      "offsite_ads_15",
      "share_save_4",
      "share_save_intro_6_5",
    ] as const;
    const states = ["OTHER_US", "TX"] as const;
    const taxes = [0, 800] as const;
    const discounts = [
      { kind: "none" as const },
      { kind: "fixed" as const, amountCents: 100 },
      { kind: "percentage" as const, ratePpm: 100_000 },
    ];
    const quantities = [1, 3] as const;
    const products = ["physical", "digital"] as const;
    const bases = ["unit_economics", "statement_estimate"] as const;

    let cases = 0;
    for (const attribution of attributions) {
      for (const sellerState of states) {
        for (const salesTaxCents of taxes) {
          for (const discount of discounts) {
            for (const quantity of quantities) {
              for (const productType of products) {
                for (const basis of bases) {
                  const result = calculateOrder(
                    baseOrder({
                      basis,
                      context: { ...DEFAULT_US_CONTEXT, sellerState, productType },
                      listings: [
                        {
                          unitListPriceCents: 10_000,
                          quantity,
                          unitCogsCents: 1_000,
                          statement:
                            basis === "statement_estimate"
                              ? {
                                  listingType: "standard",
                                  initialListingFeePaid: true,
                                  inventoryAfterSale: "sold_out",
                                }
                              : undefined,
                        },
                      ],
                      discount,
                      salesTaxCents,
                      attribution,
                      eligibility: {
                        offsiteAds12Confirmed: attribution === "offsite_ads_12",
                        shareSaveIntroConfirmed: attribution === "share_save_intro_6_5",
                        shareSaveIntroEndsOn:
                          attribution === "share_save_intro_6_5" ? "2026-09-10" : undefined,
                      },
                    }),
                  );
                  expect(result.ok, JSON.stringify({ attribution, sellerState, salesTaxCents, discount, quantity, productType, basis })).toBe(true);
                  if (result.ok) {
                    expect(Number.isSafeInteger(result.value.unitEconomics.contributionProfitCents)).toBe(true);
                    expect(result.value.offsiteAdsFeeCents).toBeLessThanOrEqual(10_000);
                    expect(result.value.primary.kind).toBe(
                      basis === "statement_estimate"
                        ? "payment_account_change"
                        : "contribution_profit",
                    );
                  }
                  cases += 1;
                }
              }
            }
          }
        }
      }
    }
    expect(cases).toBe(480);
  });
});
