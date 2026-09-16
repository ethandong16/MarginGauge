# MarginGauge SEO rollout

This tracker implements the first four-week editorial release without creating unpublished placeholder pages. Dates are publication targets; a guide ships only after its official sources and worked example pass review.

## Publication sequence

| Guide | Target date | Status |
|---|---:|---|
| Etsy Fees for US Sellers: 2026 Rates and Examples | 2026-09-04 | Published and live |
| How to Calculate Etsy Profit Per Order | 2026-09-04 | Published and live |
| How to Price Etsy Products for Profit | 2026-09-08 | Published and live |
| Does Etsy Charge Fees on Shipping? A Profit Example | 2026-09-11 | Published and live |
| Etsy Offsite Ads Fees: 12%, 15%, and the $100 Cap | 2026-09-16 | Published and live |
| Etsy Share & Save vs Offsite Ads: Fee and Profit Comparison | 2026-09-17 | Planned |
| Does Etsy Charge Seller Fees on Sales Tax? | 2026-09-22 | Planned |

## Per-release gate

- Recheck every cited Etsy source no more than seven days before publication.
- Keep official page update dates, Etsy effective dates, and MarginGauge review dates separate.
- Recalculate the worked example with the tested domain engine.
- Confirm one search intent, one self-referencing canonical, static article copy, Article and BreadcrumbList JSON-LD, and a visible MarginGauge Editorial byline.
- Add only published URLs to the home page, calculator, sitemap, build inputs, redirects, and verification scripts.
- Run tests, type checking, production build, static verification, and 320/390/1280 browser QA before deployment.

## G3 release — 2026-09-08

- Official Fees & Payments Policy and Etsy Payments Policy rechecked on publication day; relevant rates unchanged. Evidence and engine inputs are in G3_RELEASE.md.
- Complete example: $25.91 price, $13.00 operating costs, $2.91 Etsy fees, $10.00 contribution, 38.60% margin. Existing engine verifies the previous cent misses the target.
- 71 tests, type check, production build, 10-route static verification, and launch readiness passed.
- Local browser QA passed at 320, 390, and 1280px: no horizontal overflow, one H1, canonical, Article/BreadcrumbList, and calculator/G1/G2 links present.
- Homepage, calculator, G1/G2 contextual links, sitemap, build inputs, redirects, and verification routes include G3. No unpublished page was created.
- Production release commit: 47d8493. URL: https://margin-gauge.com/guides/how-to-price-etsy-products/.
- Production verifier passed all 10 pages, redirects, canonical metadata, 404 behavior, and security headers. Live sitemap contains G3 with 2026-09-08 lastmod.
- Production browser checks passed at 320/390/1280px with no overflow, console errors, or page errors; Article/BreadcrumbList, self-canonical, existing analytics, outbound internal links, and all four inbound links verified.
- No AdSense, GA4, advertising cookies, or publisher ID added. G3 was inspected in Search Console on 2026-09-08; the indexed-data status was `URL is not on Google` / `URL is unknown to Google`. Google's live indexability check completed and the one-time request returned `Indexing requested`, adding the URL to the priority crawl queue.

## G4 release — 2026-09-11

- Added `/guides/etsy-fees-on-shipping/` for the single intent “Does Etsy charge fees on shipping?” under the supported US Etsy.com / US bank / USD scope.
- Worked example is checked by the existing engine: $30 item + $6 buyer-paid shipping, $10 COGS, $1 packaging, and $5 actual label produces $36 seller revenue, $3.87 Etsy fees, $16.00 operating costs, and $16.13 contribution profit. The same order with free shipping produces $10.70 contribution profit.
- The guide distinguishes buyer-paid shipping from actual seller shipping cost, links the Etsy Fees Policy, US processing rates, shipping-label, and insurance sources, and discloses estimate limits.
- Added Article and BreadcrumbList JSON-LD, self-canonical metadata, editorial byline, contextual links, sitemap entry, trailing-slash redirect, static route verification, and the G4 regression test.
- 72 tests, type check, production build with the existing Cloudflare Web Analytics token, launch readiness, and static verification passed before release. Commit `b7dbe32` was pushed to `main`; Cloudflare Pages deployed the site, and production verification passed for the G4 page, canonical metadata, trailing-slash redirect, 404 behavior, and security headers. The live page returned HTTP 200 with the published title, worked-example amount, canonical URL, and analytics beacon.

