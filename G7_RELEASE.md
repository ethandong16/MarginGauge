# G7 release evidence - 2026-09-25

Publication: `/guides/etsy-seller-fees-sales-tax/`. Sole intent: explain whether Etsy seller fees apply to buyer sales tax and show the payment-processing effect for the supported US Etsy.com / US bank / USD context.

## Source recheck

Official Etsy sources were rechecked on 2026-09-25 (Asia/Shanghai).

| Source | Verified | Relevant evidence |
|---|---:|---|
| Etsy Fees & Payments Policy | 2026-09-25 | The supported US transaction-fee base excludes US sales tax. |
| Etsy payment processing guidance | 2026-09-25 | US processing is 3% plus $0.25, and applicable tax can enter the processing gross. |
| US state sales-tax guidance | 2026-09-25 | Etsy may collect and remit marketplace sales tax; the amount is not seller revenue in this model. |
| Texas seller-fee tax guidance | 2026-09-25 | Texas seller-fee tax is a separate debit, effective October 1, 2025, and is not buyer sales tax. |

## Engine evidence

The worked example uses a $30 item, $6 buyer-paid shipping, $2.40 Etsy-collected sales tax, $10 COGS, $1 packaging, and $5 actual shipping. There is no discount, gift wrap, personalization, advertising allocation, or Texas seller-fee tax.

| Scenario | Transaction fee | Processing fee | Net Etsy fees | Contribution |
|---|---:|---:|---:|---:|
| With $2.40 sales tax | $2.34 | $1.40 | $3.94 | $16.06 |
| No sales tax | $2.34 | $1.33 | $3.87 | $16.13 |

The values are guarded by `src/content/sales-tax-example.test.ts`. The example confirms that tax stays out of seller revenue and the transaction-fee base while increasing payment processing by $0.07.

## Release gates

78 tests, type checking, production build, and 14-route static verification passed. The launch-readiness script was run, but the current shell did not expose `CLOUDFLARE_WEB_ANALYTICS_TOKEN`; consequently the local build did not inject the existing Cloudflare Web Analytics beacon. No token was invented or committed. Production deployment must use the configured release environment with the existing token.

