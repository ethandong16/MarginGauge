import type { ChangelogEntry } from "./types";

export const CHANGELOG_ENTRIES: readonly ChangelogEntry[] = [
  {
    date: "2026-09-03",
    version: "1.0.0",
    catalogId: "etsy-us-2026-09-03.1",
    title: "Initial US Etsy calculator release",
    changes: [
      "Added separate Unit economics and Payment Account estimate views.",
      "Added US transaction, Etsy Payments processing, listing, Offsite Ads, Share & Save, and Texas seller-fee tax rules.",
      "Added contribution-profit and exact whole-cent Target Price calculations.",
      "Documented line-level half-up rounding, official sources, supported scope, and fail-closed limitations.",
    ],
  },
] as const;
