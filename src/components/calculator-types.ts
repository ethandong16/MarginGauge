export type CalculatorMode = "order" | "target";
export type CalculationBasis = "unit" | "statement";
export type Attribution =
  | "none"
  | "offsite-15"
  | "offsite-12"
  | "share-4"
  | "share-intro";
export type DiscountType = "none" | "fixed" | "percent";
export type TaxScenario = "" | "none" | "custom";
export type TargetType = "profit" | "margin";
export type BillingChannel = "external" | "etsy";

export interface ListingDraft {
  id: string;
  unitPrice: string;
  quantity: string;
  unitCogs: string;
  listingType: "standard" | "private";
  inventoryOutcome: "sold-out" | "remains";
  statementDebitOverride: string;
}

export interface SharedDraft {
  discountType: DiscountType;
  discountValue: string;
  personalization: string;
  shippingCharged: string;
  giftWrap: string;
  attribution: Attribution;
  confirmsOffsite12: boolean;
  confirmsShareIntro: boolean;
  shareIntroEnds: string;
  shopState: "other" | "texas";
  fulfillmentShipping: string;
  shippingBilling: BillingChannel;
  insurance: string;
  insuranceBilling: BillingChannel;
  packaging: string;
  labor: string;
  otherCosts: string;
  etsyAds: string;
  etsyAdsInStatement: boolean;
  manualFeeDebit: string;
  manualFeeCredit: string;
}

export interface OrderDraft extends SharedDraft {
  listings: ListingDraft[];
  basis: CalculationBasis;
  etsyCoupon: string;
  salesTax: string;
  processingGrossOverride: string;
  coloradoPhysicalOrder: boolean;
  coloradoFee: string;
  carrierAdjustment: string;
  orderStatus: "completed" | "refunded" | "canceled" | "chargeback" | "protection";
  channel: "etsy" | "pattern" | "square";
}

export interface TargetDraft extends SharedDraft {
  quantity: string;
  unitCogs: string;
  taxScenario: TaxScenario;
  effectiveTaxRate: string;
  targetType: TargetType;
  targetValue: string;
}

export type ErrorMap = Record<string, string>;

export interface ResultMetric {
  label: string;
  value: string;
  hint?: string;
}

export interface ResultLine {
  label: string;
  amount: string;
  kind?: "default" | "credit" | "total" | "muted";
  hint?: string;
  meta?: string;
  sources?: Array<{ label: string; url: string }>;
}

export interface ResultSection {
  title: string;
  lines: ResultLine[];
}

export interface ResultViewModel {
  eyebrow: string;
  headline: string;
  headlineLabel: string;
  description: string;
  metrics: ResultMetric[];
  sections: ResultSection[];
  catalogId: string;
  contractVersion: string;
  notices: string[];
  isLoss?: boolean;
}
