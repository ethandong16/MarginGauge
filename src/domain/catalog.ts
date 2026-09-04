import type {
  CalculationContext,
  DomainResult,
  FeeRuleRevision,
  RateCatalogRelease,
  RuleApplicability,
  RuleFamilyId,
  SourceEvidence,
} from "./types";

const VERIFIED_AT = "2026-09-03T00:00:00+08:00";
const ACTIVATED_AT = "2026-09-03T00:00:00+08:00";

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

const sources: SourceEvidence[] = [
  {
    sourceId: "etsy-fees-policy-2026-02-13",
    url: "https://www.etsy.com/legal/fees/",
    title: "Fees & Payments Policy",
    sourceType: "LEGAL_POLICY",
    section: "Transaction Fees; Listing Fees; Offsite Ads Fees",
    excerpt:
      "Etsy charges a 6.5% transaction fee and a $0.20 USD listing fee; Offsite Ads orders use the applicable 12% or 15% rate and are capped at $100 USD per order.",
    supports: ["transaction rate", "transaction base", "listing amount", "offsite rates", "offsite cap"],
    sourceUpdatedAt: "2026-02-13",
    accessedAt: VERIFIED_AT,
    contentHash: null,
    snapshotId: null,
    verification: "CONFIRMED",
  },
  {
    sourceId: "etsy-payments-policy-2026-07-31",
    url: "https://www.etsy.com/legal/etsy-payments/",
    title: "Etsy Payments Policy",
    sourceType: "LEGAL_POLICY",
    section: "Payment Processing Fees",
    excerpt:
      "For sellers with a United States bank account, the payment processing fee is 3% of the total sale price plus $0.25 USD per order.",
    supports: ["US payment processing rate", "US fixed processing amount", "processing scope"],
    sourceUpdatedAt: "2026-07-31",
    accessedAt: VERIFIED_AT,
    contentHash: null,
    snapshotId: null,
    verification: "CONFIRMED",
  },
  {
    sourceId: "etsy-advertising-policy-2026-06-08",
    url: "https://www.etsy.com/legal/advertising/",
    title: "Advertising & Marketing Policy",
    sourceType: "LEGAL_POLICY",
    section: "Offsite Ads",
    excerpt:
      "The standard fee for attributed orders is 15%; qualifying shops are charged 12%, with an Offsite Ads fee cap of $100 USD for a single order.",
    supports: ["offsite attribution", "offsite rates", "offsite cap"],
    sourceUpdatedAt: "2026-06-08",
    accessedAt: VERIFIED_AT,
    contentHash: null,
    snapshotId: null,
    verification: "CONFIRMED",
  },
  {
    sourceId: "etsy-multiple-quantity-help-2026-09-03",
    url: "https://help.etsy.com/hc/en-us/articles/360000344908-Fees-and-Listing-Multiple-Quantities",
    title: "Fees and Listing Multiple Quantities",
    sourceType: "HELP_CENTER",
    section: "Multiple quantities and auto-renew sold fees",
    excerpt:
      "When multiple quantities sell, Etsy may charge additional $0.20 USD listing fees for the extra quantities and a renewal when inventory remains.",
    supports: ["listing fee amount", "multiple-quantity events", "sold renewal"],
    sourceUpdatedAt: null,
    accessedAt: VERIFIED_AT,
    contentHash: null,
    snapshotId: null,
    verification: "PARTIAL",
  },
  {
    sourceId: "etsy-share-save-help-2026-09-03",
    url: "https://help.etsy.com/hc/en-us/articles/16981332744087-How-to-Save-on-Etsy-Fees-with-the-Share-Save-Program",
    title: "How to Save on Etsy Fees with the Share & Save Program",
    sourceType: "HELP_CENTER",
    section: "Fee refund",
    excerpt:
      "Eligible Share & Save orders receive a refund of 4% of the eligible order total.",
    supports: ["share-save standard credit rate", "eligible order total"],
    sourceUpdatedAt: null,
    accessedAt: VERIFIED_AT,
    contentHash: null,
    snapshotId: null,
    verification: "CONFIRMED",
  },
  {
    sourceId: "etsy-funded-coupons-help-2026-09-03",
    url: "https://help.etsy.com/hc/en-us/articles/1500005142242-How-Etsy-Funded-Coupons-Work-For-Sellers",
    title: "How Etsy Funded Coupons Work For Sellers",
    sourceType: "HELP_CENTER",
    section: "Seller proceeds, fees, and Share & Save",
    excerpt:
      "The seller receives the full order amount and pays the usual seller fees as if the coupon were not used; Share & Save is based on the order total less the promotional discount.",
    supports: [
      "Etsy-funded coupon seller proceeds",
      "ordinary seller-fee treatment",
      "Share & Save base after promotional discount",
    ],
    sourceUpdatedAt: null,
    accessedAt: VERIFIED_AT,
    contentHash: null,
    snapshotId: null,
    verification: "CONFIRMED",
  },
  {
    sourceId: "etsy-share-save-intro-terms-2026-09-03",
    url: "https://www.etsy.com/legal/policy/share-save-intro-promotion-terms/1498028396575",
    title: "Share & Save Intro Promotion Terms",
    sourceType: "PROGRAM_TERMS",
    section: "Promotion benefit and eligibility period",
    excerpt:
      "Eligible invited sellers may receive a 6.5% refund during their individual 14-day introductory promotion period.",
    supports: ["share-save introductory credit rate", "invitation", "14-day eligibility"],
    sourceUpdatedAt: null,
    accessedAt: VERIFIED_AT,
    contentHash: null,
    snapshotId: null,
    verification: "CONFIRMED",
  },
  {
    sourceId: "etsy-texas-fee-tax-help-2026-09-03",
    url: "https://help.etsy.com/hc/en-us/articles/35267490737431-What-are-Sales-and-Use-Taxes-on-Seller-Fees-in-Texas",
    title: "What are Sales and Use Taxes on Seller Fees in Texas?",
    sourceType: "HELP_CENTER",
    section: "Taxable portion and tax rate",
    excerpt:
      "Beginning October 1, 2025, 80% of the Etsy transaction fee is subject to Texas sales tax at 6.25%.",
    supports: ["Texas effective date", "taxable portion", "Texas rate", "transaction-fee scope"],
    sourceUpdatedAt: null,
    accessedAt: VERIFIED_AT,
    contentHash: null,
    snapshotId: null,
    verification: "CONFIRMED",
  },
];

