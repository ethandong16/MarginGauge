import type { FaqItem } from "./types";

// Keep question and answer strings synchronized with the static FAQPage JSON-LD in index.html.
export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: "standard-us-fees",
    question: "What are the standard Etsy fees for a US seller?",
    answer:
      "For the supported US Etsy Payments scenario, the calculator applies a $0.20 listing allocation per item sold, a 6.5% transaction fee, and payment processing of 3% of the processing gross plus $0.25 per order. Offsite Ads, Share & Save, Texas seller-fee tax, shipping labels, and other costs can change the result.",
    sourceIds: ["fees-policy", "payment-processing-rates", "multiple-quantities"],
  },
  {
    id: "sales-tax",
    question: "Does Etsy charge seller fees on sales tax in the US?",
    answer:
      "Etsy's US transaction-fee base excludes sales tax. The Etsy Payments processing percentage applies to the gross order amount, including applicable sales tax. MarginGauge treats marketplace sales tax as pass-through money, not seller revenue.",
    sourceIds: ["fees-policy", "payment-processing-rates", "us-sales-tax"],
  },
  {
    id: "shipping",
    question: "How does shipping affect Etsy profit?",
    answer:
      "Shipping charged to the buyer is seller order revenue and is included in the transaction-fee base and payment-processing gross. The actual label, insurance, packaging, and fulfillment amounts are separate costs, so free shipping does not mean shipping costs are zero.",
    sourceIds: ["fees-policy", "shipping-labels", "shipping-insurance"],
  },
  {
    id: "offsite-ads",
    question: "How are Etsy Offsite Ads fees estimated?",
    answer:
      "For an attributed order, MarginGauge applies the seller-selected 12% or 15% rate to eligible seller order revenue and caps the fee at $100 per order. Sellers must confirm their rate eligibility; MarginGauge does not infer it from one order.",
    sourceIds: ["offsite-ads-help", "advertising-policy"],
  },
  {
    id: "share-and-save",
    question: "How does Share & Save affect the estimate?",
    answer:
      "Share & Save is shown as an Etsy fee credit. The standard 4% estimate uses seller revenue minus an Etsy-funded promotional discount. Offsite Ads and Share & Save cannot both be selected. A 6.5% introductory estimate is available only when the seller confirms the invitation and 14-day deadline, and v1 does not combine that introductory rate with an Etsy-funded coupon because the public sources do not confirm the credit base.",
    sourceIds: ["share-save-help", "etsy-funded-coupons", "share-save-terms", "share-save-promotion"],
  },
  {
    id: "target-price",
    question: "What does the Target Price result mean?",
    answer:
      "It is the lowest pre-discount unit price, in whole cents and within the selected assumptions, that meets the requested contribution-profit or contribution-margin target. The search cap is a MarginGauge technical limit, not an Etsy listing limit.",
    sourceIds: [],
  },
  {
    id: "payment-account",
    question: "Why can the Payment Account estimate differ from unit economics?",
    answer:
      "Unit economics allocates one $0.20 listing cost per item sold. The Payment Account view estimates actual listing debits triggered by the order and includes only operational costs billed through the Etsy account. Timing, credits, reserves, refunds, and unsupported adjustments can still make Etsy's statement differ.",
    sourceIds: ["multiple-quantities", "refunds", "payment-reserve"],
  },
  {
    id: "exactness",
    question: "Will this exactly match my Etsy statement or payout?",
    answer:
      "No. MarginGauge uses line-level half-up cent rounding as a documented product convention because Etsy does not publish every intermediate rounding step. It estimates contribution profit or an order-related Payment Account change, not payout timing, available funds, taxes owed, or accounting income.",
    sourceIds: [],
  },
] as const;
