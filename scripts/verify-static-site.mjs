import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const routes = new Map([
  ["/", ["index.html", "https://margin-gauge.com/"]],
  ["/etsy-profit-calculator/", ["etsy-profit-calculator/index.html", "https://margin-gauge.com/etsy-profit-calculator/"]],
  ["/about/", ["about/index.html", "https://margin-gauge.com/about/"]],
  ["/contact/", ["contact/index.html", "https://margin-gauge.com/contact/"]],
  ["/privacy/", ["privacy/index.html", "https://margin-gauge.com/privacy/"]],
  ["/terms/", ["terms/index.html", "https://margin-gauge.com/terms/"]],
  ["/disclaimer/", ["disclaimer/index.html", "https://margin-gauge.com/disclaimer/"]],
  ["/guides/etsy-fees-for-us-sellers/", ["guides/etsy-fees-for-us-sellers/index.html", "https://margin-gauge.com/guides/etsy-fees-for-us-sellers/"]],
  ["/guides/how-to-calculate-etsy-profit/", ["guides/how-to-calculate-etsy-profit/index.html", "https://margin-gauge.com/guides/how-to-calculate-etsy-profit/"]],
]);

const failures = [];
const read = (relativePath) => {
  try {
    return readFileSync(join(dist, relativePath), "utf8");
  } catch (error) {
    failures.push(`${relativePath}: ${error.message}`);
    return "";
  }
};

for (const [route, [file, canonical]] of routes) {
  const html = read(file);
  if (!html.includes(`<link rel="canonical" href="${canonical}"`)) {
    failures.push(`${route}: missing canonical ${canonical}`);
  }
  if (!/<h1[\s>]/i.test(html)) failures.push(`${route}: missing static H1`);
  if (/MarginKit|marginkit\.example/i.test(html)) failures.push(`${route}: contains retired brand or origin`);

  for (const match of html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      failures.push(`${route}: invalid JSON-LD (${error.message})`);
    }
  }

  for (const match of html.matchAll(/href="(\/[^"]*)"/g)) {
    const href = match[1].split("#")[0].split("?")[0];
    if (!href) continue;
    const relative = href === "/" ? "index.html" : href.endsWith("/") ? `${href.slice(1)}index.html` : href.slice(1);
    if (!existsSync(join(dist, relative))) failures.push(`${route}: broken internal link ${href}`);
  }
}

const calculator = read("etsy-profit-calculator/index.html");
for (const required of ["Current fee bases", "Frequently asked questions", "Official sources", "Etsy Profit Calculator for US Sellers"]) {
  if (!calculator.includes(required)) failures.push(`calculator static HTML: missing ${required}`);
}

for (const file of [
  "guides/etsy-fees-for-us-sellers/index.html",
  "guides/how-to-calculate-etsy-profit/index.html",
]) {
  const html = read(file);
  if (!html.includes('property="og:type" content="article"')) failures.push(`${file}: missing article Open Graph type`);
  if (!html.includes('name="author" content="MarginGauge Editorial"')) failures.push(`${file}: missing editorial author`);
  if (!html.includes('"@type": "Article"')) failures.push(`${file}: missing Article structured data`);
  if (!html.includes('"@type": "BreadcrumbList"')) failures.push(`${file}: missing breadcrumb structured data`);
  if (!html.includes('href="/etsy-profit-calculator/"')) failures.push(`${file}: missing calculator link`);
}

const sitemap = read("sitemap.xml");
for (const path of [
  "/guides/etsy-fees-for-us-sellers/",
  "/guides/how-to-calculate-etsy-profit/",
]) {
  if (!sitemap.includes(`https://margin-gauge.com${path}`)) failures.push(`sitemap: missing ${path}`);
}

const notFound = read("404.html");
if (!notFound.includes('name="robots" content="noindex,nofollow"')) failures.push("404: missing noindex");

for (const config of ["_headers", "_redirects", "robots.txt", "favicon.svg", "site.webmanifest"]) read(config);

const allHtml = [...routes.values()].map(([file]) => read(file)).join("\n");
const beaconMatches = [...allHtml.matchAll(/data-cf-beacon="([^"]+)"/g)];
for (const match of beaconMatches) {
  const decoded = match[1].replaceAll("&quot;", '"');
  try {
    const config = JSON.parse(decoded);
    if (Object.keys(config).some((key) => key !== "token")) failures.push("Cloudflare beacon includes non-token configuration");
  } catch {
    failures.push("Cloudflare beacon configuration is not valid JSON");
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Verified ${routes.size} static routes, 404 behavior assets, metadata, and Cloudflare Pages files.`);
