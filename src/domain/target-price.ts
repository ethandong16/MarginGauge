import { calculateOrder } from "./calculator";
import { CURRENT_RATE_CATALOG } from "./catalog";
import {
  RATE_SCALE,
  ceilDividePositive,
  compareRateTarget,
  isSafeInteger,
  multiplyRate,
  multiplySafe,
  sumSafe,
} from "./money";
import type {
  CalculationFailure,
  DomainResult,
  OrderCalculation,
  OrderCalculationInput,
  RateCatalogRelease,
  TargetDefinition,
  TargetPriceCalculation,
  TargetPriceInput,
  TargetSearchOptions,
  TaxScenario,
  ValidationIssue,
} from "./types";

export const TARGET_PRICE_CAP_CENTS = 100_000_000;

export interface CalculateTargetPriceOptions extends TargetSearchOptions {
  catalog?: RateCatalogRelease;
}

interface SearchStats {
  evaluatedLeaves: number;
  prunedIntervals: number;
}

interface CandidateParts {
  calculation: OrderCalculation;
  revenueCents: number;
  feeCreditsCents: number;
  feeDebitsCents: number;
  fixedVariableCostsCents: number;
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

function targetFailure(
  code:
    | "TAX_SCENARIO_REQUIRED"
    | "TARGET_REQUIRED"
    | "MULTIPLE_TARGETS"
    | "INVALID_DISCOUNT"
    | "UNSUPPORTED_TARGET_SCENARIO"
    | "NO_VALID_PRICE_WITHIN_CAP"
    | "CALCULATION_ERROR",
  message: string,
): DomainResult<never> {
  return { ok: false, error: { code, message } };
}

function validateTargetNumbers(
  input: TargetPriceInput,
  maxUnitPriceCents: number,
): DomainResult<true> {
  const issues: ValidationIssue[] = [];
  const amount = (value: unknown, path: string): void => {
    if (!isSafeInteger(value)) {
      issues.push({
        code: "NOT_A_SAFE_INTEGER",
        path,
        message: "Enter a whole number of cents with no more than two decimal places.",
      });
    } else if (value < 0) {
      issues.push({ code: "NEGATIVE_AMOUNT", path, message: "Enter zero or a positive amount." });
    }
  };
  const optionalAmount = (value: unknown, path: string): void => {
    if (value !== undefined) {
      amount(value, path);
    }
  };

  if (!isSafeInteger(input.quantity) || input.quantity < 1 || input.quantity > 9_999) {
    issues.push({
      code: "INVALID_QUANTITY",
      path: "quantity",
      message: "Quantity must be a whole number from 1 to 9,999.",
    });
  }
  amount(input.unitCogsCents, "unitCogsCents");
  optionalAmount(input.personalizationCents, "personalizationCents");
  optionalAmount(input.shippingChargedCents, "shippingChargedCents");
  optionalAmount(input.giftWrapCents, "giftWrapCents");
  optionalAmount(input.etsyFundedCouponCents, "etsyFundedCouponCents");
  optionalAmount(
    input.paymentProcessingGrossOverrideCents,
    "paymentProcessingGrossOverrideCents",
  );

  if (!input.discount || !["none", "fixed", "percentage"].includes(input.discount.kind)) {
    issues.push({
      code: "INVALID_SELECTION",
      path: "discount.kind",
      message: "Choose a discount type.",
    });
  } else if (input.discount.kind === "fixed") {
    amount(input.discount.amountCents, "discount.amountCents");
  } else if (
    input.discount.kind === "percentage" &&
    (!isSafeInteger(input.discount.ratePpm) ||
      input.discount.ratePpm < 0 ||
      input.discount.ratePpm >= RATE_SCALE)
  ) {
    issues.push({
      code: "INVALID_RATE",
      path: "discount.ratePpm",
      message: "Discount rate must be from 0% up to, but not including, 100%.",
    });
  }

  if (
    input.taxScenario &&
    !["no_tax", "custom_effective_rate_on_r"].includes(input.taxScenario.kind)
  ) {
    issues.push({
      code: "INVALID_SELECTION",
      path: "taxScenario.kind",
      message: "Choose no tax or a custom effective tax rate.",
    });
  } else if (
    input.taxScenario?.kind === "custom_effective_rate_on_r" &&
    (!isSafeInteger(input.taxScenario.ratePpm) ||
      input.taxScenario.ratePpm < 0 ||
      input.taxScenario.ratePpm >= RATE_SCALE)
  ) {
    issues.push({
      code: "INVALID_RATE",
      path: "taxScenario.ratePpm",
      message: "Effective tax rate must be from 0% up to, but not including, 100%.",
    });
  }

  if (input.target && !["profit", "margin"].includes(input.target.kind)) {
    issues.push({
      code: "INVALID_SELECTION",
      path: "target.kind",
      message: "Choose target profit or target margin.",
    });
  } else if (input.target?.kind === "profit") {
    amount(input.target.amountCents, "target.amountCents");
  } else if (
    input.target?.kind === "margin" &&
    (!isSafeInteger(input.target.ratePpm) ||
      input.target.ratePpm < 0 ||
      input.target.ratePpm >= RATE_SCALE)
  ) {
    issues.push({
      code: "INVALID_RATE",
      path: "target.ratePpm",
      message: "Target margin must be from 0% up to, but not including, 100%.",
    });
  }

  if (!isSafeInteger(maxUnitPriceCents) || maxUnitPriceCents < 1 || maxUnitPriceCents > TARGET_PRICE_CAP_CENTS) {
    issues.push({
      code: "NOT_A_SAFE_INTEGER",
      path: "options.maxUnitPriceCents",
      message: "The search cap must be a whole cent from $0.01 to $1,000,000.00.",
    });
  }

  const costs = input.costs;
  const costLines = costs
    ? [costs.fulfillmentShipping, costs.insurance, costs.packaging, costs.variableLabor, costs.other]
    : [];
  costLines.forEach((line, index) => {
    if (line) {
      amount(line.amountCents, `costs.${index}.amountCents`);
    }
  });
  if (input.etsyAds) {
    amount(input.etsyAds.allocatedCents, "etsyAds.allocatedCents");
  }
  input.manualAdjustments?.forEach((adjustment, index) => {
    amount(adjustment.amountCents, `manualAdjustments.${index}.amountCents`);
  });

  return issues.length > 0 ? validationFailure(issues) : { ok: true, value: true };
}

function buildOrderInput(
  input: TargetPriceInput,
  unitListPriceCents: number,
  taxScenario: TaxScenario,
): OrderCalculationInput {
  const merchandiseSubtotalCents = multiplySafe(unitListPriceCents, input.quantity, "Target merchandise subtotal");
  let discountCents = 0;
  if (input.discount.kind === "fixed") {
    discountCents = input.discount.amountCents;
  } else if (input.discount.kind === "percentage") {
    discountCents = multiplyRate(merchandiseSubtotalCents, input.discount.ratePpm);
  }
  const revenueCents = sumSafe(
    [
      merchandiseSubtotalCents,
      -discountCents,
      input.personalizationCents ?? 0,
      input.shippingChargedCents ?? 0,
      input.giftWrapCents ?? 0,
    ],
    "Target seller revenue",
  );
  const salesTaxCents =
    taxScenario.kind === "custom_effective_rate_on_r" && revenueCents > 0
      ? multiplyRate(revenueCents, taxScenario.ratePpm)
      : 0;

  return {
    basis: "unit_economics",
    context: input.context,
    listings: [
      {
        unitListPriceCents,
        quantity: input.quantity,
        unitCogsCents: input.unitCogsCents,
      },
    ],
    discount: input.discount,
    personalizationCents: input.personalizationCents,
    shippingChargedCents: input.shippingChargedCents,
    giftWrapCents: input.giftWrapCents,
    etsyFundedCouponCents: 0,
    salesTaxCents,
    attribution: input.attribution,
    eligibility: input.eligibility,
    costs: input.costs,
    etsyAds: input.etsyAds,
    manualAdjustments: input.manualAdjustments,
  };
}

function findFirstRevenuePositivePrice(
  input: TargetPriceInput,
  capCents: number,
): number | null {
  const quantity = BigInt(input.quantity);
  if (input.discount.kind === "fixed") {
    const fixed = BigInt(input.discount.amountCents);
    const additions =
      BigInt(input.personalizationCents ?? 0) +
      BigInt(input.shippingChargedCents ?? 0) +
      BigInt(input.giftWrapCents ?? 0);
    const minimumForPositiveRevenue = ceilDividePositive(fixed - additions + 1n, quantity);
    const minimumForDiscountBase = ceilDividePositive(
      fixed - BigInt(input.personalizationCents ?? 0),
      quantity,
    );
    const result = Number(
      [1n, minimumForPositiveRevenue, minimumForDiscountBase].reduce((max, value) =>
        value > max ? value : max,
      ),
    );
    return result <= capCents ? result : null;
  }

  const revenueAt = (priceCents: number): number => {
    const merchandise = multiplySafe(priceCents, input.quantity);
    const discount =
      input.discount.kind === "percentage" ? multiplyRate(merchandise, input.discount.ratePpm) : 0;
    return (
      merchandise -
      discount +
      (input.personalizationCents ?? 0) +
      (input.shippingChargedCents ?? 0) +
      (input.giftWrapCents ?? 0)
    );
  };
  if (revenueAt(capCents) <= 0) {
    return null;
  }
  let low = 1;
  let high = capCents;
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (revenueAt(mid) > 0) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
}

function extractCandidateParts(calculation: OrderCalculation): CandidateParts {
  const feeCreditsCents = sumSafe(
    calculation.feeTrace
      .filter(
        (line) => line.direction === "credit" && line.projections.includes("unit_economics"),
      )
      .map((line) => line.amountCents),
    "Target fee credits",
  );
  return {
    calculation,
    revenueCents: calculation.amounts.sellerOrderRevenueCents,
    feeCreditsCents,
    feeDebitsCents: calculation.unitEconomics.netEtsyMarketplaceFeesCents + feeCreditsCents,
    fixedVariableCostsCents:
      calculation.unitEconomics.operatingCostsCents + calculation.unitEconomics.marketingSpendCents,
  };
}

function meetsTarget(candidate: CandidateParts, target: TargetDefinition): boolean {
  const profit = candidate.calculation.unitEconomics.contributionProfitCents;
  return target.kind === "profit"
    ? profit >= target.amountCents
    : compareRateTarget(profit, candidate.revenueCents, target.ratePpm);
}

function intervalCanMeetTarget(
  lower: CandidateParts,
  upper: CandidateParts,
  target: TargetDefinition,
): boolean {
  if (target.kind === "profit") {
    const optimisticProfit =
      BigInt(upper.revenueCents) +
      BigInt(upper.feeCreditsCents) -
      BigInt(lower.feeDebitsCents) -
      BigInt(lower.fixedVariableCostsCents);
    return optimisticProfit >= BigInt(target.amountCents);
  }

  const optimisticScaledScore =
    BigInt(RATE_SCALE - target.ratePpm) * BigInt(upper.revenueCents) +
    BigInt(RATE_SCALE) * BigInt(upper.feeCreditsCents) -
    BigInt(RATE_SCALE) * BigInt(lower.feeDebitsCents) -
    BigInt(RATE_SCALE) * BigInt(lower.fixedVariableCostsCents);
  return optimisticScaledScore >= 0n;
}

export function calculateTargetPrice(
  input: TargetPriceInput,
  options: CalculateTargetPriceOptions = {},
): DomainResult<TargetPriceCalculation> {
  const catalog = options.catalog ?? CURRENT_RATE_CATALOG;
  const maxUnitPriceCents = options.maxUnitPriceCents ?? TARGET_PRICE_CAP_CENTS;

  const runtimeInput = input as TargetPriceInput & {
    targetProfitCents?: number;
    targetMarginRatePpm?: number;
  };
  if (
    runtimeInput.targetProfitCents !== undefined &&
    runtimeInput.targetMarginRatePpm !== undefined
  ) {
    return targetFailure("MULTIPLE_TARGETS", "Choose one target type.");
  }

  if (!input.taxScenario) {
    return targetFailure("TAX_SCENARIO_REQUIRED", "Choose how sales tax should be estimated.");
  }
  if (!input.target) {
    return targetFailure("TARGET_REQUIRED", "Enter a target profit or target margin.");
  }

  const numberValidation = validateTargetNumbers(input, maxUnitPriceCents);
  if (!numberValidation.ok) {
    return numberValidation;
  }
  if (
    (input.etsyFundedCouponCents ?? 0) > 0 ||
    input.paymentProcessingGrossOverrideCents !== undefined ||
    input.manualAdjustments?.some(
      (adjustment) =>
        adjustment.kind === "statement_only_debit" ||
        adjustment.kind === "statement_only_credit" ||
        ((adjustment.kind === "etsy_fee_debit" || adjustment.kind === "etsy_fee_credit") &&
          adjustment.appliesTo === "statement"),
    )
  ) {
    return targetFailure(
      "UNSUPPORTED_TARGET_SCENARIO",
      "This scenario cannot be priced reliably with version 1 target-price rules.",
    );
  }

  try {
    const firstValidPrice = findFirstRevenuePositivePrice(input, maxUnitPriceCents);
    if (firstValidPrice === null) {
      return targetFailure(
        "INVALID_DISCOUNT",
        "The discount leaves no valid positive-revenue price within the search cap.",
      );
    }

    const cache = new Map<number, DomainResult<OrderCalculation>>();
    const evaluate = (priceCents: number): DomainResult<OrderCalculation> => {
      const cached = cache.get(priceCents);
      if (cached) {
        return cached;
      }
      const result = calculateOrder(buildOrderInput(input, priceCents, input.taxScenario as TaxScenario), {
        catalog,
      });
      cache.set(priceCents, result);
      return result;
    };

    const lowerProbe = evaluate(firstValidPrice);
    if (!lowerProbe.ok) {
      return lowerProbe;
    }
    const upperProbe = evaluate(maxUnitPriceCents);
    if (!upperProbe.ok) {
      return upperProbe;
    }

    let fatalError: CalculationFailure | null = null;
    const stats: SearchStats = { evaluatedLeaves: 0, prunedIntervals: 0 };

    const search = (low: number, high: number): number | null => {
      const lowResult = evaluate(low);
      const highResult = evaluate(high);
      if (!lowResult.ok || !highResult.ok) {
        fatalError = !lowResult.ok ? lowResult.error : !highResult.ok ? highResult.error : null;
        return null;
      }
      const lower = extractCandidateParts(lowResult.value);
      const upper = extractCandidateParts(highResult.value);
      if (!intervalCanMeetTarget(lower, upper, input.target as TargetDefinition)) {
        stats.prunedIntervals += 1;
        return null;
      }
      if (low === high) {
        stats.evaluatedLeaves += 1;
        return meetsTarget(lower, input.target as TargetDefinition) ? low : null;
      }

      const mid = low + Math.floor((high - low) / 2);
      const left = search(low, mid);
      return left ?? search(mid + 1, high);
    };

    const price = search(firstValidPrice, maxUnitPriceCents);
    if (fatalError) {
      return { ok: false, error: fatalError };
    }
    if (price === null) {
      return {
        ok: false,
        error: {
          code: "NO_VALID_PRICE_WITHIN_CAP",
          message:
            "No price at or below $1,000,000 meets this target. The cap is a MarginGauge limit, not an Etsy limit.",
          details: { maxUnitPriceCents },
        },
      };
    }

    const result = evaluate(price);
    if (!result.ok) {
      return result;
    }
    if (!meetsTarget(extractCandidateParts(result.value), input.target)) {
      return targetFailure(
        "CALCULATION_ERROR",
        "The target solver could not verify its result; no approximate price was returned.",
      );
    }
    if (price > firstValidPrice) {
      const previous = evaluate(price - 1);
      if (!previous.ok) {
        return previous;
      }
      if (meetsTarget(extractCandidateParts(previous.value), input.target)) {
        return targetFailure(
          "CALCULATION_ERROR",
          "The target solver could not verify the minimum cent; no approximate price was returned.",
        );
      }
    }

    return {
      ok: true,
      value: {
        minimumUnitListPriceCents: price,
        previousUnitPriceMeetsTarget: false,
        calculation: result.value,
        target: input.target,
        taxScenario: input.taxScenario,
        search: {
          minUnitPriceCents: 1,
          maxUnitPriceCents,
          evaluatedLeaves: stats.evaluatedLeaves,
          prunedIntervals: stats.prunedIntervals,
        },
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "CALCULATION_ERROR",
        message: "We could not complete the estimate; no approximate price was returned.",
        details: { reason: error instanceof Error ? error.message : "Unknown target-price error" },
      },
    };
  }
}
