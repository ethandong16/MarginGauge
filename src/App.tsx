import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Menu,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  calculateOrder,
  calculateTargetPrice,
  CURRENT_RATE_CATALOG,
  type Attribution as DomainAttribution,
  type CalculationFailure,
  type DiscountInput,
  type OrderCalculation,
  type OrderCalculationInput,
  type TargetPriceCalculation,
  type TargetPriceInput,
} from "./domain";
import { SITE_METADATA } from "./content";
import { OrderForm, TargetForm } from "./components/CalculatorForms";
import { ContentSections } from "./components/ContentSections";
import { ResultPanel } from "./components/ResultPanel";
import { SegmentedControl } from "./components/FormControls";
import type {
  Attribution,
  CalculatorMode,
  ErrorMap,
  OrderDraft,
  ResultLine,
  ResultViewModel,
  SharedDraft,
  TargetDraft,
} from "./components/calculator-types";

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DEFAULT_SHARED: SharedDraft = {
  discountType: "none",
  discountValue: "",
  personalization: "",
  shippingCharged: "",
  giftWrap: "",
  attribution: "none",
  confirmsOffsite12: false,
  confirmsShareIntro: false,
  shareIntroEnds: "",
  shopState: "other",
  fulfillmentShipping: "",
  shippingBilling: "external",
  insurance: "",
  insuranceBilling: "external",
  packaging: "",
  labor: "",
  otherCosts: "",
  etsyAds: "",
  etsyAdsInStatement: false,
  manualFeeDebit: "",
  manualFeeCredit: "",
};

const makeOrderDraft = (): OrderDraft => ({
  ...DEFAULT_SHARED,
  basis: "unit",
  listings: [
    {
      id: "listing-initial",
      unitPrice: "20.00",
      quantity: "1",
      unitCogs: "5.00",
      listingType: "standard",
      inventoryOutcome: "sold-out",
      statementDebitOverride: "",
    },
  ],
  etsyCoupon: "",
  salesTax: "",
  processingGrossOverride: "",
  coloradoPhysicalOrder: false,
  coloradoFee: "0.31",
  carrierAdjustment: "",
  orderStatus: "completed",
  channel: "etsy",
});

const makeTargetDraft = (): TargetDraft => ({
  ...DEFAULT_SHARED,
  quantity: "1",
  unitCogs: "5.00",
  taxScenario: "",
  effectiveTaxRate: "",
  targetType: "profit",
  targetValue: "10.00",
});

function parseScaledDecimal(value: string, decimalPlaces: number): number | null {
  const normalized = value.trim();
  const match = normalized.match(new RegExp(`^(?:0|[1-9]\\d*)(?:\\.(\\d{1,${decimalPlaces}}))?$`));
  if (!match) return null;
  const [wholePart] = normalized.split(".");
  const fraction = (match[1] ?? "").padEnd(decimalPlaces, "0");
  const result = Number(wholePart) * 10 ** decimalPlaces + Number(fraction || 0);
  return Number.isSafeInteger(result) ? result : null;
}

function parseMoney(value: string): number | null {
  return parseScaledDecimal(value, 2);
}

function parseOptionalMoney(value: string): number | null {
  return value.trim() === "" ? 0 : parseMoney(value);
}

function parseRate(value: string): number | null {
  return parseScaledDecimal(value, 4);
}

function formatMoney(cents: number): string {
  return USD.format(cents / 100);
}

function formatDebit(cents: number): string {
  if (cents === 0) return formatMoney(0);
  return cents > 0 ? `−${formatMoney(cents)}` : `+${formatMoney(-cents)}`;
}

function formatPercent(basisPoints: number | null): string {
  return basisPoints === null ? "N/A" : `${(basisPoints / 100).toFixed(2)}%`;
}

function formatRatePpm(ratePpm: number): string {
  return `${(ratePpm / 10_000).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })}%`;
}

function attributionToDomain(attribution: Attribution): DomainAttribution {
  const values: Record<Attribution, DomainAttribution> = {
    none: "none",
    "offsite-15": "offsite_ads_15",
    "offsite-12": "offsite_ads_12",
    "share-4": "share_save_4",
    "share-intro": "share_save_intro_6_5",
  };
  return values[attribution];
}

function buildDiscount(
  type: SharedDraft["discountType"],
  value: string,
  errors: ErrorMap,
): DiscountInput {
  if (type === "none") return { kind: "none" };
  if (type === "fixed") {
    const amount = parseMoney(value);
    if (amount === null) errors.discountValue = "Enter a non-negative amount with no more than two decimals.";
    return { kind: "fixed", amountCents: amount ?? 0 };
  }
  const rate = parseRate(value);
  if (rate === null || rate >= 1_000_000) {
    errors.discountValue = "Enter a discount from 0% up to, but not including, 100%, with up to four decimals.";
  }
  return { kind: "percentage", ratePpm: rate ?? 0 };
}

function readMoney(
  value: string,
  field: string,
  label: string,
  errors: ErrorMap,
  required = false,
): number {
  if (value.trim() === "" && required) {
    errors[field] = `${label} is required.`;
    return 0;
  }
  const parsed = parseOptionalMoney(value);
  if (parsed === null) {
    errors[field] = `${label} must be a non-negative amount with no more than two decimals.`;
    return 0;
  }
  return parsed;
}

