import type { Cents, RatePpm } from "./money";

export type CalculationBasis = "unit_economics" | "statement_estimate";
export type ProductType = "physical" | "digital";
export type OrderScenario =
  | "standard"
  | "refund"
  | "cancellation"
  | "chargeback"
  | "purchase_protection";

export interface CalculationContext {
  sellerCountry: string;
  sellerState: string;
  bankCountry: string;
  channel: string;
  listingCurrency: string;
  paymentAccountCurrency: string;
  productType: ProductType;
  buyerDestinationState?: string;
  orderScenario?: OrderScenario;
  timing?: "current" | "historical";
}

export const DEFAULT_US_CONTEXT: CalculationContext = {
  sellerCountry: "US",
  sellerState: "OTHER_US",
  bankCountry: "US",
  channel: "ETSY_MARKETPLACE",
  listingCurrency: "USD",
  paymentAccountCurrency: "USD",
  productType: "physical",
  orderScenario: "standard",
  timing: "current",
};

export type Attribution =
  | "none"
  | "offsite_ads_12"
  | "offsite_ads_15"
  | "share_save_4"
  | "share_save_intro_6_5";

export type DiscountInput =
  | { kind: "none" }
  | { kind: "fixed"; amountCents: Cents }
  | { kind: "percentage"; ratePpm: RatePpm };

export interface StatementListingInput {
  listingType: "standard" | "private";
  initialListingFeePaid?: boolean;
  inventoryAfterSale?: "sold_out" | "remains";
  actualDebitCount?: number;
}

export interface ListingInput {
  id?: string;
  unitListPriceCents: Cents;
  quantity: number;
  unitCogsCents: Cents;
  statement?: StatementListingInput;
}

export type BillingChannel = "external" | "etsy_payment_account";

export interface CostLineInput {
  amountCents: Cents;
  billingChannel: BillingChannel;
}

export interface VariableCostsInput {
  fulfillmentShipping?: CostLineInput;
  insurance?: CostLineInput;
  packaging?: CostLineInput;
  variableLabor?: CostLineInput;
  other?: CostLineInput;
}

export type ManualAdjustmentInput =
  | {
      kind: "etsy_fee_debit" | "etsy_fee_credit";
      amountCents: Cents;
      appliesTo: "unit" | "statement" | "both";
      label?: string;
    }
  | {
      kind: "operating_cost";
      amountCents: Cents;
      billingChannel: BillingChannel;
      label?: string;
    }
  | {
      kind: "statement_only_debit" | "statement_only_credit";
      amountCents: Cents;
      label?: string;
    };

export interface EligibilityConfirmations {
  offsiteAds12Confirmed?: boolean;
  shareSaveIntroConfirmed?: boolean;
  shareSaveIntroEndsOn?: string;
}

export interface EtsyAdsInput {
  allocatedCents: Cents;
  includeInStatement?: boolean;
}

export interface OrderCalculationInput {
  basis?: CalculationBasis;
  context: CalculationContext;
  listings: ListingInput[];
  discount: DiscountInput;
  personalizationCents?: Cents;
  shippingChargedCents?: Cents;
  giftWrapCents?: Cents;
  etsyFundedCouponCents?: Cents;
  salesTaxCents: Cents;
  coloradoRetailDeliveryFeeCents?: Cents;
  paymentProcessingGrossOverrideCents?: Cents;
  attribution: Attribution;
  eligibility?: EligibilityConfirmations;
  costs?: VariableCostsInput;
  etsyAds?: EtsyAdsInput;
  manualAdjustments?: ManualAdjustmentInput[];
}

export type ValidationIssueCode =
  | "REQUIRED"
  | "NOT_A_SAFE_INTEGER"
  | "NEGATIVE_AMOUNT"
  | "INVALID_QUANTITY"
  | "INVALID_RATE"
  | "INVALID_SELECTION"
  | "DISCOUNT_EXCEEDS_BASE"
  | "COUPON_EXCEEDS_REVENUE"
  | "PROCESSING_GROSS_BELOW_REVENUE"
  | "ELIGIBILITY_CONFIRMATION_REQUIRED"
  | "INVALID_DATE";

export interface ValidationIssue {
  code: ValidationIssueCode;
  path: string;
  message: string;
}

export type CalculationFailureCode =
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_CONTEXT"
  | "UNSUPPORTED_ORDER_SCENARIO"
  | "UNSUPPORTED_ZERO_REVENUE"
  | "UNSUPPORTED_DISCOUNT_COMBINATION"
  | "PROCESSING_GROSS_REQUIRED"
  | "TAX_SCENARIO_REQUIRED"
  | "TARGET_REQUIRED"
  | "MULTIPLE_TARGETS"
  | "INVALID_DISCOUNT"
  | "UNSUPPORTED_TARGET_SCENARIO"
  | "RATE_VERSION_UNAVAILABLE"
  | "NO_VALID_PRICE_WITHIN_CAP"
  | "CALCULATION_ERROR";

