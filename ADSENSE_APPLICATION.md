# AdSense application

Application date: 2026-10-20.

## Account and current scope

- The operator confirmed this is their first AdSense account, that they are at least 18, and that their actual payment country is mainland China.
- The operator explicitly accepted the displayed Google AdSense terms and authorized account creation. The account was created with payment country `China`.
- Publisher ID issued by Google: `pub-8121002735026874`.
- Site: `margin-gauge.com`.
- Verification method: the official `google-adsense-account` HTML meta tag. Production builds add it to page heads. The exact ads.txt authorization line was copied from the account's website-verification screen.
- This release prepares verification and review. It does not load Google ad scripts, create ad placements, or enable Auto ads.

The operator's explicit instruction on 2026-10-20 to proceed with the application supersedes the earlier application hold in SEO_ROLLOUT.md. Its 28-day observation period and article count were project choices, not Google eligibility requirements. The safeguards for actual ad serving below still apply.

## Status

- Account: created.
- Customer/payment information: submitted as an Individual profile with the user-provided legal details. The onboarding screen confirms "We've got your info". Do not store payment-profile names, addresses, postal codes, phone numbers, identity documents, or banking details in this repository.
- Website changes: deployed to production; Google confirmed "Your site is verified" using the HTML meta tag.
- Review: requested on 2026-10-20. After a full reload, the site shows "Getting ready" and "Review requested". Google states that checks usually take a few days, sometimes 2-4 weeks. This is not approval.
- Payments hold: after customer information was submitted, Google displayed a temporary account suspension and a payments hold requiring identity verification. The verification dialog requests a government-issued ID; an address document is optional. The user must complete that remaining step with their real document. The actual cause behind Google's identity-check trigger is not known.
- ads.txt: the correct publisher line is live and returns HTTP 200. The AdSense dashboard still reports "Not found" at this check; crawler processing is pending.
- Advertising: not enabled.

## Verification evidence

On 2026-10-20 the official AdSense eligibility article (Help Center article 9724) listed original content, policy compliance, website HTML access and an age requirement of 18. It did not list a universal traffic minimum or six-month site-age requirement. The official availability article (13402307) listed China, and the live application form accepted `China` as the payment country.

The live form warns that the payment country cannot be changed later. Network-based defaults must not be used in place of the operator's actual payment location.

The Google-provided ownership markup is:

```html
<meta name="google-adsense-account" content="ca-pub-8121002735026874">
```

The Google-provided ads.txt line is:

```text
google.com, pub-8121002735026874, DIRECT, f08c47fec0942fa0
```

Neither declaration executes an ad script or sets a visitor cookie. The current privacy policy describes this verification-only stage. Contact and legal pages use the same operator name.

## Validation and follow-up

- The implementation passed 79 tests, TypeScript checking, the production build, static checks for 15 routes and launch-readiness checks. The ownership meta tag was also checked in all 16 generated HTML files, including the 404 page, with no Google advertising script present.
- After deployment, `npm run verify:production` passed for 15 production pages, metadata, redirects, 404 behavior and security headers. Live checks confirmed the meta tag, exact ads.txt line and updated Privacy/Contact content.
- Both customer-info submission and the website review request were confirmed in the UI after reload. The remaining identity-verification dialog is open for the operator. No identity documents were accessed or uploaded.
- Complete the requested Payments identity verification, then check the payment hold and website review status. Keep normal original-content work going while Google reviews the site.
- Official AdSense Help article 13863682, with country set to China, asks for the postal code, complex name, building, floor and room number. The address must receive international ordinary mail. Local delivery arrangements must be checked with the building reception or serving post office.
- Official Help article 157667 says PIN mail is triggered at the verification threshold, may follow required identity verification, has no tracking number, and usually takes about three weeks. Address verification is due within four months of PIN generation. Some accounts may not need mailed address verification after online identity verification; follow the account's Verification check screen.

## Ad-serving release gate

Before enabling advertising, update the visitor-facing disclosures for the actual Google advertising integration and provide the consent/privacy choices required for applicable visitors, including a Google-certified CMP for the EEA, UK and Switzerland where required. Review the necessary CSP changes, mobile layout, accidental-click risk, accessibility and performance. Calculator financial inputs must not enter analytics or advertising payloads.

Application approval does not by itself enable ads in this source tree.

## Rollback

Restore the pre-application copies of vite.config.ts, public/ads.txt, contact/index.html, privacy/index.html, README.md and USER_GUIDE.zh-CN.md from:

`C:/Users/yimin/AppData/Local/Temp/margingauge-adsense-backup-2026-10-20T08-12-16.386Z`

Rebuild and deploy the restored source if a website rollback is needed. A source rollback does not close the AdSense account or cancel an account-side review.