function readQuantity(value: string, field: string, errors: ErrorMap, allowZero = false): number {
  if (!/^\d+$/.test(value.trim())) {
    errors[field] = "Enter a whole number.";
    return allowZero ? 0 : 1;
  }
  const quantity = Number(value);
  const minimum = allowZero ? 0 : 1;
  if (!Number.isSafeInteger(quantity) || quantity < minimum || quantity > 9_999) {
    errors[field] = `Enter a whole number from ${minimum.toLocaleString()} to 9,999.`;
    return minimum;
  }
  return quantity;
}

function contextFor(draft: Pick<SharedDraft, "shopState">, channel = "ETSY_MARKETPLACE", scenario = "standard") {
  return {
    sellerCountry: "US",
    sellerState: draft.shopState === "texas" ? "TX" : "OTHER_US",
    bankCountry: "US",
    channel,
    listingCurrency: "USD",
    paymentAccountCurrency: "USD",
    productType: "physical" as const,
    orderScenario: scenario as "standard" | "refund" | "cancellation" | "chargeback" | "purchase_protection",
    timing: "current" as const,
  };
}

function buildSharedCosts(draft: SharedDraft, errors: ErrorMap) {
  return {
    fulfillmentShipping: {
      amountCents: readMoney(draft.fulfillmentShipping, "fulfillmentShipping", "Shipping label", errors),
      billingChannel: draft.shippingBilling === "etsy" ? ("etsy_payment_account" as const) : ("external" as const),
    },
    insurance: {
      amountCents: readMoney(draft.insurance, "insurance", "Shipping insurance", errors),
      billingChannel: draft.insuranceBilling === "etsy" ? ("etsy_payment_account" as const) : ("external" as const),
    },
    packaging: {
      amountCents: readMoney(draft.packaging, "packaging", "Packaging", errors),
      billingChannel: "external" as const,
    },
    variableLabor: {
      amountCents: readMoney(draft.labor, "labor", "Variable labor", errors),
      billingChannel: "external" as const,
    },
    other: {
      amountCents: readMoney(draft.otherCosts, "otherCosts", "Other variable costs", errors),
      billingChannel: "external" as const,
    },
  };
}

function buildEligibility(draft: SharedDraft) {
  return {
    offsiteAds12Confirmed: draft.confirmsOffsite12,
    shareSaveIntroConfirmed: draft.confirmsShareIntro,
    shareSaveIntroEndsOn: draft.shareIntroEnds || undefined,
  };
}

function buildManualAdjustments(draft: SharedDraft, errors: ErrorMap) {
  const debit = readMoney(draft.manualFeeDebit, "manualFeeDebit", "Additional Etsy fee debit", errors);
  const credit = readMoney(draft.manualFeeCredit, "manualFeeCredit", "Additional Etsy fee credit", errors);
  return [
    ...(debit > 0
      ? [{ kind: "etsy_fee_debit" as const, amountCents: debit, appliesTo: "both" as const, label: "Manual Etsy fee debit" }]
      : []),
    ...(credit > 0
      ? [{ kind: "etsy_fee_credit" as const, amountCents: credit, appliesTo: "both" as const, label: "Manual Etsy fee credit" }]
      : []),
  ];
}

