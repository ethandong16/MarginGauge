import type { PrivacySection } from "./types";

export const PRIVACY_CONTENT = {
  title: "Privacy",
  effectiveDate: "2026-09-03",
  lastUpdated: "2026-09-03",
  summary:
    "MarginKit v1 performs calculator arithmetic in your browser and does not require an account or access to your Etsy shop.",
  operatorNotice:
    "Launch requirement: replace this notice with the production operator's legal identity, contact address, and applicable jurisdiction before collecting analytics, serving ads, or opening the site to the public.",
  sections: [
    {
      id: "calculator-data",
      title: "Calculator data",
      paragraphs: [
        "Amounts and order assumptions entered into the calculator are processed locally in your browser. This release does not send those values to a MarginKit server, analytics provider, or advertising provider.",
        "Calculator inputs are not placed in shareable URLs and are not saved to local storage. Refreshing or closing the page clears them.",
      ],
    },
    {
      id: "accounts-and-etsy",
      title: "Accounts and Etsy access",
      paragraphs: [
        "MarginKit v1 does not offer user accounts, request Etsy credentials, or connect to the Etsy API. Do not enter customer names, addresses, order IDs, or other personal information into free-text cost labels.",
      ],
    },
    {
      id: "technical-requests",
      title: "Technical requests",
      paragraphs: [
        "Like any website host, the production hosting provider may receive ordinary request data such as IP address, browser information, requested URL, timestamp, and security logs. The production operator must identify that provider and its retention period here before launch.",
      ],
    },
    {
      id: "analytics",
      title: "Analytics",
      paragraphs: [
        "No analytics integration is included in this release. If privacy-preserving product analytics is added, it may record calculator mode, calculation basis, success or error code, and performance timing, but it must not record financial amounts, item names, seller state, coupon values, or other calculator inputs.",
        "This notice and the consent experience must be updated before any non-essential analytics loads where consent is required.",
      ],
    },
    {
      id: "advertising",
      title: "Advertising and cookies",
      paragraphs: [
        "AdSense is not integrated in this release, and the included ads.txt file contains no publisher record. Before advertising is enabled, the operator must publish the relevant provider disclosures, lawful basis, retention information, consent controls, and a real authorized-seller record.",
        "Declining non-essential cookies must not prevent use of the calculator.",
      ],
    },
    {
      id: "rights",
      title: "Your choices and rights",
      paragraphs: [
        "Because calculator values remain in the browser in this release, MarginKit has no calculator record to retrieve or delete. Rights relating to hosting logs or future services must be handled through the production privacy contact and according to applicable law.",
      ],
    },
    {
      id: "changes",
      title: "Changes to this notice",
      paragraphs: [
        "Material changes will be reflected by the Last updated date. The production operator must review this notice whenever hosting, analytics, advertising, storage, or account behavior changes.",
      ],
    },
  ] satisfies readonly PrivacySection[],
} as const;
