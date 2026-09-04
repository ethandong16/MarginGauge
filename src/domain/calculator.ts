import { CURRENT_RATE_CATALOG, resolveRule } from "./catalog";
import {
  divideCents,
  isSafeInteger,
  multiplyRate,
  multiplyRateFactors,
  multiplySafe,
  ratioToBasisPoints,
  sumSafe,
} from "./money";
import type {
  Attribution,
  CalculationContext,
  CalculationFailure,
  CalculationFailureCode,
  CostLineInput,
  DiscountInput,
  DomainResult,
  FeeRuleRevision,
  FeeTraceLine,
  ListingInput,
  ManualAdjustmentInput,
  NormalizedOrderAmounts,
  OrderCalculation,
  OrderCalculationInput,
  RateCatalogRelease,
  RatioMetric,
  RuleFamilyId,
  StatementEstimateResult,
  UnitEconomicsResult,
  ValidationIssue,
  VariableCostsInput,
} from "./types";

export interface CalculateOrderOptions {
  catalog?: RateCatalogRelease;
}

interface AdjustmentTotals {
  unitFeeDebitsCents: number;
  unitFeeCreditsCents: number;
  statementFeeDebitsCents: number;
  statementFeeCreditsCents: number;
  operatingCostsCents: number;
  etsyBilledOperatingCostsCents: number;
  statementOnlyNetDebitsCents: number;
}

interface CostTotals {
  operatingCostsExcludingCogsCents: number;
  etsyBilledOperatingCostsCents: number;
}

function failure(code: CalculationFailureCode, message: string): DomainResult<never> {
  return { ok: false, error: { code, message } };
}

function validationFailure(issues: ValidationIssue[]): DomainResult<never> {
  return {
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Correct the highlighted inputs before calculating.",
      issues,
    },
  };
}

function amountIssue(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isSafeInteger(value)) {
    issues.push({
      code: "NOT_A_SAFE_INTEGER",
      path,
      message: "Enter a whole number of cents with no more than two decimal places.",
    });
  } else if (value < 0) {
    issues.push({ code: "NEGATIVE_AMOUNT", path, message: "Enter zero or a positive amount." });
  }
}

function optionalAmountIssue(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value !== undefined) {
    amountIssue(value, path, issues);
  }
}

function rateIssue(value: unknown, path: string, upperExclusive: number, issues: ValidationIssue[]): void {
  if (!isSafeInteger(value) || value < 0 || value >= upperExclusive) {
    issues.push({
      code: "INVALID_RATE",
      path,
      message: "Enter a valid rate with no more than four decimal places.",
    });
  }
}

function validateContext(context: CalculationContext): DomainResult<true> {
  if (
    context.sellerCountry !== "US" ||
    context.bankCountry !== "US" ||
    context.channel !== "ETSY_MARKETPLACE" ||
    context.listingCurrency !== "USD" ||
    context.paymentAccountCurrency !== "USD" ||
    !context.sellerState ||
    (context.productType !== "physical" && context.productType !== "digital")
  ) {
    return failure(
      "UNSUPPORTED_CONTEXT",
      "Version 1 supports current Etsy Marketplace orders for US sellers with a US bank account and USD listing and Payment Account currencies.",
    );
  }

  if (context.timing === "historical") {
    return failure(
      "UNSUPPORTED_CONTEXT",
      "Version 1 does not reconstruct historical orders with the current rate catalog.",
    );
  }

  const scenario = context.orderScenario ?? "standard";
  if (scenario !== "standard") {
    return failure(
      "UNSUPPORTED_ORDER_SCENARIO",
      "Refunds, cancellations, chargebacks, and Purchase Protection cases are not supported in version 1.",
    );
  }

  return { ok: true, value: true };
}

function validateDiscount(discount: DiscountInput, issues: ValidationIssue[]): void {
  if (!discount || !["none", "fixed", "percentage"].includes(discount.kind)) {
    issues.push({ code: "INVALID_SELECTION", path: "discount.kind", message: "Choose a discount type." });
    return;
  }
  if (discount.kind === "fixed") {
    amountIssue(discount.amountCents, "discount.amountCents", issues);
  } else if (discount.kind === "percentage") {
    rateIssue(discount.ratePpm, "discount.ratePpm", 1_000_000, issues);
  }
}

function validateCostLine(
  value: CostLineInput | undefined,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!value) {
    return;
  }
  amountIssue(value.amountCents, `${path}.amountCents`, issues);
  if (value.billingChannel !== "external" && value.billingChannel !== "etsy_payment_account") {
    issues.push({ code: "REQUIRED", path: `${path}.billingChannel`, message: "Choose who billed this cost." });
  }
}