function makeOrderInput(draft: OrderDraft): { input: OrderCalculationInput; errors: ErrorMap } {
  const errors: ErrorMap = {};
  const isStatement = draft.basis === "statement";
  const listings = draft.listings.map((listing, index) => {
    const actualDebitCount = isStatement && listing.statementDebitOverride.trim()
      ? readQuantity(listing.statementDebitOverride, `listings.${index}.statementDebitOverride`, errors, true)
      : undefined;
    return {
      id: listing.id,
      unitListPriceCents: readMoney(
        listing.unitPrice,
        `listings.${index}.unitPrice`,
        `Listing ${index + 1} unit price`,
        errors,
        true,
      ),
      quantity: readQuantity(listing.quantity, `listings.${index}.quantity`, errors),
      unitCogsCents: readMoney(
        listing.unitCogs,
        `listings.${index}.unitCogs`,
        `Listing ${index + 1} unit COGS`,
        errors,
        true,
      ),
      statement:
        draft.basis === "statement"
          ? {
              listingType: listing.listingType,
              initialListingFeePaid: true,
              inventoryAfterSale: listing.inventoryOutcome === "sold-out" ? ("sold_out" as const) : ("remains" as const),
              actualDebitCount,
            }
          : undefined,
    };
  });
  const etsyCoupon = readMoney(draft.etsyCoupon, "etsyCoupon", "Etsy-funded coupon", errors);
  const salesTax = readMoney(draft.salesTax, "salesTax", "Sales tax", errors, true);
  const processingGross = isStatement && draft.processingGrossOverride.trim()
    ? readMoney(draft.processingGrossOverride, "processingGrossOverride", "Actual processing gross", errors)
    : undefined;
  const coloradoFee = isStatement && draft.coloradoPhysicalOrder
    ? readMoney(draft.coloradoFee, "coloradoFee", "Colorado retail delivery fee", errors, true)
    : 0;
  const carrierAdjustment = isStatement
    ? readMoney(
        draft.carrierAdjustment,
        "carrierAdjustment",
        "Carrier adjustment debit",
        errors,
      )
    : 0;
  const etsyAds = readMoney(draft.etsyAds, "etsyAds", "Allocated Etsy Ads spend", errors);
  const discount = buildDiscount(draft.discountType, draft.discountValue, errors);
  if (draft.discountType !== "none" && (discount.kind !== "none" && ("amountCents" in discount ? discount.amountCents : discount.ratePpm) > 0) && etsyCoupon > 0) {
    errors.etsyCoupon = "Seller-funded and Etsy-funded discounts cannot be combined in version 1.";
  }
  if (draft.attribution === "share-intro" && etsyCoupon > 0) {
    errors.etsyCoupon =
      "An Etsy-funded coupon cannot be combined with the 6.5% Share & Save introductory credit in version 1.";
  }
  if (isStatement && draft.coloradoPhysicalOrder && processingGross === undefined) {
    errors.processingGrossOverride = "Enter the actual processing gross for a physical Colorado order.";
  }
  const statusMap = {
    completed: "standard",
    refunded: "refund",
    canceled: "cancellation",
    chargeback: "chargeback",
    protection: "purchase_protection",
  } as const;
  const channelMap = { etsy: "ETSY_MARKETPLACE", pattern: "PATTERN", square: "SQUARE" } as const;

  return {
    errors,
    input: {
      basis: draft.basis === "unit" ? "unit_economics" : "statement_estimate",
      context: {
        ...contextFor(draft, channelMap[draft.channel], statusMap[draft.orderStatus]),
        buyerDestinationState: isStatement && draft.coloradoPhysicalOrder ? "CO" : undefined,
      },
      listings,
      discount,
      personalizationCents: readMoney(draft.personalization, "personalization", "Personalization", errors),
      shippingChargedCents: readMoney(draft.shippingCharged, "shippingCharged", "Shipping charged", errors),
      giftWrapCents: readMoney(draft.giftWrap, "giftWrap", "Gift wrap", errors),
      etsyFundedCouponCents: etsyCoupon,
      salesTaxCents: salesTax,
      coloradoRetailDeliveryFeeCents: isStatement ? coloradoFee : 0,
      paymentProcessingGrossOverrideCents: processingGross,
      attribution: attributionToDomain(draft.attribution),
      eligibility: buildEligibility(draft),
      costs: buildSharedCosts(draft, errors),
      etsyAds: { allocatedCents: etsyAds, includeInStatement: draft.etsyAdsInStatement },
      manualAdjustments: [
        ...buildManualAdjustments(draft, errors),
        ...(isStatement && carrierAdjustment > 0
          ? [{ kind: "statement_only_debit" as const, amountCents: carrierAdjustment, label: "Carrier adjustment" }]
          : []),
      ],
    },
  };
}

function makeTargetInput(draft: TargetDraft): { input: TargetPriceInput; errors: ErrorMap } {
  const errors: ErrorMap = {};
  const quantity = readQuantity(draft.quantity, "quantity", errors);
  const etsyAds = readMoney(draft.etsyAds, "etsyAds", "Allocated Etsy Ads spend", errors);
  let taxScenario: TargetPriceInput["taxScenario"];
  if (!draft.taxScenario) {
    errors.taxScenario = "Choose how sales tax should be estimated.";
  } else if (draft.taxScenario === "none") {
    taxScenario = { kind: "no_tax" };
  } else {
    const rate = parseRate(draft.effectiveTaxRate);
    if (rate === null || rate >= 1_000_000) {
      errors.effectiveTaxRate = "Enter a tax rate from 0% up to, but not including, 100%.";
    }
    taxScenario = { kind: "custom_effective_rate_on_r", ratePpm: rate ?? 0 };
  }

  const targetParsed = draft.targetType === "profit" ? parseMoney(draft.targetValue) : parseRate(draft.targetValue);
  if (targetParsed === null || (draft.targetType === "margin" && targetParsed >= 1_000_000)) {
    errors.targetValue =
      draft.targetType === "profit"
        ? "Enter a non-negative target with no more than two decimals."
        : "Enter a margin from 0% up to, but not including, 100%.";
  }

  return {
    errors,
    input: {
      context: contextFor(draft),
      quantity,
      unitCogsCents: readMoney(draft.unitCogs, "unitCogs", "Unit COGS", errors, true),
      discount: buildDiscount(draft.discountType, draft.discountValue, errors),
      personalizationCents: readMoney(draft.personalization, "personalization", "Personalization", errors),
      shippingChargedCents: readMoney(draft.shippingCharged, "shippingCharged", "Shipping charged", errors),
      giftWrapCents: readMoney(draft.giftWrap, "giftWrap", "Gift wrap", errors),
      taxScenario,
      target:
        draft.targetType === "profit"
          ? { kind: "profit", amountCents: targetParsed ?? 0 }
          : { kind: "margin", ratePpm: targetParsed ?? 0 },
      attribution: attributionToDomain(draft.attribution),
      eligibility: buildEligibility(draft),
      costs: buildSharedCosts(draft, errors),
      etsyAds: { allocatedCents: etsyAds },
      manualAdjustments: buildManualAdjustments(draft, errors),
    },
  };
}