export interface CalculationFailure {
  code: CalculationFailureCode;
  message: string;
  issues?: ValidationIssue[];
  details?: Readonly<Record<string, string | number | boolean>>;
}

export type DomainResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: CalculationFailure };

export type FeeLineId =
  | "transaction_fee"
  | "payment_processing_fee"
  | "unit_listing_fee"
  | "statement_listing_fee"
  | "offsite_ads_fee"
  | "share_save_credit"
  | "texas_seller_fee_tax"
  | "manual_fee_debit"
  | "manual_fee_credit";

export interface FeeTraceLine {
  id: FeeLineId;
  label: string;
  direction: "debit" | "credit";
  projections: CalculationBasis[];
  amountCents: Cents;
  baseCents?: Cents;
  ratePpm?: RatePpm;
  fixedAmountCents?: Cents;
  capCents?: Cents;
  ruleRevisionId: string;
  evidenceStatus: EvidenceStatus;
  sourceIds: string[];
  note?: string;
}

export interface RatioMetric {
  numeratorCents: Cents;
  denominatorCents: Cents;
  /** Hundredths of one percentage point; null means N/A. */
  basisPoints: number | null;
}

export interface UnitEconomicsResult {
  listingFeeCents: Cents;
  netEtsyMarketplaceFeesCents: Cents;
  proceedsAfterEtsyFeesCents: Cents;
  operatingCostsCents: Cents;
  marketingSpendCents: Cents;
  totalNetVariableCostsCents: Cents;
  contributionProfitCents: Cents;
  averageProfitPerItemCents: Cents;
  contributionMargin: RatioMetric;
  contributionRoi: RatioMetric;
  effectiveEtsyFeeRate: RatioMetric;
  allInVariableCostRate: RatioMetric;
}

export interface StatementEstimateResult {
  listingFeeDebitCount: number;
  listingFeeCents: Cents;
  netEtsyStatementFeesCents: Cents;
  etsyAccountOperationalDebitsCents: Cents;
  estimatedPaymentAccountChangeCents: Cents;
  statementFeeRate: RatioMetric;
}

export interface NormalizedOrderAmounts {
  merchandiseSubtotalCents: Cents;
  sellerFundedDiscountCents: Cents;
  personalizationCents: Cents;
  shippingChargedCents: Cents;
  giftWrapCents: Cents;
  sellerOrderRevenueCents: Cents;
  etsyFundedCouponCents: Cents;
  salesTaxCents: Cents;
  coloradoRetailDeliveryFeeCents: Cents;
  buyerCheckoutTotalCents: Cents;
  paymentProcessingGrossCents: Cents;
  totalQuantity: number;
  totalCogsCents: Cents;
}

export interface OrderCalculation {
  basis: CalculationBasis;
  catalogReleaseId: string;
  calculationContractVersion: string;
  amounts: NormalizedOrderAmounts;
  transactionFeeCents: Cents;
  paymentProcessingFeeCents: Cents;
  offsiteAdsFeeCents: Cents;
  shareSaveCreditCents: Cents;
  texasSellerFeeTaxCents: Cents;
  unitEconomics: UnitEconomicsResult;
  statementEstimate?: StatementEstimateResult;
  primary:
    | { kind: "contribution_profit"; amountCents: Cents }
    | { kind: "payment_account_change"; amountCents: Cents };
  feeTrace: FeeTraceLine[];
  assumptions: string[];
}

export type TaxScenario =
  | { kind: "no_tax" }
  | { kind: "custom_effective_rate_on_r"; ratePpm: RatePpm };

export type TargetDefinition =
  | { kind: "profit"; amountCents: Cents }
  | { kind: "margin"; ratePpm: RatePpm };

export interface TargetPriceInput {
  context: CalculationContext;
  quantity: number;
  unitCogsCents: Cents;
  discount: DiscountInput;
  personalizationCents?: Cents;
  shippingChargedCents?: Cents;
  giftWrapCents?: Cents;
  taxScenario?: TaxScenario;
  target?: TargetDefinition;
  /** Accepted to return a typed unsupported failure instead of silently ignoring it. */
  etsyFundedCouponCents?: Cents;
  /** Accepted to return a typed unsupported failure instead of silently ignoring it. */
  paymentProcessingGrossOverrideCents?: Cents;
  attribution: Attribution;
  eligibility?: EligibilityConfirmations;
  costs?: VariableCostsInput;
  etsyAds?: EtsyAdsInput;
  manualAdjustments?: ManualAdjustmentInput[];
}

export interface TargetSearchOptions {
  /** Test/host guard only. Production callers should omit this to use the frozen cap. */
  maxUnitPriceCents?: Cents;
}

export interface TargetPriceCalculation {
  minimumUnitListPriceCents: Cents;
  previousUnitPriceMeetsTarget: false;
  calculation: OrderCalculation;
  target: TargetDefinition;
  taxScenario: TaxScenario;
  search: {
    minUnitPriceCents: 1;
    maxUnitPriceCents: Cents;
    evaluatedLeaves: number;
    prunedIntervals: number;
  };
}