const allUsApplicability: RuleApplicability = {
  platform: "ETSY",
  channels: ["ETSY_MARKETPLACE"],
  sellerCountries: ["US"],
  sellerStates: ["ANY"],
  bankCountries: ["US"],
  buyerDestinationStates: ["ANY"],
  productTypes: ["ANY"],
  listingCurrencies: ["USD"],
  paymentAccountCurrencies: ["USD"],
};

const currentEffectivity = (sourceUpdatedAt: string | null) => ({
  status: "NOT_PUBLISHED" as const,
  startsAt: null,
  endsAt: null,
  observedValidAt: VERIFIED_AT,
  sourceUpdatedAt,
  verifiedAt: VERIFIED_AT,
  catalogActivatedAt: ACTIVATED_AT,
});

const rules: FeeRuleRevision[] = [
  {
    ruleFamilyId: "transaction_fee",
    revisionId: "transaction-fee-us-2026-09-03.1",
    name: "Transaction fee",
    category: "marketplace_fee",
    direction: "DEBIT",
    occurrenceScope: "PER_ORDER",
    modes: ["unit_economics", "statement_estimate"],
    applicability: allUsApplicability,
    effectivity: currentEffectivity("2026-02-13"),
    formula: { type: "percentage", base: "R", ratePpm: 65_000 },
    calculationOrder: 10,
    rounding: "LINE_HALF_UP_TO_CENT",
    eligibility: [],
    exclusivityGroup: null,
    evidenceStatus: "OFFICIAL_CONFIRMED",
    behavior: "AUTOMATIC",
    targetCompatible: true,
    targetBounds: "MONOTONE_DEBIT",
    displayBucket: "ETSY_FEE_DEBIT",
    sourceIds: ["etsy-fees-policy-2026-02-13"],
  },
  {
    ruleFamilyId: "payment_processing_fee",
    revisionId: "payment-processing-us-2026-09-03.1",
    name: "Payment processing fee",
    category: "payment_fee",
    direction: "DEBIT",
    occurrenceScope: "PER_ORDER",
    modes: ["unit_economics", "statement_estimate"],
    applicability: allUsApplicability,
    effectivity: currentEffectivity("2026-07-31"),
    formula: { type: "percentage_plus_fixed", base: "P", ratePpm: 30_000, fixedCents: 25 },
    calculationOrder: 20,
    rounding: "LINE_HALF_UP_TO_CENT",
    eligibility: [],
    exclusivityGroup: null,
    evidenceStatus: "OFFICIAL_CONFIRMED",
    behavior: "AUTOMATIC",
    targetCompatible: true,
    targetBounds: "MONOTONE_DEBIT",
    displayBucket: "ETSY_FEE_DEBIT",
    sourceIds: ["etsy-payments-policy-2026-07-31"],
  },
  {
    ruleFamilyId: "unit_listing_allocation",
    revisionId: "unit-listing-allocation-us-2026-09-03.1",
    name: "Allocated listing fee",
    category: "listing_fee",
    direction: "DEBIT",
    occurrenceScope: "PER_SOLD_UNIT",
    modes: ["unit_economics"],
    applicability: allUsApplicability,
    effectivity: currentEffectivity("2026-02-13"),
    formula: { type: "fixed_per_sold_unit", amountCents: 20 },
    calculationOrder: 30,
    rounding: "EXACT_CENTS",
    eligibility: [],
    exclusivityGroup: null,
    evidenceStatus: "PRODUCT_CONVENTION",
    behavior: "AUTOMATIC",
    targetCompatible: true,
    targetBounds: "FIXED",
    displayBucket: "ETSY_FEE_DEBIT",
    sourceIds: ["etsy-fees-policy-2026-02-13", "etsy-multiple-quantity-help-2026-09-03"],
  },
  {
    ruleFamilyId: "statement_listing_debit",
    revisionId: "statement-listing-debit-us-2026-09-03.1",
    name: "Estimated statement listing debit",
    category: "listing_fee",
    direction: "DEBIT",
    occurrenceScope: "PER_LISTING_EVENT",
    modes: ["statement_estimate"],
    applicability: allUsApplicability,
    effectivity: currentEffectivity(null),
    formula: { type: "editable_listing_event_count", amountCents: 20 },
    calculationOrder: 30,
    rounding: "EXACT_CENTS",
    eligibility: ["listing event details or actual debit count"],
    exclusivityGroup: null,
    evidenceStatus: "OFFICIAL_PARTIAL",
    behavior: "EDITABLE_DEFAULT",
    targetCompatible: false,
    targetBounds: "NOT_AVAILABLE",
    displayBucket: "ETSY_FEE_DEBIT",
    sourceIds: ["etsy-multiple-quantity-help-2026-09-03"],
  },
  {
    ruleFamilyId: "offsite_ads_12",
    revisionId: "offsite-ads-12-us-2026-09-03.1",
    name: "Offsite Ads fee (12%)",
    category: "attributed_ad_fee",
    direction: "DEBIT",
    occurrenceScope: "PER_ORDER",
    modes: ["unit_economics", "statement_estimate"],
    applicability: allUsApplicability,
    effectivity: currentEffectivity("2026-06-08"),
    formula: { type: "percentage_with_cap", base: "R", ratePpm: 120_000, capCents: 10_000 },
    calculationOrder: 40,
    rounding: "LINE_HALF_UP_TO_CENT",
    eligibility: ["seller confirms 12% lifetime tier", "attributed Offsite Ads order"],
    exclusivityGroup: "order_attribution",
    evidenceStatus: "OFFICIAL_CONFIRMED",
    behavior: "REQUIRE_INPUT",
    targetCompatible: true,
    targetBounds: "MONOTONE_DEBIT",
    displayBucket: "ETSY_FEE_DEBIT",
    sourceIds: ["etsy-fees-policy-2026-02-13", "etsy-advertising-policy-2026-06-08"],
  },
  {
    ruleFamilyId: "offsite_ads_15",
    revisionId: "offsite-ads-15-us-2026-09-03.1",
    name: "Offsite Ads fee (15%)",
    category: "attributed_ad_fee",
    direction: "DEBIT",
    occurrenceScope: "PER_ORDER",
    modes: ["unit_economics", "statement_estimate"],
    applicability: allUsApplicability,
    effectivity: currentEffectivity("2026-06-08"),
    formula: { type: "percentage_with_cap", base: "R", ratePpm: 150_000, capCents: 10_000 },
    calculationOrder: 40,
    rounding: "LINE_HALF_UP_TO_CENT",
    eligibility: ["seller is in 15% tier", "attributed Offsite Ads order"],
    exclusivityGroup: "order_attribution",
    evidenceStatus: "OFFICIAL_CONFIRMED",
    behavior: "REQUIRE_INPUT",
    targetCompatible: true,
    targetBounds: "MONOTONE_DEBIT",
    displayBucket: "ETSY_FEE_DEBIT",
    sourceIds: ["etsy-fees-policy-2026-02-13", "etsy-advertising-policy-2026-06-08"],
  },
  {
    ruleFamilyId: "share_save_4",
    revisionId: "share-save-4-us-2026-09-03.1",
    name: "Share & Save credit (4%)",
    category: "fee_credit",
    direction: "CREDIT",
    occurrenceScope: "PER_ORDER",
    modes: ["unit_economics", "statement_estimate"],
    applicability: allUsApplicability,
    effectivity: currentEffectivity(null),
    formula: { type: "percentage_credit", base: "R_MINUS_E", ratePpm: 40_000 },
    calculationOrder: 50,
    rounding: "LINE_HALF_UP_TO_CENT",
    eligibility: ["eligible Share & Save attributed order"],
    exclusivityGroup: "order_attribution",
    evidenceStatus: "OFFICIAL_CONFIRMED",
    behavior: "REQUIRE_INPUT",
    targetCompatible: true,
    targetBounds: "MONOTONE_CREDIT",
    displayBucket: "ETSY_CREDIT",
    sourceIds: [
      "etsy-share-save-help-2026-09-03",
      "etsy-funded-coupons-help-2026-09-03",
    ],
  },
  {
    ruleFamilyId: "share_save_intro_6_5",
    revisionId: "share-save-intro-6-5-us-2026-09-03.1",
    name: "Share & Save introductory credit (6.5%)",
    category: "fee_credit",
    direction: "CREDIT",
    occurrenceScope: "PER_ORDER",
    modes: ["unit_economics", "statement_estimate"],
    applicability: allUsApplicability,
    effectivity: currentEffectivity(null),
    formula: { type: "percentage_credit", base: "R_MINUS_E", ratePpm: 65_000 },
    calculationOrder: 50,
    rounding: "LINE_HALF_UP_TO_CENT",
    eligibility: [
      "seller confirms invitation",
      "seller confirms the order falls within the entered 14-day deadline",
    ],
    exclusivityGroup: "order_attribution",
    evidenceStatus: "OFFICIAL_CONFIRMED",
    behavior: "REQUIRE_INPUT",
    targetCompatible: true,
    targetBounds: "MONOTONE_CREDIT",
    displayBucket: "ETSY_CREDIT",
    sourceIds: [
      "etsy-share-save-help-2026-09-03",
      "etsy-share-save-intro-terms-2026-09-03",
    ],
  },
  {
    ruleFamilyId: "texas_seller_fee_tax",
    revisionId: "texas-seller-fee-tax-2025-10-01.1",
    name: "Texas sales tax on seller transaction fee",
    category: "seller_fee_tax",
    direction: "DEBIT",
    occurrenceScope: "PER_ORDER",
    modes: ["unit_economics", "statement_estimate"],
    applicability: { ...allUsApplicability, sellerStates: ["TX"] },
    effectivity: {
      status: "PUBLISHED",
      startsAt: "2025-10-01T00:00:00-05:00",
      endsAt: null,
      observedValidAt: VERIFIED_AT,
      sourceUpdatedAt: null,
      verifiedAt: VERIFIED_AT,
      catalogActivatedAt: ACTIVATED_AT,
    },
    formula: {
      type: "compound_percentage",
      base: "ROUNDED_TRANSACTION_FEE",
      factorsPpm: [800_000, 62_500],
    },
    calculationOrder: 60,
    rounding: "LINE_HALF_UP_TO_CENT",
    eligibility: ["shop is located in Texas"],
    exclusivityGroup: null,
    evidenceStatus: "OFFICIAL_CONFIRMED",
    behavior: "AUTOMATIC",
    targetCompatible: true,
    targetBounds: "MONOTONE_DEBIT",
    displayBucket: "ETSY_FEE_DEBIT",
    sourceIds: ["etsy-texas-fee-tax-help-2026-09-03"],
  },
];