function mapDomainError(error: CalculationFailure): ErrorMap {
  if (!error.issues?.length) {
    const fieldByCode: Partial<Record<CalculationFailure["code"], string>> = {
      UNSUPPORTED_CONTEXT: "channel",
      UNSUPPORTED_ORDER_SCENARIO: "orderStatus",
      UNSUPPORTED_DISCOUNT_COMBINATION: "etsyCoupon",
      PROCESSING_GROSS_REQUIRED: "processingGrossOverride",
      TAX_SCENARIO_REQUIRED: "taxScenario",
      TARGET_REQUIRED: "targetValue",
      INVALID_DISCOUNT: "discountValue",
    };
    return { [fieldByCode[error.code] ?? "_form"]: error.message };
  }
  const mapped: ErrorMap = {};
  error.issues.forEach((issue) => {
    let path = issue.path
      .replace(/\.unitListPriceCents$/, ".unitPrice")
      .replace(/\.unitCogsCents$/, ".unitCogs")
      .replace(/\.statement\.actualDebitCount$/, ".statementDebitOverride")
      .replace("discount.amountCents", "discountValue")
      .replace("discount.ratePpm", "discountValue")
      .replace("etsyFundedCouponCents", "etsyCoupon")
      .replace("salesTaxCents", "salesTax")
      .replace("paymentProcessingGrossOverrideCents", "processingGrossOverride")
      .replace("eligibility.offsiteAds12Confirmed", "confirmsOffsite12")
      .replace("eligibility.shareSaveIntroConfirmed", "confirmsShareIntro")
      .replace("eligibility.shareSaveIntroEndsOn", "shareIntroEnds")
      .replace("target.amountCents", "targetValue")
      .replace("target.ratePpm", "targetValue")
      .replace("taxScenario.ratePpm", "effectiveTaxRate");
    if (path === "discount") path = "discountValue";
    mapped[path] = issue.message;
  });
  return mapped;
}

function feeLines(calculation: OrderCalculation, statement: boolean): ResultLine[] {
  const sourceById = new Map(CURRENT_RATE_CATALOG.sources.map((source) => [source.sourceId, source]));
  return calculation.feeTrace
    .filter((line) =>
      line.projections.includes(statement ? "statement_estimate" : "unit_economics"),
    )
    .map((line) => {
      const details = [
        line.baseCents === undefined ? null : `Base ${formatMoney(line.baseCents)}`,
        line.ratePpm === undefined ? null : formatRatePpm(line.ratePpm),
        line.fixedAmountCents === undefined ? null : `${formatMoney(line.fixedAmountCents)} fixed`,
        line.capCents === undefined ? null : `${formatMoney(line.capCents)} cap`,
        line.evidenceStatus.replaceAll("_", " ").toLowerCase(),
        line.ruleRevisionId,
      ].filter((detail): detail is string => Boolean(detail));
      return {
        label: line.label,
        amount: `${line.direction === "credit" ? "+" : "−"}${formatMoney(line.amountCents)}`,
        kind: line.direction === "credit" ? ("credit" as const) : ("default" as const),
        meta: [line.note, details.join(" · ")].filter(Boolean).join(" "),
        sources: line.sourceIds
          .map((sourceId) => sourceById.get(sourceId))
          .filter((source): source is NonNullable<typeof source> => Boolean(source))
          .map((source) => ({ label: source.title, url: source.url })),
      };
    });
}

type CostTraceInput = Pick<OrderCalculationInput, "costs" | "etsyAds" | "manualAdjustments">;

function billingMeta(channel: "external" | "etsy_payment_account"): string {
  return channel === "etsy_payment_account" ? "Paid through Etsy Payment Account" : "Paid outside Etsy";
}

function contributionCostLines(
  calculation: OrderCalculation,
  input: CostTraceInput,
): ResultLine[] {
  const costRows = [
    { label: "Fulfillment shipping", line: input.costs?.fulfillmentShipping },
    { label: "Shipping insurance", line: input.costs?.insurance },
    { label: "Packaging", line: input.costs?.packaging },
    { label: "Variable labor", line: input.costs?.variableLabor },
    { label: "Other variable operating costs", line: input.costs?.other },
  ];
  const manualOperatingRows: ResultLine[] = (input.manualAdjustments ?? [])
    .filter((adjustment) => adjustment.kind === "operating_cost")
    .map((adjustment) => ({
      label: adjustment.label || "Manual operating cost",
      amount: formatDebit(adjustment.amountCents),
      meta: billingMeta(adjustment.billingChannel),
    }));

  return [
    { label: "Cost of goods", amount: formatDebit(calculation.amounts.totalCogsCents) },
    ...costRows.map(({ label, line }) => ({
      label,
      amount: formatDebit(line?.amountCents ?? 0),
      meta: billingMeta(line?.billingChannel ?? "external"),
    })),
    ...manualOperatingRows,
    {
      label: "Allocated Etsy Ads",
      amount: formatDebit(calculation.unitEconomics.marketingSpendCents),
      meta: "Seller-entered allocation; not an official order attribution",
    },
  ];
}

