import type { ContentSection } from "./types";

export const METHODOLOGY_INTRO = {
  title: "How MarginGauge estimates Etsy contribution profit",
  summary:
    "MarginGauge applies verified US Etsy fee rules to seller-entered order amounts. It keeps seller revenue, pass-through sales tax, marketplace fees, operating costs, and Payment Account activity separate.",
  estimateNotice:
    "Results are estimates. Etsy does not publish every intermediate rounding step, and unsupported account events can make a statement differ.",
} as const;

export const METHODOLOGY_VARIABLES = [
  { symbol: "M", name: "Merchandise subtotal", definition: "The sum of pre-discount unit listing price multiplied by quantity." },
  { symbol: "D", name: "Seller-funded receipt discount", definition: "A seller-entered fixed receipt amount, allowed up to M + U by the v1 convention, or one percentage applied once only to M and rounded to cents." },
  { symbol: "U", name: "Personalization", definition: "The net amount actually charged to the buyer for personalization." },
  { symbol: "S", name: "Shipping charged", definition: "The net amount actually charged to the buyer for shipping." },
  { symbol: "W", name: "Gift wrap charged", definition: "The net amount actually charged to the buyer for gift wrap." },
  { symbol: "R", name: "Seller gross order revenue", definition: "M - D + U + S + W, before Etsy fees and excluding marketplace sales tax." },
  { symbol: "E", name: "Etsy-funded coupon", definition: "The Etsy-funded amount shown for this shop and order; it does not reduce R in the supported model." },
  { symbol: "T", name: "Marketplace sales tax", definition: "The actual Etsy-collected sales tax from the receipt; treated as pass-through money." },
  { symbol: "P", name: "Processing gross", definition: "The base for the percentage processing fee; R + T in standard supported scenarios." },
] as const;

export const METHODOLOGY_FORMULAS = [
  { label: "Seller revenue", formula: "R = M - D + U + S + W" },
  { label: "Buyer checkout total", formula: "R - E + T + Colorado delivery fee, when applicable" },
  { label: "Transaction fee", formula: "round-cent(6.5% x R)" },
  { label: "Payment processing", formula: "round-cent(3% x P + $0.25)" },
  { label: "Listing allocation", formula: "$0.20 x sold quantity" },
  { label: "Offsite Ads", formula: "min(round-cent(selected rate x R), $100)" },
  { label: "Share & Save credit", formula: "standard: round-cent(4% x max(0, R - E)); confirmed intro with E = 0: round-cent(6.5% x R)" },
  { label: "Texas seller-fee tax", formula: "round-cent(6.25% x 80% x rounded transaction fee)" },
] as const;