function validateCosts(costs: VariableCostsInput | undefined, issues: ValidationIssue[]): void {
  if (!costs) {
    return;
  }
  validateCostLine(costs.fulfillmentShipping, "costs.fulfillmentShipping", issues);
  validateCostLine(costs.insurance, "costs.insurance", issues);
  validateCostLine(costs.packaging, "costs.packaging", issues);
  validateCostLine(costs.variableLabor, "costs.variableLabor", issues);
  validateCostLine(costs.other, "costs.other", issues);
}

function validateAdjustments(
  adjustments: ManualAdjustmentInput[] | undefined,
  issues: ValidationIssue[],
): void {
  adjustments?.forEach((adjustment, index) => {
    if (
      ![
        "etsy_fee_debit",
        "etsy_fee_credit",
        "operating_cost",
        "statement_only_debit",
        "statement_only_credit",
      ].includes(adjustment.kind)
    ) {
      issues.push({
        code: "INVALID_SELECTION",
        path: `manualAdjustments.${index}.kind`,
        message: "Choose a supported adjustment type.",
      });
      return;
    }
    amountIssue(adjustment.amountCents, `manualAdjustments.${index}.amountCents`, issues);
    if (
      (adjustment.kind === "etsy_fee_debit" || adjustment.kind === "etsy_fee_credit") &&
      !["unit", "statement", "both"].includes(adjustment.appliesTo)
    ) {
      issues.push({
        code: "INVALID_SELECTION",
        path: `manualAdjustments.${index}.appliesTo`,
        message: "Choose which calculation projection this fee affects.",
      });
    }
    if (
      adjustment.kind === "operating_cost" &&
      !["external", "etsy_payment_account"].includes(adjustment.billingChannel)
    ) {
      issues.push({
        code: "INVALID_SELECTION",
        path: `manualAdjustments.${index}.billingChannel`,
        message: "Choose who billed this operating cost.",
      });
    }
  });
}

function validateOrderNumbers(input: OrderCalculationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!Array.isArray(input.listings) || input.listings.length === 0) {
    issues.push({ code: "REQUIRED", path: "listings", message: "Add at least one listing." });
  } else {
    input.listings.forEach((listing, index) => {
      amountIssue(listing.unitListPriceCents, `listings.${index}.unitListPriceCents`, issues);
      amountIssue(listing.unitCogsCents, `listings.${index}.unitCogsCents`, issues);
      if (!isSafeInteger(listing.quantity) || listing.quantity < 1 || listing.quantity > 9_999) {
        issues.push({
          code: "INVALID_QUANTITY",
          path: `listings.${index}.quantity`,
          message: "Quantity must be a whole number from 1 to 9,999.",
        });
      }
      if (listing.statement?.actualDebitCount !== undefined) {
        const count = listing.statement.actualDebitCount;
        if (!isSafeInteger(count) || count < 0 || count > 9_999) {
          issues.push({
            code: "INVALID_QUANTITY",
            path: `listings.${index}.statement.actualDebitCount`,
            message: "The actual listing debit count must be a whole number from 0 to 9,999.",
          });
        }
      }
      if (
        listing.statement &&
        !["standard", "private"].includes(listing.statement.listingType)
      ) {
        issues.push({
          code: "INVALID_SELECTION",
          path: `listings.${index}.statement.listingType`,
          message: "Choose standard or private listing.",
        });
      }
      if (
        listing.statement?.inventoryAfterSale !== undefined &&
        !["sold_out", "remains"].includes(listing.statement.inventoryAfterSale)
      ) {
        issues.push({
          code: "INVALID_SELECTION",
          path: `listings.${index}.statement.inventoryAfterSale`,
          message: "Choose whether inventory sold out or remained.",
        });
      }
    });
  }

  validateDiscount(input.discount, issues);
  optionalAmountIssue(input.personalizationCents, "personalizationCents", issues);
  optionalAmountIssue(input.shippingChargedCents, "shippingChargedCents", issues);
  optionalAmountIssue(input.giftWrapCents, "giftWrapCents", issues);
  optionalAmountIssue(input.etsyFundedCouponCents, "etsyFundedCouponCents", issues);
  amountIssue(input.salesTaxCents, "salesTaxCents", issues);
  optionalAmountIssue(
    input.coloradoRetailDeliveryFeeCents,
    "coloradoRetailDeliveryFeeCents",
    issues,
  );
  optionalAmountIssue(
    input.paymentProcessingGrossOverrideCents,
    "paymentProcessingGrossOverrideCents",
    issues,
  );
  validateCosts(input.costs, issues);
  validateAdjustments(input.manualAdjustments, issues);
  if (input.etsyAds) {
    amountIssue(input.etsyAds.allocatedCents, "etsyAds.allocatedCents", issues);
  }
  if (
    ![
      "none",
      "offsite_ads_12",
      "offsite_ads_15",
      "share_save_4",
      "share_save_intro_6_5",
    ].includes(input.attribution)
  ) {
    issues.push({
      code: "INVALID_SELECTION",
      path: "attribution",
      message: "Choose a supported order attribution.",
    });
  }

  return issues;
}

