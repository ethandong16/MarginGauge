# G3 release evidence — 2026-09-08

Publication: /guides/how-to-price-etsy-products/. Sole intent: choosing a profitable Etsy listing price for US Etsy.com / US bank / USD.

## Source recheck

Read the current official pages in the browser on 2026-09-08 (Asia/Shanghai).

| Source | Official page updated | Verified | Relevant evidence |
|---|---|---|---|
| https://www.etsy.com/legal/fees/ | 2026-02-13 | 2026-09-08 | Listing: "$0.20 USD"; transaction: "6.5%" including shipping and gift wrapping, US sales tax excluded; processing assessed on sale including tax and shipping; Offsite Ads 15%/12%, "$100 USD" per attributed order; shipping label costs depend on carrier and package/shipment details. |
| https://www.etsy.com/legal/etsy-payments/ | 2026-07-31 | 2026-09-08 | United States table row: "3% + 0.25 USD". |

Business-effective dates for these individual rates were not established by this recheck. Page update dates are not substituted for them. No conflicting rate was found; immutable catalog etsy-us-2026-09-03.1 and contract 1.0.0 remain unchanged.

## Engine evidence

Executed existing calculateTargetPrice and calculateOrder via the G3 test; no new arithmetic engine.
Inputs: default US physical context, quantity 1, COGS 500 cents, labor 300, packaging 100, actual shipping 400; no buyer-paid extra charges, discount, tax, attribution, Ads, or adjustments. Profit target 1000 cents.
Result: minimum listing 2591 cents; transaction 168, processing 103, listing allocation 20; fees 291; operating costs 1300; contribution 1000; margin 3860 basis points. Previous price 2590 gives contribution 999.

The published example is guarded by src/content/pricing-example.test.ts, including article values. No financial inputs are embedded in links.

## Release gates

71 tests, type check, production build, static verification of 10 routes, and launch readiness passed before browser QA. Browser and production outcomes are recorded in SEO_ROLLOUT.md after verification.
