import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const pageInputs = {
  home: "index.html",
  calculator: "etsy-profit-calculator/index.html",
  about: "about/index.html",
  contact: "contact/index.html",
  privacy: "privacy/index.html",
  terms: "terms/index.html",
  disclaimer: "disclaimer/index.html",
  etsyFeesGuide: "guides/etsy-fees-for-us-sellers/index.html",
  etsyProfitGuide: "guides/how-to-calculate-etsy-profit/index.html",
  etsyPricingGuide: "guides/how-to-price-etsy-products/index.html",
  etsyShippingGuide: "guides/etsy-fees-on-shipping/index.html",
  notFound: "404.html",
};

export default defineConfig(({ mode }) => {
  const analyticsToken = process.env.CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim();

  return {
    plugins: [
      react(),
      {
        name: "cloudflare-web-analytics",
        transformIndexHtml() {
          if (mode !== "production" || !analyticsToken) return [];

          return [
            {
              tag: "script",
              attrs: {
                defer: true,
                src: "https://static.cloudflareinsights.com/beacon.min.js",
                "data-cf-beacon": JSON.stringify({ token: analyticsToken }),
              },
              injectTo: "body",
            },
          ];
        },
      },
    ],
    base: "/",
    build: {
      rollupOptions: {
        input: pageInputs,
      },
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
  };
});