function validateEligibility(
  attribution: Attribution,
  input: OrderCalculationInput,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (attribution === "offsite_ads_12" && !input.eligibility?.offsiteAds12Confirmed) {
    issues.push({
      code: "ELIGIBILITY_CONFIRMATION_REQUIRED",
      path: "eligibility.offsiteAds12Confirmed",
      message: "Confirm that this shop qualifies for the 12% lifetime Offsite Ads tier.",
    });
  }
  if (attribution === "share_save_intro_6_5") {
    if (!input.eligibility?.shareSaveIntroConfirmed) {
      issues.push({
        code: "ELIGIBILITY_CONFIRMATION_REQUIRED",
        path: "eligibility.shareSaveIntroConfirmed",
        message: "Confirm the shop's invitation to the Share & Save introductory promotion.",
      });
    }
    const endsOn = input.eligibility?.shareSaveIntroEndsOn;
    if (!endsOn || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) {
      issues.push({
        code: "INVALID_DATE",
        path: "eligibility.shareSaveIntroEndsOn",
        message: "Enter the seller's Share & Save introductory end date.",
      });
    } else {
      const parsed = new Date(`${endsOn}T00:00:00Z`);
      const isRealCalendarDate =
        Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === endsOn;
      if (!isRealCalendarDate) {
        issues.push({
          code: "INVALID_DATE",
          path: "eligibility.shareSaveIntroEndsOn",
          message: "Enter a real calendar date for the seller's introductory promotion deadline.",
        });
      }
    }
  }
  return issues;
}

function calculateDiscount(discount: DiscountInput, merchandiseSubtotalCents: number): number {
  if (discount.kind === "none") {
    return 0;
  }
  if (discount.kind === "fixed") {
    return discount.amountCents;
  }
  return multiplyRate(merchandiseSubtotalCents, discount.ratePpm);
}

function normalizeAmounts(input: OrderCalculationInput): DomainResult<NormalizedOrderAmounts> {
  const merchandiseSubtotalCents = sumSafe(
    input.listings.map((listing) =>
      multiplySafe(listing.unitListPriceCents, listing.quantity, "Listing subtotal"),
    ),
    "Merchandise subtotal",
  );
  const totalCogsCents = sumSafe(
    input.listings.map((listing) => multiplySafe(listing.unitCogsCents, listing.quantity, "Listing COGS")),
    "Total COGS",
  );
  const totalQuantity = sumSafe(
    input.listings.map((listing) => listing.quantity),
    "Total quantity",
  );
  const personalizationCents = input.personalizationCents ?? 0;
  const shippingChargedCents = input.shippingChargedCents ?? 0;
  const giftWrapCents = input.giftWrapCents ?? 0;
  const sellerFundedDiscountCents = calculateDiscount(input.discount, merchandiseSubtotalCents);

  const maximumDiscountBaseCents = sumSafe(
    [merchandiseSubtotalCents, personalizationCents],
    "Maximum seller-funded discount base",
  );
  if (sellerFundedDiscountCents > maximumDiscountBaseCents) {
    return validationFailure([
      {
        code: "DISCOUNT_EXCEEDS_BASE",
        path: "discount",
        message: "Seller-funded discount cannot exceed merchandise plus personalization.",
      },
    ]);
  }

  const sellerOrderRevenueCents = sumSafe(
    [
      merchandiseSubtotalCents,
      -sellerFundedDiscountCents,
      personalizationCents,
      shippingChargedCents,
      giftWrapCents,
    ],
    "Seller order revenue",
  );
  if (sellerOrderRevenueCents <= 0) {
    return failure(
      "UNSUPPORTED_ZERO_REVENUE",
      "Zero-value orders are not supported because Etsy's fixed processing-fee behavior is not inferred.",
    );
  }

  const etsyFundedCouponCents = input.etsyFundedCouponCents ?? 0;
  if (etsyFundedCouponCents > sellerOrderRevenueCents) {
    return validationFailure([
      {
        code: "COUPON_EXCEEDS_REVENUE",
        path: "etsyFundedCouponCents",
        message: "Etsy-funded coupon cannot exceed seller order revenue.",
      },
    ]);
  }
  if (sellerFundedDiscountCents > 0 && etsyFundedCouponCents > 0) {
    return failure(
      "UNSUPPORTED_DISCOUNT_COMBINATION",
      "Combining seller-funded and Etsy-funded discounts is not supported in version 1.",
    );
  }
  if (input.attribution === "share_save_intro_6_5" && etsyFundedCouponCents > 0) {
    return failure(
      "UNSUPPORTED_DISCOUNT_COMBINATION",
      "Combining an Etsy-funded coupon with the 6.5% Share & Save introductory credit is not supported in version 1 because the public sources do not confirm that credit base.",
    );
  }

  const salesTaxCents = input.salesTaxCents;
  const coloradoRetailDeliveryFeeCents = input.coloradoRetailDeliveryFeeCents ?? 0;
  const paymentProcessingGrossCents =
    input.paymentProcessingGrossOverrideCents ??
    sumSafe([sellerOrderRevenueCents, salesTaxCents], "Payment processing gross");
  if (paymentProcessingGrossCents < sellerOrderRevenueCents) {
    return validationFailure([
      {
        code: "PROCESSING_GROSS_BELOW_REVENUE",
        path: "paymentProcessingGrossOverrideCents",
        message: "Payment processing gross cannot be lower than seller order revenue.",
      },
    ]);
  }

  return {
    ok: true,
    value: {
      merchandiseSubtotalCents,
      sellerFundedDiscountCents,
      personalizationCents,
      shippingChargedCents,
      giftWrapCents,
      sellerOrderRevenueCents,
      etsyFundedCouponCents,
      salesTaxCents,
      coloradoRetailDeliveryFeeCents,
      buyerCheckoutTotalCents: sumSafe(
        [
          sellerOrderRevenueCents,
          -etsyFundedCouponCents,
          salesTaxCents,
          coloradoRetailDeliveryFeeCents,
        ],
        "Buyer checkout total",
      ),
      paymentProcessingGrossCents,
      totalQuantity,
      totalCogsCents,
    },
  };
}

