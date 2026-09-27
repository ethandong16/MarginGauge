# G8 release evidence - 2026-09-27

Publication: `/guides/etsy-offsite-ads-pricing/`. Sole intent: show how a 12% or 15% attributed Offsite Ads fee changes the minimum Etsy listing price needed to reach a contribution-profit target.

## Source recheck

Official Etsy sources were rechecked on 2026-09-27 (Asia/Shanghai).

| Source | Verified | Relevant evidence |
|---|---:|---|
| Etsy Fees & Payments Policy | 2026-09-27 | Offsite Ads is an attributed-order fee with the published rate and per-order cap. |
| Etsy Advertising & Marketing Policy | 2026-09-27 | The 12% and 15% rate tiers and attributed-order treatment remain published. |
| How Etsy's Offsite Ads Work | 2026-09-27 | Participation, attribution, rate, and cap context remain published. |

## Engine evidence

The worked example uses one item with $4.50 product cost, $10.00 buyer-paid shipping, $10.00 actual shipping, and $5.00 packaging. The target is $10.00 contribution profit, with no discount, tax, gift wrap, personalization, Etsy Ads allocation, or Texas seller-fee tax.

| Scenario | Minimum listing price | Offsite Ads fee | Contribution |
|---|---:|---:|---:|
| No attributed program | $23.09 | $0.00 | $10.00 |
| Offsite Ads 15% | $29.67 | $5.95 | $10.00 |
| Offsite Ads 12% | $28.15 | $4.58 | $10.00 |

The values are guarded by `src/content/offsite-ads-pricing-example.test.ts`. The test uses the production Target Price engine and confirms 12% eligibility explicitly.

## Release gates

79 tests, type checking, production build, 15-route static verification, and launch-readiness with the configured Cloudflare Web Analytics token passed. The token was supplied as a process environment variable only and was not written to the repository.