function statementOperationalLines(input: CostTraceInput): ResultLine[] {
  const namedCosts = [
    { label: "Fulfillment shipping", line: input.costs?.fulfillmentShipping },
    { label: "Shipping insurance", line: input.costs?.insurance },
    { label: "Packaging", line: input.costs?.packaging },
    { label: "Variable labor", line: input.costs?.variableLabor },
    { label: "Other operating cost", line: input.costs?.other },
  ];
  const etsyBilled = namedCosts
    .filter(({ line }) => line?.billingChannel === "etsy_payment_account" && line.amountCents > 0)
    .map(({ label, line }) => ({ label, amount: formatDebit(line?.amountCents ?? 0) }));
  const adjustmentLines: ResultLine[] = [];
  for (const adjustment of input.manualAdjustments ?? []) {
    if (adjustment.kind === "operating_cost" && adjustment.billingChannel === "etsy_payment_account") {
      adjustmentLines.push({
        label: adjustment.label || "Etsy-billed operating cost",
        amount: formatDebit(adjustment.amountCents),
      });
    } else if (adjustment.kind === "statement_only_debit") {
      adjustmentLines.push({
        label: adjustment.label || "Statement-only debit",
        amount: formatDebit(adjustment.amountCents),
      });
    } else if (adjustment.kind === "statement_only_credit") {
      adjustmentLines.push({
        label: adjustment.label || "Statement-only credit",
        amount: `+${formatMoney(adjustment.amountCents)}`,
        kind: "credit",
      });
    }
  }
  if (input.etsyAds?.includeInStatement && input.etsyAds.allocatedCents > 0) {
    adjustmentLines.push({
      label: "Etsy Ads included in account activity",
      amount: formatDebit(input.etsyAds.allocatedCents),
    });
  }
  return [...etsyBilled, ...adjustmentLines];
}

function orderResultView(calculation: OrderCalculation, input: CostTraceInput): ResultViewModel {
  const unit = calculation.unitEconomics;
  const statement = calculation.basis === "statement_estimate" ? calculation.statementEstimate : undefined;
  const isStatement = statement !== undefined;
  const primaryCents = statement?.estimatedPaymentAccountChangeCents ?? unit.contributionProfitCents;
  return {
    eyebrow: isStatement ? "Estimated Payment Account change" : "Estimated contribution profit",
    headline: formatMoney(primaryCents),
    headlineLabel: isStatement ? "Order-linked account activity" : "After marketplace fees and variable costs",
    description: isStatement
      ? `Contribution profit remains ${formatMoney(unit.contributionProfitCents)} under the Unit economics view.`
      : `${formatMoney(unit.proceedsAfterEtsyFeesCents)} remains after net Etsy marketplace fees.`,
    metrics: statement
      ? [
          { label: "Statement fee rate", value: formatPercent(statement.statementFeeRate.basisPoints) },
          { label: "Contribution profit", value: formatMoney(unit.contributionProfitCents) },
          { label: "Listing debits", value: String(statement.listingFeeDebitCount) },
        ]
      : [
          { label: "Contribution margin", value: formatPercent(unit.contributionMargin.basisPoints) },
          { label: "Contribution ROI", value: formatPercent(unit.contributionRoi.basisPoints) },
          { label: "Avg. profit per item", value: formatMoney(unit.averageProfitPerItemCents) },
          { label: "Effective Etsy fee rate", value: formatPercent(unit.effectiveEtsyFeeRate.basisPoints) },
          { label: "All-in variable cost rate", value: formatPercent(unit.allInVariableCostRate.basisPoints) },
        ],
    sections: [
      {
        title: "Order revenue",
        lines: [
          { label: "Merchandise subtotal", amount: formatMoney(calculation.amounts.merchandiseSubtotalCents) },
          ...(calculation.amounts.sellerFundedDiscountCents
            ? [{ label: "Seller-funded discount", amount: `−${formatMoney(calculation.amounts.sellerFundedDiscountCents)}` }]
            : []),
          ...(calculation.amounts.personalizationCents
            ? [{ label: "Personalization", amount: formatMoney(calculation.amounts.personalizationCents) }]
            : []),
          ...(calculation.amounts.shippingChargedCents
            ? [{ label: "Shipping charged", amount: formatMoney(calculation.amounts.shippingChargedCents) }]
            : []),
          ...(calculation.amounts.giftWrapCents
            ? [{ label: "Gift wrap", amount: formatMoney(calculation.amounts.giftWrapCents) }]
            : []),
          { label: "Seller gross order revenue", amount: formatMoney(calculation.amounts.sellerOrderRevenueCents), kind: "total" },
          ...(calculation.amounts.salesTaxCents
            ? [{ label: "Sales tax (pass-through)", amount: formatMoney(calculation.amounts.salesTaxCents), kind: "muted" as const }]
            : []),
          ...(calculation.amounts.etsyFundedCouponCents
            ? [{ label: "Etsy-funded coupon", amount: `−${formatMoney(calculation.amounts.etsyFundedCouponCents)}`, kind: "muted" as const }]
            : []),
          ...(calculation.amounts.coloradoRetailDeliveryFeeCents
            ? [{ label: "Colorado delivery fee (pass-through)", amount: formatMoney(calculation.amounts.coloradoRetailDeliveryFeeCents), kind: "muted" as const }]
            : []),
          { label: "Buyer checkout total", amount: formatMoney(calculation.amounts.buyerCheckoutTotalCents), kind: "muted" },
          { label: "Payment processing gross (P)", amount: formatMoney(calculation.amounts.paymentProcessingGrossCents), kind: "muted" },
        ],
      },
      {
        title: isStatement ? "Payment Account fees" : "Net Etsy marketplace fees",
        lines: [
          ...feeLines(calculation, isStatement),
          {
            label: isStatement ? "Net statement fees" : "Net Etsy fees",
            amount: formatDebit(statement?.netEtsyStatementFeesCents ?? unit.netEtsyMarketplaceFeesCents),
            kind: "total",
          },
        ],
      },
      ...(statement
        ? [
            {
              title: "Account activity",
              lines: [
                { label: "Seller revenue", amount: formatMoney(calculation.amounts.sellerOrderRevenueCents) },
                ...statementOperationalLines(input),
                { label: "Etsy-billed operational debits", amount: formatDebit(statement.etsyAccountOperationalDebitsCents), kind: "total" as const },
                { label: "Estimated account change", amount: formatMoney(statement.estimatedPaymentAccountChangeCents), kind: "total" as const },
              ],
            },
            {
              title: "Unit economics (secondary)",
              lines: [
                { label: "Allocated listing fee", amount: formatDebit(unit.listingFeeCents), meta: "Included in net Etsy marketplace fees" },
                { label: "Net Etsy marketplace fees", amount: formatDebit(unit.netEtsyMarketplaceFeesCents), meta: "Subtotal including the listing allocation above" },
                ...contributionCostLines(calculation, input),
                { label: "Total net variable costs", amount: formatDebit(unit.totalNetVariableCostsCents) },
                { label: "Contribution profit", amount: formatMoney(unit.contributionProfitCents), kind: "total" as const },
              ],
            },
          ]
        : [
            {
              title: "Variable costs",
              lines: [
                ...contributionCostLines(calculation, input),
                { label: "Total net variable costs", amount: formatDebit(unit.totalNetVariableCostsCents), kind: "total" as const },
              ],
            },
          ]),
    ],
    catalogId: calculation.catalogReleaseId,
    contractVersion: calculation.calculationContractVersion,
    notices: calculation.assumptions,
    isLoss: primaryCents < 0,
  };
}