function sumCostLines(costs: VariableCostsInput | undefined): CostTotals {
  const lines = costs
    ? [costs.fulfillmentShipping, costs.insurance, costs.packaging, costs.variableLabor, costs.other]
    : [];
  const definedLines = lines.filter((line): line is CostLineInput => line !== undefined);
  return {
    operatingCostsExcludingCogsCents: sumSafe(
      definedLines.map((line) => line.amountCents),
      "Operating costs",
    ),
    etsyBilledOperatingCostsCents: sumSafe(
      definedLines
        .filter((line) => line.billingChannel === "etsy_payment_account")
        .map((line) => line.amountCents),
      "Etsy-billed operating costs",
    ),
  };
}

function sumAdjustments(adjustments: ManualAdjustmentInput[] | undefined): AdjustmentTotals {
  const unitFeeDebits: number[] = [];
  const unitFeeCredits: number[] = [];
  const statementFeeDebits: number[] = [];
  const statementFeeCredits: number[] = [];
  const operatingCosts: number[] = [];
  const etsyBilledOperatingCosts: number[] = [];
  const statementOnlyNetDebits: number[] = [];

  for (const adjustment of adjustments ?? []) {
    if (adjustment.kind === "etsy_fee_debit") {
      if (adjustment.appliesTo === "unit" || adjustment.appliesTo === "both") {
        unitFeeDebits.push(adjustment.amountCents);
      }
      if (adjustment.appliesTo === "statement" || adjustment.appliesTo === "both") {
        statementFeeDebits.push(adjustment.amountCents);
      }
    } else if (adjustment.kind === "etsy_fee_credit") {
      if (adjustment.appliesTo === "unit" || adjustment.appliesTo === "both") {
        unitFeeCredits.push(adjustment.amountCents);
      }
      if (adjustment.appliesTo === "statement" || adjustment.appliesTo === "both") {
        statementFeeCredits.push(adjustment.amountCents);
      }
    } else if (adjustment.kind === "operating_cost") {
      operatingCosts.push(adjustment.amountCents);
      if (adjustment.billingChannel === "etsy_payment_account") {
        etsyBilledOperatingCosts.push(adjustment.amountCents);
      }
    } else if (adjustment.kind === "statement_only_debit") {
      statementOnlyNetDebits.push(adjustment.amountCents);
    } else {
      statementOnlyNetDebits.push(-adjustment.amountCents);
    }
  }

  return {
    unitFeeDebitsCents: sumSafe(unitFeeDebits, "Manual unit fee debits"),
    unitFeeCreditsCents: sumSafe(unitFeeCredits, "Manual unit fee credits"),
    statementFeeDebitsCents: sumSafe(statementFeeDebits, "Manual statement fee debits"),
    statementFeeCreditsCents: sumSafe(statementFeeCredits, "Manual statement fee credits"),
    operatingCostsCents: sumSafe(operatingCosts, "Manual operating costs"),
    etsyBilledOperatingCostsCents: sumSafe(
      etsyBilledOperatingCosts,
      "Manual Etsy-billed operating costs",
    ),
    statementOnlyNetDebitsCents: sumSafe(statementOnlyNetDebits, "Statement-only adjustments"),
  };
}

