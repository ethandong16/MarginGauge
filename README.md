# MarginKit Etsy Calculator

An English, browser-only Etsy contribution-profit and target-price calculator for US sellers. The implementation follows calculation contract `1.0.0` and rate catalog `etsy-us-2026-09-03.1`.

Chinese usage and operation guide: [USER_GUIDE.zh-CN.md](./USER_GUIDE.zh-CN.md)

## Run locally

```powershell
npm install
npm run dev
```

Run the automated checks with `npm test` and create a production build with `npm run build`.

## Supported calculation context

- Etsy.com marketplace orders
- Seller and bank account in the United States
- USD listing and USD Payment Account
- Unit economics, Payment Account statement estimate, and single-listing Target Price

The calculator is an estimate. It does not model refunds, cancellations, chargebacks, Purchase Protection, non-USD currency conversion, reserves, deposit timing, Pattern, or Square.

## Deployment blockers

Before publishing, replace every `marginkit.example` reference with the production origin, provide a real Open Graph image, and run the launch checklists in the page methodology content. `public/ads.txt` intentionally contains no publisher record; add a verified AdSense record only after account and domain approval.

Financial inputs are calculated in the browser. Do not add them to analytics, URLs, logs, or error-reporting payloads.
