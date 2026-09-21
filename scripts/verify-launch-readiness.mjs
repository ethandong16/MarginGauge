import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const failures = [];

const read = (path) => readFileSync(path, "utf8");
const draftPages = ["contact", "privacy", "terms"];

for (const page of draftPages) {
  const source = read(join(root, page, "index.html"));
  if (/pre-launch draft|pending legal|pending operator|must be supplied/i.test(source)) {
    failures.push(`${page}: production legal/operator content is still a draft`);
  }
}

const ogPath = join(root, "public", "og-image.png");
if (!existsSync(ogPath)) {
  failures.push("public/og-image.png: missing 1200 x 630 Open Graph image");
} else {
  const png = readFileSync(ogPath);
  const validPng = png.subarray(1, 4).toString("ascii") === "PNG";
  const width = validPng && png.length >= 24 ? png.readUInt32BE(16) : 0;
  const height = validPng && png.length >= 24 ? png.readUInt32BE(20) : 0;
  if (!validPng || width !== 1200 || height !== 630) {
    failures.push(`public/og-image.png: expected a 1200 x 630 PNG, found ${width || "unknown"} x ${height || "unknown"}`);
  }
}

for (const file of [
  "guides/etsy-share-save-vs-offsite-ads/index.html",
  "guides/etsy-offsite-ads-fees/index.html",
  "guides/etsy-fees-on-shipping/index.html",
  "guides/how-to-price-etsy-products/index.html",
  "index.html",
  "etsy-profit-calculator/index.html",
  "guides/etsy-fees-for-us-sellers/index.html",
  "guides/how-to-calculate-etsy-profit/index.html",
]) {
  const html = read(join(dist, file));
  if (!html.includes('property="og:image" content="https://margin-gauge.com/og-image.png"')) {
    failures.push(`${file}: missing production og:image metadata`);
  }
  if (!html.includes("https://static.cloudflareinsights.com/beacon.min.js")) {
    failures.push(`${file}: Cloudflare Web Analytics beacon was not injected`);
  }
}

if (failures.length) {
  console.error("Launch readiness failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Launch inputs, Open Graph image, and Cloudflare Web Analytics are present.");