export const CURRENT_RATE_CATALOG: RateCatalogRelease = deepFreeze({
  catalogReleaseId: "etsy-us-2026-09-03.1",
  schemaVersion: "1.0.0",
  calculationContractVersion: "1.0.0",
  status: "Active",
  supportedContext: {
    sellerCountry: "US",
    bankCountry: "US",
    channel: "ETSY_MARKETPLACE",
    listingCurrency: "USD",
    paymentAccountCurrency: "USD",
  },
  defaultMode: "unit_economics",
  releasedAt: ACTIVATED_AT,
  catalogVerifiedAt: VERIFIED_AT,
  ruleRevisionIds: rules.map((rule) => rule.revisionId),
  changeSummary: "Initial frozen Etsy US/USD calculator catalog.",
  reviewer: "MarginGauge research review",
  sources,
  rules,
});

function matches(value: string | undefined, accepted: readonly string[]): boolean {
  return accepted.includes("ANY") || (value !== undefined && accepted.includes(value));
}

function appliesToContext(rule: FeeRuleRevision, context: CalculationContext): boolean {
  const scope = rule.applicability;
  return (
    matches("ETSY", [scope.platform]) &&
    matches(context.channel, scope.channels) &&
    matches(context.sellerCountry, scope.sellerCountries) &&
    matches(context.sellerState, scope.sellerStates) &&
    matches(context.bankCountry, scope.bankCountries) &&
    matches(context.buyerDestinationState, scope.buyerDestinationStates) &&
    matches(context.productType, scope.productTypes) &&
    matches(context.listingCurrency, scope.listingCurrencies) &&
    matches(context.paymentAccountCurrency, scope.paymentAccountCurrencies)
  );
}