export type CatalogStatus = "Draft" | "Active" | "Superseded" | "Quarantined";
export type EvidenceStatus =
  | "OFFICIAL_CONFIRMED"
  | "OFFICIAL_PARTIAL"
  | "PRODUCT_CONVENTION"
  | "USER_ACTUAL"
  | "UNSUPPORTED";

export interface SourceEvidence {
  sourceId: string;
  url: string;
  title: string;
  sourceType: "LEGAL_POLICY" | "PROGRAM_TERMS" | "HELP_CENTER" | "SELLER_HANDBOOK";
  section: string;
  excerpt: string;
  supports: string[];
  sourceUpdatedAt: string | null;
  accessedAt: string;
  contentHash: string | null;
  snapshotId: string | null;
  verification: "CONFIRMED" | "PARTIAL" | "CONFLICT" | "UNAVAILABLE";
}

export type RuleFamilyId =
  | "transaction_fee"
  | "payment_processing_fee"
  | "unit_listing_allocation"
  | "statement_listing_debit"
  | "offsite_ads_12"
  | "offsite_ads_15"
  | "share_save_4"
  | "share_save_intro_6_5"
  | "texas_seller_fee_tax";

export interface RuleApplicability {
  platform: "ETSY";
  channels: string[];
  sellerCountries: string[];
  sellerStates: string[];
  bankCountries: string[];
  buyerDestinationStates: string[];
  productTypes: Array<ProductType | "ANY">;
  listingCurrencies: string[];
  paymentAccountCurrencies: string[];
}

export interface RuleEffectivity {
  status: "PUBLISHED" | "NOT_PUBLISHED";
  startsAt: string | null;
  endsAt: string | null;
  observedValidAt: string;
  sourceUpdatedAt: string | null;
  verifiedAt: string;
  catalogActivatedAt: string;
}

export type ControlledFormula =
  | { type: "percentage"; base: "R"; ratePpm: RatePpm }
  | { type: "percentage_plus_fixed"; base: "P"; ratePpm: RatePpm; fixedCents: Cents }
  | { type: "fixed_per_sold_unit"; amountCents: Cents }
  | { type: "editable_listing_event_count"; amountCents: Cents }
  | { type: "percentage_with_cap"; base: "R"; ratePpm: RatePpm; capCents: Cents }
  | { type: "percentage_credit"; base: "R_MINUS_E"; ratePpm: RatePpm }
  | { type: "compound_percentage"; base: "ROUNDED_TRANSACTION_FEE"; factorsPpm: RatePpm[] };

export interface FeeRuleRevision {
  ruleFamilyId: RuleFamilyId;
  revisionId: string;
  name: string;
  category: string;
  direction: "DEBIT" | "CREDIT" | "TAX_PASS_THROUGH" | "OFF_ACCOUNT_COST";
  occurrenceScope:
    | "PER_ORDER"
    | "PER_SOLD_UNIT"
    | "PER_LISTING_EVENT"
    | "PER_CLICK"
    | "PER_TRANSFER"
    | "PER_PERIOD";
  modes: Array<CalculationBasis | "informational">;
  applicability: RuleApplicability;
  effectivity: RuleEffectivity;
  formula: ControlledFormula;
  calculationOrder: number;
  rounding: "LINE_HALF_UP_TO_CENT" | "EXACT_CENTS";
  eligibility: string[];
  exclusivityGroup: string | null;
  evidenceStatus: EvidenceStatus;
  behavior:
    | "AUTOMATIC"
    | "REQUIRE_INPUT"
    | "EDITABLE_DEFAULT"
    | "INFORMATIONAL"
    | "EXCLUDED"
    | "HARD_BLOCK";
  targetCompatible: boolean;
  targetBounds: "MONOTONE_DEBIT" | "MONOTONE_CREDIT" | "FIXED" | "NOT_AVAILABLE";
  displayBucket:
    | "ETSY_FEE_DEBIT"
    | "ETSY_CREDIT"
    | "TAX_PASS_THROUGH"
    | "EXTERNAL_COST"
    | "MANUAL_ADJUSTMENT";
  sourceIds: string[];
}

export interface RateCatalogRelease {
  catalogReleaseId: string;
  schemaVersion: string;
  calculationContractVersion: string;
  status: CatalogStatus;
  supportedContext: {
    sellerCountry: "US";
    bankCountry: "US";
    channel: "ETSY_MARKETPLACE";
    listingCurrency: "USD";
    paymentAccountCurrency: "USD";
  };
  defaultMode: "unit_economics";
  releasedAt: string;
  catalogVerifiedAt: string;
  ruleRevisionIds: string[];
  changeSummary: string;
  reviewer: string;
  sources: SourceEvidence[];
  rules: FeeRuleRevision[];
}