function targetResultView(result: TargetPriceCalculation, input: CostTraceInput): ResultViewModel {
  const calculation = result.calculation;
  const unit = calculation.unitEconomics;
  return {
    eyebrow: "Minimum unit listing price",
    headline: formatMoney(result.minimumUnitListPriceCents),
    headlineLabel: "Pre-discount price per item",
    description: `At this price, the modeled order contributes ${formatMoney(unit.contributionProfitCents)}. No lower valid whole-cent price in the search domain meets the target.`,
    metrics: [
      { label: "Order revenue", value: formatMoney(calculation.amounts.sellerOrderRevenueCents) },
      { label: "Contribution margin", value: formatPercent(unit.contributionMargin.basisPoints) },
      { label: "Order quantity", value: String(calculation.amounts.totalQuantity) },
      { label: "Effective Etsy fee rate", value: formatPercent(unit.effectiveEtsyFeeRate.basisPoints) },
    ],
    sections: [
      {
        title: "Price scenario",
        lines: [
          {
            label: result.target.kind === "profit" ? "Requested order profit" : "Requested contribution margin",
            amount:
              result.target.kind === "profit"
                ? formatMoney(result.target.amountCents)
                : formatRatePpm(result.target.ratePpm),
          },
          { label: "Unit list price", amount: formatMoney(result.minimumUnitListPriceCents) },
          { label: "Merchandise subtotal", amount: formatMoney(calculation.amounts.merchandiseSubtotalCents) },
          ...(calculation.amounts.sellerFundedDiscountCents
            ? [{ label: "Seller-funded discount", amount: `−${formatMoney(calculation.amounts.sellerFundedDiscountCents)}` }]
            : []),
          ...(calculation.amounts.personalizationCents
            ? [{ label: "Personalization", amount: formatMoney(calculation.amounts.personalizationCents) }]
            : []),
          ...(calculation.amounts.shippingChargedCents
            ? [{ label: "Shipping charged", amount: formatMoney(calculation.amounts.shippingChargedCents) }]
            : []),
          ...(calculation.amounts.giftWrapCents
            ? [{ label: "Gift wrap", amount: formatMoney(calculation.amounts.giftWrapCents) }]
            : []),
          { label: "Seller gross order revenue", amount: formatMoney(calculation.amounts.sellerOrderRevenueCents), kind: "total" },
          {
            label: "Sales tax scenario",
            amount:
              result.taxScenario.kind === "no_tax"
                ? "No tax"
                : `${formatRatePpm(result.taxScenario.ratePpm)} of R`,
            kind: "muted",
          },
          { label: "Estimated sales tax (T)", amount: formatMoney(calculation.amounts.salesTaxCents), kind: "muted" },
          { label: "Payment processing gross (P)", amount: formatMoney(calculation.amounts.paymentProcessingGrossCents), kind: "muted" },
        ],
      },
      {
        title: "Etsy fees",
        lines: [
          ...feeLines(calculation, false),
          { label: "Net Etsy fees", amount: formatDebit(unit.netEtsyMarketplaceFeesCents), kind: "total" },
        ],
      },
      {
        title: "Target result",
        lines: [
          ...contributionCostLines(calculation, input),
          { label: "Total net variable costs", amount: formatDebit(unit.totalNetVariableCostsCents) },
          { label: "Contribution profit", amount: formatMoney(unit.contributionProfitCents), kind: "total" },
        ],
      },
    ],
    catalogId: calculation.catalogReleaseId,
    contractVersion: calculation.calculationContractVersion,
    notices: [
      ...calculation.assumptions,
      "The $1,000,000 search ceiling is a MarginGauge guardrail, not an Etsy listing-price limit.",
    ],
  };
}