function parseTimestamp(value: string | null): number | null {
  if (value === null) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function appliesAtCatalogVerification(
  rule: FeeRuleRevision,
  catalog: RateCatalogRelease,
): boolean {
  const reference = parseTimestamp(catalog.catalogVerifiedAt);
  const observed = parseTimestamp(rule.effectivity.observedValidAt);
  const verified = parseTimestamp(rule.effectivity.verifiedAt);
  if (reference === null || observed === null || verified === null) return false;
  if (observed > reference || verified > reference) return false;

  if (rule.effectivity.status === "NOT_PUBLISHED") {
    return rule.effectivity.startsAt === null && rule.effectivity.endsAt === null;
  }

  const start = parseTimestamp(rule.effectivity.startsAt);
  const end = parseTimestamp(rule.effectivity.endsAt);
  if (start === null || (rule.effectivity.endsAt !== null && end === null)) return false;
  if (end !== null && start >= end) return false;
  return reference >= start && (end === null || reference < end);
}

function hasUsableEvidence(rule: FeeRuleRevision, catalog: RateCatalogRelease): boolean {
  if (rule.sourceIds.length === 0 || new Set(rule.sourceIds).size !== rule.sourceIds.length) {
    return false;
  }
  return rule.sourceIds.every((sourceId) => {
    const matchingSources = catalog.sources.filter((source) => source.sourceId === sourceId);
    return (
      matchingSources.length === 1 &&
      matchingSources[0].verification !== "CONFLICT" &&
      matchingSources[0].verification !== "UNAVAILABLE"
    );
  });
}

export function resolveRule(
  catalog: RateCatalogRelease,
  family: RuleFamilyId,
  context: CalculationContext,
): DomainResult<FeeRuleRevision> {
  if (catalog.status !== "Active") {
    return {
      ok: false,
      error: {
        code: "RATE_VERSION_UNAVAILABLE",
        message: `Rate catalog ${catalog.catalogReleaseId} is not active.`,
      },
    };
  }

  const candidates = catalog.rules.filter(
    (rule) =>
      rule.ruleFamilyId === family &&
      catalog.ruleRevisionIds.includes(rule.revisionId) &&
      appliesToContext(rule, context) &&
      appliesAtCatalogVerification(rule, catalog) &&
      hasUsableEvidence(rule, catalog),
  );

  if (candidates.length !== 1) {
    return {
      ok: false,
      error: {
        code: "RATE_VERSION_UNAVAILABLE",
        message:
          candidates.length === 0
            ? `No verified ${family} rule applies to this calculation.`
            : `Conflicting ${family} rules apply to this calculation.`,
        details: { ruleFamily: family, candidateCount: candidates.length },
      },
    };
  }

  return { ok: true, value: candidates[0] };
}