## G5 release — 2026-09-16

- Added `/guides/etsy-offsite-ads-fees/` for the single intent "Etsy Offsite Ads fees" under the supported US Etsy.com / US bank / USD scope.
- Official Fees & Payments Policy, Advertising & Marketing Policy, Offsite Ads Help Center guidance, and Etsy-funded coupon guidance were rechecked on publication day. The 12% and 15% rates, rolling sales-tier rule, 30-day attribution window, US fee base, and $100 per-order cap remain unchanged. Evidence is in `G5_RELEASE.md`.
- The existing engine checks a $130 seller-revenue order with $60 operating costs: no attribution produces $57.20 contribution, a 15% attributed order produces $37.70, and a confirmed 12% attributed order produces $41.60. A separate $1,000 order verifies the $100 cap for both tiers.
- Added Article and BreadcrumbList JSON-LD, self-canonical metadata, editorial byline, contextual links, sitemap entry, trailing-slash redirect, static route verification, and the G5 regression test.
- 75 tests, type check, production build with the existing Cloudflare Web Analytics token, launch readiness, and 12-route static verification passed. Local browser QA passed at 320, 390, and 1280px with no page overflow, one H1, the self-canonical, Article/BreadcrumbList data, calculator links, local table scrolling, and no page console errors.
- Release commit `7d5f318` was pushed to `main`; Cloudflare Pages deployed the site, and production verification passed all 12 pages, canonical metadata, trailing-slash redirects, 404 behavior, and security headers. The live G5 page returned HTTP 200 and passed 320/390/1280 browser checks with the published title, $37.70 example result, self-canonical, Article/BreadcrumbList data, existing Analytics beacon, no page overflow, and no console errors.
- Search Console URL Inspection on 2026-09-16 reported `URL is not on Google` / `URL is unknown to Google` and no referring sitemap detected yet. The live test reported `URL is available to Google`, confirmed that the page can be indexed, and detected one valid Breadcrumbs item. The one-time request returned `Indexing requested`, adding G5 to the priority crawl queue.

## Search Console status

Google Search Console was initialized on 2026-09-04. The `margin-gauge.com` Domain property is verified through a Cloudflare DNS TXT record. The verification value is intentionally not stored in this repository.

- `https://margin-gauge.com/sitemap.xml` was submitted successfully and reported five discovered pages on 2026-09-04.
- Indexing was requested once for the home page, Etsy calculator, Etsy fee guide, and Etsy profit guide on 2026-09-04.
- Indexing was requested once for `https://margin-gauge.com/guides/how-to-price-etsy-products/` on 2026-09-08. Before the request, Google reported the URL as unknown; the live indexability check passed and Search Console confirmed that the URL was added to its priority crawl queue.
- Indexing was requested once for `https://margin-gauge.com/guides/etsy-offsite-ads-fees/` on 2026-09-16. Before the request, Google reported the URL as unknown and had not yet associated a referring sitemap; the live indexability check passed, one valid Breadcrumbs item was detected, and Search Console confirmed that the URL was added to its priority crawl queue.
- Live inspection reported both published guides as available to Google. Manual Actions and Security Issues reported no issues.

- Keep the DNS verification record in place.
- Inspect each newly published URL once after its sitemap update is live.
- At day 7, diagnose any URL still unknown to Google. At day 14, review intent, originality, canonical, rendering, and internal links for any discovered or crawled URL that remains unindexed.
- Weekly, record US Web impressions, clicks, CTR, and average position by page, query, and device; separate branded and non-branded queries.
- Treat robots blocks, wrong canonicals, soft 404s, 5xx responses, sitemap errors, manual actions, and security issues as immediate failures.

## AdSense hold

Do not apply or load advertising code until all seven guides and the core calculator are indexed, the site has at least 28 days of clean organic-traffic observations, privacy disclosures and a Google-approved CMP are live, and proposed placements pass policy, accessibility, and Core Web Vitals review. Google publishes no minimum traffic requirement, so this project does not invent one. Keep `ads.txt` free of a publisher ID until Google issues the real value.