function metric(numeratorCents: number, denominatorCents: number): RatioMetric {
  return {
    numeratorCents,
    denominatorCents,
    basisPoints: ratioToBasisPoints(numeratorCents, denominatorCents),
  };
}

function requireRule(
  catalog: RateCatalogRelease,
  family: RuleFamilyId,
  context: CalculationContext,
): DomainResult<FeeRuleRevision> {
  return resolveRule(catalog, family, context);
}

function makeTraceLine(
  rule: FeeRuleRevision,
  values: Omit<FeeTraceLine, "ruleRevisionId" | "evidenceStatus" | "sourceIds">,
): FeeTraceLine {
  return {
    ...values,
    ruleRevisionId: rule.revisionId,
    evidenceStatus: rule.evidenceStatus,
    sourceIds: rule.sourceIds,
  };
}

function deriveStatementListingDebitCount(listings: ListingInput[]): DomainResult<number> {
  const issues: ValidationIssue[] = [];
  const counts: number[] = [];

  listings.forEach((listing, index) => {
    const statement = listing.statement;
    if (!statement) {
      issues.push({
        code: "REQUIRED",
        path: `listings.${index}.statement`,
        message: "Add listing event details or an actual debit count for Statement estimate.",
      });
      return;
    }
    if (statement.actualDebitCount !== undefined) {
      counts.push(statement.actualDebitCount);
      return;
    }
    if (statement.listingType === "private") {
      if (listing.quantity === 1) {
        counts.push(1);
      } else {
        issues.push({
          code: "REQUIRED",
          path: `listings.${index}.statement.actualDebitCount`,
          message: "Enter the actual debit count for a private listing with multiple items.",
        });
      }
      return;
    }
    if (statement.initialListingFeePaid !== true) {
      issues.push({
        code: "REQUIRED",
        path: `listings.${index}.statement.actualDebitCount`,
        message: "Enter the actual debit count when the initial listing fee was not already paid.",
      });
      return;
    }
    if (!statement.inventoryAfterSale) {
      issues.push({
        code: "REQUIRED",
        path: `listings.${index}.statement.inventoryAfterSale`,
        message: "Choose whether inventory remained after the sale.",
      });
      return;
    }
    counts.push(
      statement.inventoryAfterSale === "remains" ? listing.quantity : Math.max(listing.quantity - 1, 0),
    );
  });

  if (issues.length > 0) {
    return validationFailure(issues);
  }
  return { ok: true, value: sumSafe(counts, "Statement listing debit count") };
}

function resolveAttributionRuleFamily(attribution: Attribution): RuleFamilyId | null {
  switch (attribution) {
    case "offsite_ads_12":
      return "offsite_ads_12";
    case "offsite_ads_15":
      return "offsite_ads_15";
    case "share_save_4":
      return "share_save_4";
    case "share_save_intro_6_5":
      return "share_save_intro_6_5";
    default:
      return null;
  }
}

function ruleError<T>(result: DomainResult<T>): CalculationFailure | null {
  return result.ok ? null : result.error;
}

