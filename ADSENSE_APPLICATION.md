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
- Customer/payment information: incomplete; awaiting the operator's required details. Do not store payment-profile names, addresses, postal codes, phone numbers, identity documents, or banking details in this repository.
- Website changes: prepared locally; deployment and Google's ownership verification pending.
- Review: not yet requested.
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

## Ad-serving release gate

Before enabling advertising, update the visitor-facing disclosures for the actual Google advertising integration and provide the consent/privacy choices required for applicable visitors, including a Google-certified CMP for the EEA, UK and Switzerland where required. Review the necessary CSP changes, mobile layout, accidental-click risk, accessibility and performance. Calculator financial inputs must not enter analytics or advertising payloads.

Application approval does not by itself enable ads in this source tree.

## Rollback

Restore the pre-application copies of vite.config.ts, public/ads.txt, contact/index.html, privacy/index.html, README.md and USER_GUIDE.zh-CN.md from:

`C:/Users/yimin/AppData/Local/Temp/margingauge-adsense-backup-2026-10-20T08-12-16.386Z`

Rebuild and deploy the restored source if a website rollback is needed. A source rollback does not close the AdSense account or cancel an account-side review.
