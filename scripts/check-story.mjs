#!/usr/bin/env node
/**
 * Story check — is the deployment actually a shop?
 *
 * This exists because every other gate passed while production served an empty
 * store: `/` returned 200 (a wall of loading skeletons satisfies a status-code
 * check), the catalog feed returned `{"success":true,"count":0}`, and the
 * sitemap advertised localhost. A 200 is not a store.
 *
 * Run against any deployment:
 *
 *   node scripts/check-story.mjs https://jeb-online.vercel.app
 *
 * Exit 0 only if a real buyer would find something to buy.
 */

const base = (process.argv[2] || process.env.BASE_URL || "http://localhost:3000").replace(
  /\/+$/,
  ""
);

const failures = [];
const results = [];

async function get(path) {
  const res = await fetch(`${base}${path}`, {
    headers: { "user-agent": "jeb-online-story-check" },
    redirect: "follow",
  });
  return { status: res.status, text: await res.text() };
}

function record(label, ok, detail) {
  results.push({ label, ok, detail });
  if (!ok) failures.push(`${label}: ${detail}`);
}

try {
  // 1. The catalog feed must contain at least one sellable product.
  const feed = await get("/api/products");
  let total = null;
  let count = null;
  try {
    const json = JSON.parse(feed.text);
    total = json.total ?? null;
    count = json.count ?? null;
  } catch {
    record("catalog feed", false, `/api/products did not return JSON (status ${feed.status})`);
  }
  record(
    "catalog feed",
    feed.status === 200 && typeof count === "number" && count > 0,
    `status ${feed.status}, count=${count}, total=${total} — an empty catalog means the shop sells nothing`
  );

  // 2. The home page must link to at least one product page.
  const home = await get("/");
  const productLinks = (home.text.match(/href="\/p\//g) || []).length;
  record(
    "home page product links",
    home.status === 200 && productLinks > 0,
    `status ${home.status}, /p/ links=${productLinks}`
  );

  // 3. The image fallback every component relies on must be deployed.
  const placeholder = await fetch(`${base}/products/placeholder.png`, { method: "HEAD" });
  record(
    "image fallback",
    placeholder.status === 200,
    `/products/placeholder.png -> ${placeholder.status} (referenced by cart, quick-view, grid, checkout and PDP)`
  );

  // 4. Canonical origin must not be localhost.
  const robots = await get("/robots.txt");
  const localhostSitemap = /Sitemap:\s*http:\/\/localhost/i.test(robots.text);
  record(
    "canonical origin",
    !localhostSitemap,
    localhostSitemap
      ? "robots.txt advertises http://localhost:3000/sitemap.xml — NEXT_PUBLIC_SITE_URL is not set"
      : "robots.txt advertises a real origin"
  );

  // 5. The sitemap should list the shop, not a dev machine.
  const sitemap = await get("/sitemap.xml");
  const locs = (sitemap.text.match(/<loc>/g) || []).length;
  const productUrls = (sitemap.text.match(/<loc>[^<]*\/p\//g) || []).length;
  record(
    "sitemap",
    !/localhost/i.test(sitemap.text) && productUrls > 0,
    `${locs} URLs, ${productUrls} product URLs${/localhost/i.test(sitemap.text) ? ", contains localhost" : ""}`
  );
} catch (error) {
  failures.push(`request failed: ${error.message}`);
}

console.log(`Story check against ${base}\n`);
for (const { label, ok, detail } of results) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
}

if (failures.length === 0) {
  console.log("\nThe deployment is a working shop.");
  process.exit(0);
}

console.log(`\n${failures.length} FAILURE(S) — this deployment is not sellable.`);
process.exit(1);
