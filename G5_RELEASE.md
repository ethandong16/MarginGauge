# G5 release evidence - 2026-09-16

Publication: `/guides/etsy-offsite-ads-fees/`. Sole intent: explain Etsy Offsite Ads 12% and 15% fees, attribution, the eligible order base, and the $100 single-order cap for the supported US Etsy.com / US bank / USD context.

## Source recheck

Read the current official pages on 2026-09-16 (Asia/Shanghai).

| Source | Official page updated | Verified | Relevant evidence |
|---|---:|---:|---|
| https://www.etsy.com/legal/fees/ | 2026-02-13 | 2026-09-16 | Offsite Ads uses the applicable 15% or 12% attributed-order rate, includes seller order amounts such as shipping, excludes US sales tax, and is capped at $100 USD for one order. |
| https://www.etsy.com/legal/advertising/ | 2026-06-08 | 2026-09-16 | A qualifying ad click can attribute a shop order within 30 days; the purchased listing can differ from the advertised listing; the two rates and $100 cap remain published. |
| https://help.etsy.com/hc/en-us/articles/360000338367-How-Etsy-s-Offsite-Ads-Work | Not published | 2026-09-16 | Shops that have always made less than $10,000 in any consecutive 365-day period use 15% while participating and may opt out; $10,000 or more produces the 12% lifetime mandatory tier. Attributed-order reporting remains available. |
| https://help.etsy.com/hc/en-us/articles/1500005142242-How-Etsy-Funded-Coupons-Work-For-Sellers | Not published | 2026-09-16 | Etsy-funded coupons preserve seller proceeds and ordinary fee treatment. |

No conflicting rate, attribution window, fee base, or cap was found. The immutable catalog `etsy-us-2026-09-03.1` and calculation contract `1.0.0` remain unchanged; this release adds editorial coverage and regression evidence, not a new fee engine.

## Engine evidence

The primary example uses one $120 item, $10 buyer-paid shipping, $45 COGS, $5 packaging, $10 actual shipping, no sales tax, and no discounts or other attributed programs. Seller order revenue is $130 and operating costs are $60.

| Scenario | Offsite Ads | Total Etsy fees | Contribution | Margin |
|---|---:|---:|---:|---:|
| No attribution | $0.00 | $12.80 | $57.20 | 44.00% |
| 15% attributed order | $19.50 | $32.30 | $37.70 | 29.00% |
| 12% attributed order | $15.60 | $28.40 | $41.60 | 32.00% |

The cap example uses $1,000 seller order revenue. Both attributed tiers return a $100 Offsite Ads fee. Standard transaction, processing, and allocated listing fees are $95.45, so total modeled Etsy fees are $195.45 before seller operating costs.

The published values are guarded by `src/content/offsite-ads-example.test.ts`. No calculator inputs are placed in URLs or analytics payloads.

## Release gates

75 tests, type checking, production build with the existing Cloudflare Web Analytics token, launch readiness, and 12-route static verification passed. Local browser QA passed at 320, 390, and 1280px with no page overflow, one H1, the self-canonical, Article/BreadcrumbList data, calculator links, local table scrolling, and no page console errors.

Release commit `7d5f318` was pushed to `main`; Cloudflare Pages deployed the site, and production verification passed all 12 pages, canonical metadata, trailing-slash redirects, 404 behavior, and security headers. The live G5 page returned HTTP 200 and passed 320/390/1280 browser checks with the published title, $37.70 example result, self-canonical, Article/BreadcrumbList data, existing Analytics beacon, no page overflow, and no console errors.
