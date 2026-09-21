# G6 release evidence - 2026-09-21

Publication: `/guides/etsy-share-save-vs-offsite-ads/`. Sole intent: compare Etsy Share & Save fee credits with Offsite Ads fees and show how attribution changes contribution profit for the supported US Etsy.com / US bank / USD context.

## Source recheck

Official Etsy sources were read on 2026-09-21 (Asia/Shanghai).

| Source | Official page updated | Verified | Relevant evidence |
|---|---:|---:|---|
| https://www.etsy.com/legal/policy/etsys-share-save-terms-program-terms/1162874007996 | Not published | 2026-09-21 | The standard refund is 4% of the qualifying transaction total. Eligible URLs, authorized off-Etsy channels, the 30-day window, and the Offsite Ads exclusion remain published. |
| https://help.etsy.com/hc/en-us/articles/16981332744087-How-to-Save-on-Etsy-Fees-with-the-Share-Save-Program | Not published | 2026-09-21 | Enrollment, qualifying link types, order tracking, the standard 4% calculation, and last-link handling remain published. |
| https://www.etsy.com/legal/policy/share-save-intro-promotion-terms/1498028396575 | 2026-07-07 | 2026-09-21 | Invited first-time enrollees can receive a 6.5% replacement refund during their individual 14-day period; it does not stack with the standard 4% refund. |
| https://www.etsy.com/legal/advertising/ | 2026-06-08 | 2026-09-21 | Offsite Ads attribution, 12% and 15% rates, and the $100 per-order cap remain published. |
| https://www.etsy.com/legal/fees/ | 2026-02-13 | 2026-09-21 | The transaction-fee base and Offsite Ads fee rules remain published. |

No conflicting standard Share & Save rate, introductory rate, attribution window, Offsite Ads rate, or program-interaction rule was found. The immutable catalog `etsy-us-2026-09-03.1` and calculation contract `1.0.0` remain unchanged; this release adds editorial coverage and regression evidence rather than a new fee engine.

## Engine evidence

The worked example uses one $120 item, $10 buyer-paid shipping, $45 COGS, $5 packaging, and $10 actual shipping, with no tax, discount, gift wrap, personalization, Texas seller-fee tax, or allocated Etsy Ads spend. Seller order revenue is $130 and operating costs are $60.

| Scenario | Program line | Net Etsy fees | Contribution | Margin |
|---|---:|---:|---:|---:|
| No attribution | $0.00 | $12.80 | $57.20 | 44.00% |
| Share & Save standard | $5.20 credit | $7.60 | $62.40 | 48.00% |
| Confirmed 6.5% introduction | $8.45 credit | $4.35 | $65.65 | 50.50% |
| Offsite Ads 15% | $19.50 fee | $32.30 | $37.70 | 29.00% |
| Offsite Ads 12% | $15.60 fee | $28.40 | $41.60 | 32.00% |

The values are guarded by `src/content/share-save-example.test.ts`. Share & Save and Offsite Ads remain mutually exclusive attribution choices in the calculator. No calculator inputs are placed in URLs or analytics payloads.

## Release gates

77 tests, type checking, a production build with the existing Cloudflare Web Analytics token, launch readiness, and 13-route static verification passed. Responsive browser verification at 320, 390, and 1280px confirmed one H1, the self-canonical, valid JSON-LD, the published $62.40 example, calculator links, and no horizontal page overflow.

Release commit `62160e1` was pushed to `main`; Cloudflare Pages deployed the site. Production verification passed all 13 pages, canonical metadata, trailing-slash redirects, 404 behavior, and security headers. The live G6 page, sitemap, and robots.txt returned HTTP 200; the page exposes `index,follow`, the sitemap contains the G6 URL, and robots.txt references the sitemap.

The operator confirmed completing the one-time Google Search Console indexing request on 2026-09-21 after the production page and sitemap were live. The initial indexed-data status and live-test detail were not separately captured in this repository, so this record does not infer them.
