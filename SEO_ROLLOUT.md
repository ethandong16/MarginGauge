# MarginGauge SEO rollout

This tracker implements the first four-week editorial release without creating unpublished placeholder pages. Dates are publication targets; a guide ships only after its official sources and worked example pass review.

## Publication sequence

| Guide | Target date | Status |
|---|---:|---|
| Etsy Fees for US Sellers: 2026 Rates and Examples | 2026-09-04 | Published and live |
| How to Calculate Etsy Profit Per Order | 2026-09-04 | Published and live |
| How to Price Etsy Products for Profit | 2026-09-08 | Planned |
| Does Etsy Charge Fees on Shipping? A Profit Example | 2026-09-10 | Planned |
| Etsy Offsite Ads Fees: 12%, 15%, and the $100 Cap | 2026-09-15 | Planned |
| Etsy Share & Save vs Offsite Ads: Fee and Profit Comparison | 2026-09-17 | Planned |
| Does Etsy Charge Seller Fees on Sales Tax? | 2026-09-22 | Planned |

## Per-release gate

- Recheck every cited Etsy source no more than seven days before publication.
- Keep official page update dates, Etsy effective dates, and MarginGauge review dates separate.
- Recalculate the worked example with the tested domain engine.
- Confirm one search intent, one self-referencing canonical, static article copy, Article and BreadcrumbList JSON-LD, and a visible MarginGauge Editorial byline.
- Add only published URLs to the home page, calculator, sitemap, build inputs, redirects, and verification scripts.
- Run tests, type checking, production build, static verification, and 320/390/1280 browser QA before deployment.

## Search Console operations

Google Search Console was initialized on 2026-09-04. The `margin-gauge.com` Domain property is verified through a Cloudflare DNS TXT record. The verification value is intentionally not stored in this repository.

- `https://margin-gauge.com/sitemap.xml` was submitted successfully and reported five discovered pages on 2026-09-04.
- Indexing was requested once for the home page, Etsy calculator, Etsy fee guide, and Etsy profit guide on 2026-09-04.
- Live inspection reported both published guides as available to Google. Manual Actions and Security Issues reported no issues.

- Keep the DNS verification record in place.
- Inspect each newly published URL once after its sitemap update is live.
- At day 7, diagnose any URL still unknown to Google. At day 14, review intent, originality, canonical, rendering, and internal links for any discovered or crawled URL that remains unindexed.
- Weekly, record US Web impressions, clicks, CTR, and average position by page, query, and device; separate branded and non-branded queries.
- Treat robots blocks, wrong canonicals, soft 404s, 5xx responses, sitemap errors, manual actions, and security issues as immediate failures.

## AdSense hold

Do not apply or load advertising code until all seven guides and the core calculator are indexed, the site has at least 28 days of clean organic-traffic observations, privacy disclosures and a Google-approved CMP are live, and proposed placements pass policy, accessibility, and Core Web Vitals review. Google publishes no minimum traffic requirement, so this project does not invent one. Keep `ads.txt` free of a publisher ID until Google issues the real value.