export function calculateOrder(
  input: OrderCalculationInput,
  options: CalculateOrderOptions = {},
): DomainResult<OrderCalculation> {
  const catalog = options.catalog ?? CURRENT_RATE_CATALOG;
  try {
    const contextResult = validateContext(input.context);
    if (!contextResult.ok) {
      return contextResult;
    }

    const numberIssues = validateOrderNumbers(input);
    const eligibilityIssues = validateEligibility(input.attribution, input);
    const issues = [...numberIssues, ...eligibilityIssues];
    if (issues.length > 0) {
      return validationFailure(issues);
    }

    const basis = input.basis ?? catalog.defaultMode;
    if (basis !== "unit_economics" && basis !== "statement_estimate") {
      return failure("UNSUPPORTED_CONTEXT", "Choose a supported calculation basis.");
    }

    const coloradoNeedsActualGross =
      basis === "statement_estimate" &&
      input.context.productType === "physical" &&
      input.context.buyerDestinationState === "CO";
    if (coloradoNeedsActualGross && input.paymentProcessingGrossOverrideCents === undefined) {
      return failure(
        "PROCESSING_GROSS_REQUIRED",
        "Enter the actual processing gross for a physical Colorado order; Etsy's public guidance does not confirm whether the retail delivery fee enters this base.",
      );
    }

    const amountsResult = normalizeAmounts(input);
    if (!amountsResult.ok) {
      return amountsResult;
    }
    const amounts = amountsResult.value;

    const transactionRuleResult = requireRule(catalog, "transaction_fee", input.context);
    const processingRuleResult = requireRule(catalog, "payment_processing_fee", input.context);
    const unitListingRuleResult = requireRule(catalog, "unit_listing_allocation", input.context);
    const initialRuleError =
      ruleError(transactionRuleResult) ??
      ruleError(processingRuleResult) ??
      ruleError(unitListingRuleResult);
    if (initialRuleError) {
      return { ok: false, error: initialRuleError };
    }
    if (!transactionRuleResult.ok || !processingRuleResult.ok || !unitListingRuleResult.ok) {
      return failure("CALCULATION_ERROR", "Required fee rules could not be resolved.");
    }
    const transactionRule = transactionRuleResult.value;
    const processingRule = processingRuleResult.value;
    const unitListingRule = unitListingRuleResult.value;
    if (
      transactionRule.formula.type !== "percentage" ||
      processingRule.formula.type !== "percentage_plus_fixed" ||
      unitListingRule.formula.type !== "fixed_per_sold_unit"
    ) {
      return failure("RATE_VERSION_UNAVAILABLE", "The active catalog contains an incompatible core formula.");
    }

    const transactionFeeCents = multiplyRate(
      amounts.sellerOrderRevenueCents,
      transactionRule.formula.ratePpm,
    );
    const paymentProcessingFeeCents = sumSafe(
      [
        multiplyRate(amounts.paymentProcessingGrossCents, processingRule.formula.ratePpm),
        processingRule.formula.fixedCents,
      ],
      "Payment processing fee",
    );
    const unitListingFeeCents = multiplySafe(
      amounts.totalQuantity,
      unitListingRule.formula.amountCents,
      "Unit listing allocation",
    );

    const feeTrace: FeeTraceLine[] = [
      makeTraceLine(transactionRule, {
        id: "transaction_fee",
        label: transactionRule.name,
        direction: "debit",
        projections: ["unit_economics", "statement_estimate"],
        amountCents: transactionFeeCents,
        baseCents: amounts.sellerOrderRevenueCents,
        ratePpm: transactionRule.formula.ratePpm,
      }),
      makeTraceLine(processingRule, {
        id: "payment_processing_fee",
        label: processingRule.name,
        direction: "debit",
        projections: ["unit_economics", "statement_estimate"],
        amountCents: paymentProcessingFeeCents,
        baseCents: amounts.paymentProcessingGrossCents,
        ratePpm: processingRule.formula.ratePpm,
        fixedAmountCents: processingRule.formula.fixedCents,
      }),
      makeTraceLine(unitListingRule, {
        id: "unit_listing_fee",
        label: unitListingRule.name,
        direction: "debit",
        projections: ["unit_economics"],
        amountCents: unitListingFeeCents,
        fixedAmountCents: unitListingRule.formula.amountCents,
        note: "$0.20 per sold unit is a MarginGauge unit-economics allocation.",
      }),
    ];

    let offsiteAdsFeeCents = 0;
    let shareSaveCreditCents = 0;
    const attributionFamily = resolveAttributionRuleFamily(input.attribution);
    if (attributionFamily) {
      const attributionRuleResult = requireRule(catalog, attributionFamily, input.context);
      if (!attributionRuleResult.ok) {
        return attributionRuleResult;
      }
      const attributionRule = attributionRuleResult.value;
      if (attributionRule.formula.type === "percentage_with_cap") {
        offsiteAdsFeeCents = Math.min(
          multiplyRate(amounts.sellerOrderRevenueCents, attributionRule.formula.ratePpm),
          attributionRule.formula.capCents,
        );
        feeTrace.push(
          makeTraceLine(attributionRule, {
            id: "offsite_ads_fee",
            label: attributionRule.name,
            direction: "debit",
            projections: ["unit_economics", "statement_estimate"],
            amountCents: offsiteAdsFeeCents,
            baseCents: amounts.sellerOrderRevenueCents,
            ratePpm: attributionRule.formula.ratePpm,
            capCents: attributionRule.formula.capCents,
          }),
        );
      } else if (attributionRule.formula.type === "percentage_credit") {
        const shareBaseCents = Math.max(
          0,
          amounts.sellerOrderRevenueCents - amounts.etsyFundedCouponCents,
        );
        shareSaveCreditCents = multiplyRate(shareBaseCents, attributionRule.formula.ratePpm);
        feeTrace.push(
          makeTraceLine(attributionRule, {
            id: "share_save_credit",
            label: attributionRule.name,
            direction: "credit",
            projections: ["unit_economics", "statement_estimate"],
            amountCents: shareSaveCreditCents,
            baseCents: shareBaseCents,
            ratePpm: attributionRule.formula.ratePpm,
          }),
        );
      } else {
        return failure("RATE_VERSION_UNAVAILABLE", "The selected attribution rule has an incompatible formula.");
      }
    }

    let texasSellerFeeTaxCents = 0;
    if (input.context.sellerState === "TX") {
      const texasRuleResult = requireRule(catalog, "texas_seller_fee_tax", input.context);
      if (!texasRuleResult.ok) {
        return texasRuleResult;
      }
      const texasRule = texasRuleResult.value;
      if (texasRule.formula.type !== "compound_percentage") {
        return failure("RATE_VERSION_UNAVAILABLE", "The Texas seller-fee tax rule has an incompatible formula.");
      }
      texasSellerFeeTaxCents = multiplyRateFactors(
        transactionFeeCents,
        texasRule.formula.factorsPpm,
      );
      feeTrace.push(
        makeTraceLine(texasRule, {
          id: "texas_seller_fee_tax",
          label: texasRule.name,
          direction: "debit",
          projections: ["unit_economics", "statement_estimate"],
          amountCents: texasSellerFeeTaxCents,
          baseCents: transactionFeeCents,
          note: "Calculated once from the rounded transaction fee using the official 80% and 6.25% factors.",
        }),
      );
    }

    const costs = sumCostLines(input.costs);
    const adjustments = sumAdjustments(input.manualAdjustments);
    const operatingCostsCents = sumSafe(
      [amounts.totalCogsCents, costs.operatingCostsExcludingCogsCents, adjustments.operatingCostsCents],
      "Total operating costs",
    );
    const marketingSpendCents = input.etsyAds?.allocatedCents ?? 0;
    const netEtsyMarketplaceFeesCents = sumSafe(
      [
        transactionFeeCents,
        paymentProcessingFeeCents,
        unitListingFeeCents,
        offsiteAdsFeeCents,
        texasSellerFeeTaxCents,
        adjustments.unitFeeDebitsCents,
        -shareSaveCreditCents,
        -adjustments.unitFeeCreditsCents,
      ],
      "Net Etsy marketplace fees",
    );
    const totalNetVariableCostsCents = sumSafe(
      [netEtsyMarketplaceFeesCents, operatingCostsCents, marketingSpendCents],
      "Total net variable costs",
    );
    const contributionProfitCents = sumSafe(
      [amounts.sellerOrderRevenueCents, -totalNetVariableCostsCents],
      "Contribution profit",
    );
    const unitEconomics: UnitEconomicsResult = {
      listingFeeCents: unitListingFeeCents,
      netEtsyMarketplaceFeesCents,
      proceedsAfterEtsyFeesCents: amounts.sellerOrderRevenueCents - netEtsyMarketplaceFeesCents,
      operatingCostsCents,
      marketingSpendCents,
      totalNetVariableCostsCents,
      contributionProfitCents,
      averageProfitPerItemCents: divideCents(contributionProfitCents, amounts.totalQuantity),
      contributionMargin: metric(contributionProfitCents, amounts.sellerOrderRevenueCents),
      contributionRoi: metric(contributionProfitCents, totalNetVariableCostsCents),
      effectiveEtsyFeeRate: metric(netEtsyMarketplaceFeesCents, amounts.sellerOrderRevenueCents),
      allInVariableCostRate: metric(totalNetVariableCostsCents, amounts.sellerOrderRevenueCents),
    };

    for (const adjustment of input.manualAdjustments ?? []) {
      if (adjustment.kind !== "etsy_fee_debit" && adjustment.kind !== "etsy_fee_credit") {
        continue;
      }
      feeTrace.push({
        id: adjustment.kind === "etsy_fee_debit" ? "manual_fee_debit" : "manual_fee_credit",
        label:
          adjustment.label ??
          (adjustment.kind === "etsy_fee_debit" ? "Manual Etsy fee debit" : "Manual Etsy fee credit"),
        direction: adjustment.kind === "etsy_fee_debit" ? "debit" : "credit",
        projections:
          adjustment.appliesTo === "both"
            ? ["unit_economics", "statement_estimate"]
            : [adjustment.appliesTo === "unit" ? "unit_economics" : "statement_estimate"],
        amountCents: adjustment.amountCents,
        ruleRevisionId: "user-actual",
        evidenceStatus: "USER_ACTUAL",
        sourceIds: [],
      });
    }

    let statementEstimate: StatementEstimateResult | undefined;
    if (basis === "statement_estimate") {
      const statementRuleResult = requireRule(catalog, "statement_listing_debit", input.context);
      if (!statementRuleResult.ok) {
        return statementRuleResult;
      }
      const statementRule = statementRuleResult.value;
      if (statementRule.formula.type !== "editable_listing_event_count") {
        return failure("RATE_VERSION_UNAVAILABLE", "The statement listing rule has an incompatible formula.");
      }
      const debitCountResult = deriveStatementListingDebitCount(input.listings);
      if (!debitCountResult.ok) {
        return debitCountResult;
      }
      const statementListingFeeCents = multiplySafe(
        debitCountResult.value,
        statementRule.formula.amountCents,
        "Statement listing fees",
      );
      feeTrace.push(
        makeTraceLine(statementRule, {
          id: "statement_listing_fee",
          label: statementRule.name,
          direction: "debit",
          projections: ["statement_estimate"],
          amountCents: statementListingFeeCents,
          fixedAmountCents: statementRule.formula.amountCents,
          note: "Editable estimate of listing debits associated with this order event.",
        }),
      );

      const netEtsyStatementFeesCents = sumSafe(
        [
          transactionFeeCents,
          paymentProcessingFeeCents,
          statementListingFeeCents,
          offsiteAdsFeeCents,
          texasSellerFeeTaxCents,
          adjustments.statementFeeDebitsCents,
          -shareSaveCreditCents,
          -adjustments.statementFeeCreditsCents,
        ],
        "Net Etsy statement fees",
      );
      const etsyAccountOperationalDebitsCents = sumSafe(
        [
          costs.etsyBilledOperatingCostsCents,
          adjustments.etsyBilledOperatingCostsCents,
          adjustments.statementOnlyNetDebitsCents,
          input.etsyAds?.includeInStatement ? marketingSpendCents : 0,
        ],
        "Etsy Account operational debits",
      );
      statementEstimate = {
        listingFeeDebitCount: debitCountResult.value,
        listingFeeCents: statementListingFeeCents,
        netEtsyStatementFeesCents,
        etsyAccountOperationalDebitsCents,
        estimatedPaymentAccountChangeCents: sumSafe(
          [
            amounts.sellerOrderRevenueCents,
            -netEtsyStatementFeesCents,
            -etsyAccountOperationalDebitsCents,
          ],
          "Estimated Payment Account change",
        ),
        statementFeeRate: metric(netEtsyStatementFeesCents, amounts.sellerOrderRevenueCents),
      };
    }

    const assumptions = [
      "Each fee line is rounded half-up to the nearest cent; Etsy does not publish its complete penny-rounding sequence.",
      "Unit economics allocates one $0.20 listing fee to every sold unit.",
      `Current rate catalog ${catalog.catalogReleaseId} is used; historical reconstruction is not supported.`,
    ];
    if (input.context.sellerState === "TX") {
      assumptions.push(
        "Texas seller-fee tax is calculated from the rounded transaction fee, then rounded once; this order of operations is a MarginGauge convention.",
      );
    }
    if (input.paymentProcessingGrossOverrideCents !== undefined) {
      assumptions.push("Payment processing gross uses the seller-provided actual value.");
    }
    if (input.discount.kind === "fixed") {
      assumptions.push(
        "The fixed seller-funded discount is the seller-entered receipt amount and may reduce merchandise plus personalization under the frozen v1 convention; MarginGauge does not infer promotional allocation.",
      );
    }
    if (input.attribution === "share_save_intro_6_5") {
      assumptions.push(
        "The 6.5% Share & Save introductory credit relies on the seller's confirmation that this order is eligible and falls within the entered 14-day deadline; MarginGauge cannot verify seller-specific eligibility.",
      );
    }
    if (
      input.context.productType === "physical" &&
      input.context.buyerDestinationState === "CO" &&
      basis === "unit_economics"
    ) {
      assumptions.push(
        "Colorado retail delivery fee is excluded from the default processing base because Etsy's public guidance does not confirm its treatment.",
      );
    }
    if (basis === "statement_estimate") {
      assumptions.push(
        "Payment Account change is an order-linked estimate, not payout, available funds, profit, or closing balance.",
      );
    }

    const result: OrderCalculation = {
      basis,
      catalogReleaseId: catalog.catalogReleaseId,
      calculationContractVersion: catalog.calculationContractVersion,
      amounts,
      transactionFeeCents,
      paymentProcessingFeeCents,
      offsiteAdsFeeCents,
      shareSaveCreditCents,
      texasSellerFeeTaxCents,
      unitEconomics,
      statementEstimate,
      primary:
        basis === "statement_estimate" && statementEstimate
          ? { kind: "payment_account_change", amountCents: statementEstimate.estimatedPaymentAccountChangeCents }
          : { kind: "contribution_profit", amountCents: contributionProfitCents },
      feeTrace,
      assumptions,
    };
    return { ok: true, value: result };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "CALCULATION_ERROR",
        message: "We could not complete the estimate; no approximate result was returned.",
        details: { reason: error instanceof Error ? error.message : "Unknown calculation error" },
      },
    };
  }
}
