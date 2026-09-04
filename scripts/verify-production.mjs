const origin = "https://margin-gauge.com";
const failures = [];

const pages = new Map([
  ["/", `${origin}/`],
  ["/etsy-profit-calculator/", `${origin}/etsy-profit-calculator/`],
  ["/about/", `${origin}/about/`],
  ["/contact/", `${origin}/contact/`],
  ["/privacy/", `${origin}/privacy/`],
  ["/terms/", `${origin}/terms/`],
  ["/disclaimer/", `${origin}/disclaimer/`],
  ["/guides/etsy-fees-for-us-sellers/", `${origin}/guides/etsy-fees-for-us-sellers/`],
  ["/guides/how-to-calculate-etsy-profit/", `${origin}/guides/how-to-calculate-etsy-profit/`],
]);

for (const [path, canonical] of pages) {
  try {
    const response = await fetch(`${origin}${path}`, { redirect: "manual" });
    const html = await response.text();
    if (response.status !== 200) failures.push(`${path}: expected 200, received ${response.status}`);
    if (!html.includes(`<link rel="canonical" href="${canonical}"`)) failures.push(`${path}: canonical mismatch`);
    if (!/<h1[\s>]/i.test(html)) failures.push(`${path}: missing static H1`);
    for (const header of ["content-security-policy", "x-content-type-options", "referrer-policy", "permissions-policy"]) {
      if (!response.headers.get(header)) failures.push(`${path}: missing ${header}`);
    }
  } catch (error) {
    failures.push(`${path}: ${error.message}`);
  }
}

for (const path of [
  "/etsy-profit-calculator",
  "/guides/etsy-fees-for-us-sellers",
  "/guides/how-to-calculate-etsy-profit",
]) {
  try {
    const redirect = await fetch(`${origin}${path}`, { redirect: "manual" });
    if (![301, 308].includes(redirect.status)) failures.push(`${path}: expected 301/308, received ${redirect.status}`);
    const location = redirect.headers.get("location");
    if (location !== `${path}/` && location !== `${origin}${path}/`) {
      failures.push(`${path}: unexpected Location ${location}`);
    }
  } catch (error) {
    failures.push(`${path} redirect: ${error.message}`);
  }
}

try {
  const missing = await fetch(`${origin}/margin-gauge-production-404-check`, { redirect: "manual" });
  if (missing.status !== 404) failures.push(`/unknown: expected 404, received ${missing.status}`);
} catch (error) {
  failures.push(`/unknown: ${error.message}`);
}

if (failures.length) {
  console.error("Production verification failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Verified ${pages.size} production pages, canonical metadata, redirects, 404 behavior, and security headers.`);