export const METHODOLOGY_SECTIONS: readonly ContentSection[] = [
  {
    id: "two-views",
    title: "Two views, two questions",
    paragraphs: [
      "Unit economics is the default. It allocates one listing fee per item sold and subtracts all seller-entered variable operating costs to answer whether the order contributes profit over the long run.",
      "Payment Account estimate models order-related account activity. It uses listing debits triggered by the sale and includes only operational charges billed through Etsy. It is not a payout, deposit, available-funds, or closing-balance forecast.",
    ],
    sourceIds: ["fees-policy", "multiple-quantities", "etsy-payments-policy"],
  },
  {
    id: "discounts-and-tax",
    title: "Discounts, coupons, and tax stay separate",
    paragraphs: [
      "A seller-funded discount reduces supported seller revenue. A fixed discount is the seller-entered receipt amount and may reduce merchandise plus personalization under the frozen v1 convention; MarginGauge does not infer the promotion allocation. A percentage discount applies only to the merchandise subtotal, once per order. Buyer-paid shipping reflects the actual net shipping charge after any shipping promotion.",
      "An Etsy-funded coupon does not reduce seller revenue or the ordinary fee bases in this model. Marketplace sales tax is not seller revenue, but applicable tax enters the Etsy Payments percentage base.",
    ],
    bullets: [
      "Seller-funded and Etsy-funded discounts cannot be combined in v1 because their stacked treatment has not been verified.",
      "The 6.5% Share & Save introductory credit cannot be combined with an Etsy-funded coupon because the public sources do not confirm that credit base.",
      "MarginGauge does not infer a tax rate from an address or order amount.",
      "Texas tax on a seller fee is separate from buyer marketplace sales tax.",
    ],
    sourceIds: ["fees-policy", "etsy-funded-coupons", "payment-processing-rates", "us-sales-tax", "texas-seller-fee-tax"],
  },
  {
    id: "metrics",
    title: "What the result metrics mean",
    paragraphs: [
      "Contribution profit is seller gross order revenue minus net Etsy marketplace fees, operating costs, and allocated Etsy Ads spend. Contribution margin divides that profit by seller gross order revenue. Contribution ROI divides it by total net variable costs; it is unavailable when that denominator is zero or negative.",
      "Effective Etsy fee rate divides net Etsy marketplace fees by seller gross order revenue. It includes a selected Offsite Ads fee and Share & Save credit but excludes Etsy Ads CPC, pass-through tax, and fulfillment costs. Per-item profit is an order average, not SKU-level profitability for a mixed basket.",
    ],
  },
  {
    id: "target-price",
    title: "How Target Price finds the minimum",
    paragraphs: [
      "Target Price searches whole-cent, pre-discount unit prices from $0.01 through $1,000,000.00. The seller chooses either no sales tax or a custom effective tax-rate scenario and one profit or margin target.",
      "Because separately rounded fees can make neighboring prices non-monotonic, MarginGauge uses an exact, left-first bounded search rather than assuming every higher cent improves profit. The result is the first supported cent that satisfies the target under the entered assumptions.",
    ],
    bullets: [
      "The search ceiling is a MarginGauge technical guardrail, not an Etsy listing-price limit.",
      "Target Price supports one listing with quantity and does not support Etsy-funded coupons, stacked discounts, Colorado delivery-fee assumptions, or a custom processing-base override.",
    ],
  },
  {
    id: "rounding",
    title: "Rounding convention",
    paragraphs: [
      "Inputs are whole cents. MarginGauge rounds the order-level percentage discount, tax scenario, and each fee or credit line independently to the nearest cent using half-up rounding, then totals the rounded lines.",
      "This is a documented MarginGauge convention, not a claim about Etsy's complete internal penny-rounding sequence. A statement can differ by one cent or more when unsupported activity or different intermediate rounding applies.",
    ],
  },
  {
    id: "not-covered",
    title: "Not automatically covered in v1",
    paragraphs: [
      "The calculator fails closed when a verified rule or required actual amount is unavailable. It does not silently use zero or substitute the nearest known rate.",
    ],
    bullets: [
      "Refunds, cancellations, chargebacks, Purchase Protection, reserves, and deposit timing.",
      "Non-USD listings or accounts, currency conversion, non-US bank accounts, Pattern, and Square.",
      "Colorado delivery-fee processing-base treatment without an actual base from the statement.",
      "Seller-fee taxes outside the verified Texas rule, income tax, self-employment tax, setup fees, and subscription allocation.",
      "Automatic Etsy Ads attribution, historical fee reconstruction, or price-linked custom costs.",
      "A 6.5% Share & Save introductory credit on an order with an Etsy-funded coupon.",
    ],
    sourceIds: ["refunds", "payment-reserve", "us-sales-tax"],
  },
] as const;

export const WORKED_EXAMPLES = [
  {
    id: "basic-order",
    title: "$20 order with $5 in operating costs",
    assumptions: ["R = $20.00", "T = $0.00", "Quantity = 1", "Operating costs = $5.00", "No attributed program"],
    result: "Transaction $1.30 + processing $0.85 + listing $0.20 = $2.35 in Etsy fees; contribution profit is $12.65 and margin is 63.25%.",
  },
  {
    id: "offsite-cap",
    title: "$1,000 order with 12% Offsite Ads",
    assumptions: ["R = $1,000.00", "T = $80.00", "Operating costs = $500.00", "One listing allocation"],
    result: "The raw Offsite Ads calculation is $120.00, capped at $100.00. Estimated total marketplace fees are $197.85 and contribution profit is $302.15.",
  },
  {
    id: "share-save",
    title: "$100 eligible Share & Save order",
    assumptions: ["R = $100.00", "T = $8.00", "Operating costs = $50.00", "Standard 4% Share & Save"],
    result: "The estimated Share & Save credit is $4.00. Net Etsy marketplace fees are $6.19 and contribution profit is $43.81.",
  },
] as const;
