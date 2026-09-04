# MarginGauge

Production source for [margin-gauge.com](https://margin-gauge.com/). The first tool is an English, browser-only Etsy contribution-profit and target-price calculator for US sellers. It follows calculation contract `1.0.0` and rate catalog `etsy-us-2026-09-03.1`.

Chinese usage and operation guide: [USER_GUIDE.zh-CN.md](./USER_GUIDE.zh-CN.md)

## Run locally

```powershell
npm install
npm run dev
```

Run the full local release gate with `npm run check`. The Cloudflare Pages build command is `npm run build` and the output directory is `dist`.

## Supported calculation context

- Etsy.com marketplace orders
- Seller and bank account in the United States
- USD listing and USD Payment Account
- Unit economics, Payment Account statement estimate, and single-listing Target Price

The calculator is an estimate. It does not model refunds, cancellations, chargebacks, Purchase Protection, non-USD currency conversion, reserves, deposit timing, Pattern, or Square.

## Cloudflare Pages

Set `CLOUDFLARE_WEB_ANALYTICS_TOKEN` in the Pages production environment to inject the standard Cloudflare Web Analytics beacon. The integration sends no custom events and calculator inputs must never be added to analytics attributes or payloads.

Cloudflare Pages serves the static multi-page build. Redirects and security headers are defined in `public/_redirects` and `public/_headers`.
Configure a Cloudflare account-level Redirect Rule from `www.margin-gauge.com/*` to `https://margin-gauge.com/${1}` with a permanent status; Pages `_redirects` accepts only relative URLs.

## Remaining launch inputs

The Contact, Privacy, and Terms pages remain `noindex` drafts until the operator provides a legal name, public contact email, mailing address, jurisdiction, hosting-log retention details, and approved legal language. A 1200 x 630 Open Graph image is also required before public launch. No AdSense, GA4, advertising cookie, or publisher ID is included.

After adding the final legal content and `public/og-image.png`, build with the production analytics token and run the launch gate:

```powershell
$env:CLOUDFLARE_WEB_ANALYTICS_TOKEN = "the public site token"
npm run build
npm run verify:launch
npm run verify:production
```

`verify:production` must pass against the public HTTPS origin before release is considered complete.

Financial inputs are calculated in the browser. Do not add them to analytics, URLs, logs, or error-reporting payloads.
