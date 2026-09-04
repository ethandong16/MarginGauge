export const SITE_ORIGIN = "https://margin-gauge.com";
export const CALCULATOR_PATH = "/etsy-profit-calculator/";
export const CANONICAL_URL = `${SITE_ORIGIN}${CALCULATOR_PATH}`;

export const SITE_METADATA = {
  name: "MarginGauge",
  pageTitle: "Etsy Profit Calculator for US Sellers | MarginGauge",
  heading: "Etsy Profit Calculator for US Sellers",
  description:
    "Estimate Etsy contribution profit with shipping, sales-tax processing, Offsite Ads, Share & Save, and target-price scenarios for US sellers.",
  locale: "en_US",
  language: "en",
  canonicalUrl: CANONICAL_URL,
  rateCatalogId: "etsy-us-2026-09-03.1",
  calculationContractVersion: "1.0.0",
  ratesVerifiedAt: "2026-09-03",
  ratesVerifiedLabel: "Rates verified Sep 3, 2026",
  scopeLabel: "US bank account and USD only",
  disclaimer:
    "Estimate only. MarginGauge is independent of Etsy and does not provide accounting, tax, or legal advice.",
} as const;