function calculateInitialOrder(): ResultViewModel | null {
  const { input, errors } = makeOrderInput(makeOrderDraft());
  if (Object.keys(errors).length) return null;
  const result = calculateOrder(input);
  return result.ok ? orderResultView(result.value, input) : null;
}

export default function App() {
  const [mode, setMode] = useState<CalculatorMode>("order");
  const [orderDraft, setOrderDraft] = useState<OrderDraft>(makeOrderDraft);
  const [targetDraft, setTargetDraft] = useState<TargetDraft>(makeTargetDraft);
  const [orderResult, setOrderResult] = useState<ResultViewModel | null>(calculateInitialOrder);
  const [targetResult, setTargetResult] = useState<ResultViewModel | null>(null);
  const [orderErrors, setOrderErrors] = useState<ErrorMap>({});
  const [targetErrors, setTargetErrors] = useState<ErrorMap>({});
  const [orderDirty, setOrderDirty] = useState(false);
  const [targetDirty, setTargetDirty] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);

  const activeResult = mode === "order" ? orderResult : targetResult;
  const activeDirty = mode === "order" ? orderDirty : targetDirty;
  const catalogRuleCount = useMemo(() => CURRENT_RATE_CATALOG.ruleRevisionIds.length, []);

  useEffect(() => {
    if (!pendingFocusId) return;
    document.getElementById(pendingFocusId)?.focus();
    setPendingFocusId(null);
  }, [pendingFocusId]);

  const focusAfterCalculation = (success: boolean) => {
    setPendingFocusId(success ? "calculator-result-heading" : "calculator-errors");
  };

  const calculateOrderDraft = () => {
    const built = makeOrderInput(orderDraft);
    if (Object.keys(built.errors).length) {
      setOrderErrors(built.errors);
      focusAfterCalculation(false);
      return;
    }
    setCalculating(true);
    window.setTimeout(() => {
      const calculated = calculateOrder(built.input);
      setCalculating(false);
      if (!calculated.ok) {
        setOrderErrors(mapDomainError(calculated.error));
        focusAfterCalculation(false);
        return;
      }
      setOrderErrors({});
      setOrderResult(orderResultView(calculated.value, built.input));
      setOrderDirty(false);
      focusAfterCalculation(true);
    }, 0);
  };

  const calculateTargetDraft = () => {
    const built = makeTargetInput(targetDraft);
    if (Object.keys(built.errors).length) {
      setTargetErrors(built.errors);
      focusAfterCalculation(false);
      return;
    }
    setCalculating(true);
    window.setTimeout(() => {
      const calculated = calculateTargetPrice(built.input);
      setCalculating(false);
      if (!calculated.ok) {
        setTargetErrors(mapDomainError(calculated.error));
        focusAfterCalculation(false);
        return;
      }
      setTargetErrors({});
      setTargetResult(targetResultView(calculated.value, built.input));
      setTargetDirty(false);
      focusAfterCalculation(true);
    }, 0);
  };

  return (
    <div className="site-shell">
      <a
        className="skip-link"
        href="#calculator-mode-order"
        onClick={() => {
          window.setTimeout(() => document.getElementById("calculator-mode-order")?.focus(), 0);
        }}
      >
        Skip to calculator
      </a>
      <header className="site-header">
        <div
          className="header-inner"
          onKeyDown={(event) => {
            if (event.key === "Escape" && mobileNavOpen) {
              setMobileNavOpen(false);
              document.getElementById("mobile-menu-button")?.focus();
            }
          }}
        >
          <a className="brand" href="/" aria-label="MarginGauge home">
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            MarginGauge
          </a>
          <button
            id="mobile-menu-button"
            type="button"
            className="icon-button menu-button"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
          <nav
            id="mobile-navigation"
            className={mobileNavOpen ? "is-open" : ""}
            aria-label="Primary navigation"
          >
            <a href="#calculator" onClick={() => setMobileNavOpen(false)}>Calculator</a>
            <a href="#fee-guide" onClick={() => setMobileNavOpen(false)}>Fee guide</a>
            <a href="#methodology" onClick={() => setMobileNavOpen(false)}>Methodology</a>
            <a href="#guides" onClick={() => setMobileNavOpen(false)}>Guides</a>
            <a href="#faq" onClick={() => setMobileNavOpen(false)}>FAQ</a>
            <a href="/about/" onClick={() => setMobileNavOpen(false)}>About</a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="tool-intro" aria-labelledby="page-title">
          <div>
            <p className="scope-line">
              <ShieldCheck size={16} aria-hidden="true" />
              Etsy US · USD · Current orders
            </p>
            <h1 id="page-title">{SITE_METADATA.heading}</h1>
            <p className="tool-subtitle">
              Model contribution profit, order-linked account activity, or the minimum price for your target.
            </p>
          </div>
          <div className="verification-block">
            <span>{SITE_METADATA.ratesVerifiedLabel}</span>
            <strong>{catalogRuleCount} versioned fee rules</strong>
          </div>
        </section>

        <section className="calculator-section" id="calculator" aria-label="Etsy calculator">
          <div className="calculator-toolbar">
            <div className="mode-tabs" role="group" aria-label="Calculator mode">
              <button
                id="calculator-mode-order"
                type="button"
                aria-pressed={mode === "order"}
                className={mode === "order" ? "is-active" : ""}
                onClick={() => setMode("order")}
              >
                Order profit
              </button>
              <button
                type="button"
                aria-pressed={mode === "target"}
                className={mode === "target" ? "is-active" : ""}
                onClick={() => setMode("target")}
              >
                Target price
              </button>
            </div>
            {mode === "order" && (
              <details className="basis-picker">
                <summary>
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  Calculation basis
                  <span>{orderDraft.basis === "unit" ? "Unit economics" : "Payment Account"}</span>
                  <ChevronDown size={15} aria-hidden="true" />
                </summary>
                <div className="basis-popover">
                  <SegmentedControl
                    label="Calculation basis"
                    value={orderDraft.basis}
                    options={[
                      { value: "unit", label: "Unit economics", description: "Long-run contribution" },
                      { value: "statement", label: "Payment Account", description: "Order-linked activity" },
                    ]}
                    onChange={(basis) => {
                      setOrderDraft((draft) => ({ ...draft, basis }));
                      setOrderDirty(Boolean(orderResult));
                    }}
                  />
                </div>
              </details>
            )}
            {mode === "target" && <span className="target-basis-label">Unit economics basis</span>}
          </div>

          <div className="calculator-frame">
            <div className="form-pane" id="calculator-input-panel">
              {mode === "order" ? (
                <OrderForm
                  draft={orderDraft}
                  errors={orderErrors}
                  dirty={orderDirty}
                  calculating={calculating}
                  onDraftChange={(draft) => {
                    setOrderDraft(draft);
                    setOrderDirty(Boolean(orderResult));
                  }}
                  onSubmit={calculateOrderDraft}
                  onReset={() => {
                    const draft = makeOrderDraft();
                    setOrderDraft(draft);
                    setOrderErrors({});
                    setOrderResult(calculateInitialOrder());
                    setOrderDirty(false);
                  }}
                />
              ) : (
                <TargetForm
                  draft={targetDraft}
                  errors={targetErrors}
                  dirty={targetDirty}
                  calculating={calculating}
                  onDraftChange={(draft) => {
                    setTargetDraft(draft);
                    setTargetDirty(Boolean(targetResult));
                  }}
                  onSubmit={calculateTargetDraft}
                  onReset={() => {
                    setTargetDraft(makeTargetDraft());
                    setTargetErrors({});
                    setTargetResult(null);
                    setTargetDirty(false);
                  }}
                />
              )}
            </div>
            <ResultPanel mode={mode} result={activeResult} dirty={activeDirty} calculating={calculating} />
          </div>
          <p className="tool-disclaimer">
            {SITE_METADATA.disclaimer} Etsy does not publish every intermediate rounding step, so statements may differ by $0.01 or more.
          </p>
        </section>

        <ContentSections />
      </main>

      <footer className="site-footer">
        <div>
          <a className="brand footer-brand" href="/">MarginGauge</a>
          <p>Independent margin tools for marketplace sellers.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#methodology">Methodology</a>
          <a href="#guides">Guides</a>
          <a href="/privacy/">Privacy</a>
          <a href="/terms/">Terms</a>
          <a href="/disclaimer/">Disclaimer</a>
          <a href="https://www.etsy.com/legal/fees/" target="_blank" rel="noreferrer">
            Etsy fee policy <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </nav>
        <p className="copyright">© 2026 MarginGauge. Not affiliated with Etsy, Inc.</p>
      </footer>
    </div>
  );
}
