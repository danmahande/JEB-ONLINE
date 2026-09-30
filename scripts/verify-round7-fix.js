/**
 * Round 7+ standing regression suite — 22 checks.
 *
 * REBUILT 2026-09-30 (Task 90): the original script was lost with the
 * container (it was gitignored under /scripts/*). This rebuild covers the
 * same documented ground: layout restorations (JSON-LD org, skip link,
 * #main-content), Inter-everywhere incl. ::placeholder + true 800 on the
 * PDP ms-weight-toggle, hero copy, the full commerce flow (tile
 * ADD TO CART -> quick-view -> add -> header pill -> drawer with USh
 * money, ms-label 10px CONTINUE SHOPPING, rounded-md 3.1px CTA), button
 * a11y (aria-invalid in served CSS, keyboard focus to CHECKOUT,
 * :focus-visible brand outline), the 404 keeper, and og metadata.
 *
 * Systemic fix in the same task: this file is now tracked in git
 * (.gitignore exception !/scripts/verify-round7-fix.js) so gate scripts
 * survive container recycling.
 *
 * Usage: dev server on :3000, then `node scripts/verify-round7-fix.js`
 */
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:3000";
let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail = "") {
  if (ok) { pass++; results.push(`  PASS  ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; results.push(`  FAIL  ${name}${detail ? " — " + detail : ""}`); }
}
const section = (t) => results.push(`\n[${t}]`);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const req = (u) => page.request.get(BASE + u);

  // ---------- [1] home & layout restorations ----------
  section("home & layout restorations");
  const home = await req("/");
  check("home HTTP 200", home.ok(), String(home.status()));
  const homeHtml = await home.text();
  check(
    "JSON-LD org shard present",
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>/.test(homeHtml) &&
      /"@type"\s*:\s*"(Organization|Store)"/i.test(homeHtml),
    "ld+json with Organization/Store"
  );
  check(
    "skip link present",
    /<a[^>]*href=["']#main-content["']/i.test(homeHtml),
    'href="#main-content"'
  );
  check(
    "#main-content landmark present",
    /id=["']main-content["']/i.test(homeHtml),
    "id=main-content"
  );

  // ---------- [2] typography (Inter, true 800) ----------
  section("typography");
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  check("body font-family is Inter", /inter/i.test(bodyFont), bodyFont.slice(0, 40));
  const phFont = await page.evaluate(() => {
    const el = document.querySelector("input, textarea");
    return el ? getComputedStyle(el, "::placeholder").fontFamily : "NO-INPUT";
  });
  check("::placeholder inherits Inter", /inter/i.test(phFont), String(phFont).slice(0, 40));
  check(
    'hero line "ESSENTIAL GOODS YOU CAN TRUST" live',
    homeHtml.includes("ESSENTIAL GOODS YOU CAN TRUST"),
    "owner-approved copy"
  );
  // true 800 lives on .ms-weight-toggle (multi-variant PDP only)
  let w800 = { toggles: 0, computed: "-", on: 0 };
  try {
    const api = await req("/api/products");
    const j = await api.json();
    const prods = j.products || [];
    const multi = prods.find((pr) => pr && pr.slug);
    for (const pr of prods) {
      if (!pr.slug) continue;
      await page.goto(BASE + "/p/" + pr.slug, { waitUntil: "domcontentloaded" });
      const r = await page.evaluate(() => {
        const ts = [...document.querySelectorAll(".ms-weight-toggle")];
        return ts.length
          ? { toggles: ts.length, computed: getComputedStyle(ts[0]).fontWeight, on: ts.filter((t) => t.classList.contains("is-on")).length }
          : null;
      });
      if (r && r.toggles > 0) { w800 = r; break; }
    }
  } catch (e) { /* keep defaults */ }
  check(
    "PDP weight toggle uses true 800",
    w800.toggles > 0 && w800.computed === "800" && w800.on > 0,
    `toggles=${w800.toggles} computed=${w800.computed} is-on=${w800.on}`
  );

  // ---------- [3] drawer flow & money ----------
  section("drawer flow & money");
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  // 1) tile ADD TO CART -> quick-view
  let qvOpen = false;
  try {
    await page.locator("button").filter({ hasText: /add to cart/i }).first().click({ timeout: 8000 });
    await page.waitForTimeout(1000);
    qvOpen = await page.evaluate(() =>
      [...document.querySelectorAll('[data-state="open"]')].some((d) =>
        (d.getAttribute("data-slot") === "dialog-content" || !!d.querySelector(".ms-weight-toggle")) &&
        d.getClientRects().length > 0
      )
    );
  } catch (e) { /* keep false */ }
  check("tile ADD TO CART opens quick-view", qvOpen);
  // 2) add from quick-view -> cart count increments
  let cartCount = -1;
  try {
    await page.locator('[data-state="open"] button')
      .filter({ hasText: /add to cart/i }).last().click({ timeout: 8000 });
    await page.waitForTimeout(1200);
    cartCount = await page.evaluate(() => {
      const el = document.querySelector('button[aria-label^="Open cart"]');
      const m = el ? (el.getAttribute("aria-label") || "").match(/(\d+)/) : null;
      return m ? parseInt(m[1], 10) : -1;
    });
  } catch (e) { /* keep -1 */ }
  check("quick-view ADD TO CART increments cart", cartCount >= 1, `count=${cartCount}`);
  // 3) header cart pill -> drawer
  let drawerOpen = false, drawerUsh = "", contFs = "", contRadius = "";
  try {
    await page.evaluate(() => {
      const el = document.querySelector('button[aria-label^="Open cart"]');
      if (el) el.click();
    });
    await page.waitForTimeout(1200);
    const d = await page.evaluate(() => {
      const open = [...document.querySelectorAll('[data-state="open"]')];
      const drawer = open.find((n) => /checkout|continue shopping/i.test(n.textContent || ""));
      if (!drawer) return null;
      const cont = [...drawer.querySelectorAll("a,button")].find((e) =>
        /continue shopping/i.test(e.textContent || "")
      );
      const ush = (drawer.textContent.match(/USh\s?\d[\d,]*/g) || [])[0] || "";
      return {
        ush: ush.replace(/\s+/g, " "),
        contFs: cont ? getComputedStyle(cont).fontSize : "",
        contRadius: cont ? getComputedStyle(cont).borderRadius : "",
      };
    });
    if (d) {
      drawerOpen = true;
      drawerUsh = d.ush;
      contFs = d.contFs;
      contRadius = d.contRadius;
    }
  } catch (e) { /* keep defaults */ }
  check("drawer opens via header cart pill", drawerOpen);
  check("drawer shows USh money (single source fmt)", /^USh \d[\d,]*$/.test(drawerUsh), drawerUsh || "no USh total in drawer");
  check("CONTINUE SHOPPING is ms-label 10px", contFs === "10px", contFs || "not found");
  const rNum = parseFloat(contRadius);
  check(
    "rounded-md applied (85% dial ≈ 3.1px)",
    !isNaN(rNum) && Math.abs(rNum - 3.1) < 0.6,
    contRadius || "n/a"
  );

  // ---------- [4] button a11y & focus ----------
  section("button a11y & focus");
  // aria-invalid treatments live in the SERVED css (robust vs in-page walk)
  let aiCount = 0;
  try {
    const links = await page.evaluate(() =>
      [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href)
    );
    for (const href of links) {
      const css = await req(href.replace(BASE, "")).then((r) => r.text()).catch(() => "");
      aiCount += (css.match(/aria-invalid/g) || []).length;
    }
  } catch (e) { /* keep 0 */ }
  check("aria-invalid treatments kept", aiCount > 0, `${aiCount} occurrences in served CSS`);
  // keyboard focus reaches the CHECKOUT Button (data-slot) inside the drawer
  let focusTarget = "", focusVisible = false, focusStyle = "";
  try {
    for (let i = 0; i < 40 && !focusTarget; i++) {
      await page.keyboard.press("Tab");
      focusTarget = await page.evaluate(() => {
        const el = document.activeElement;
        if (el && el.matches('[data-slot="button"]') && /checkout/i.test(el.textContent || "")) {
          const m = (el.textContent || "").replace(/\s+/g, " ").trim();
          return m.slice(0, 30);
        }
        return "";
      });
    }
    focusVisible = await page.evaluate(() => {
      const el = document.activeElement;
      try { return !!el && el.matches(":focus-visible"); } catch { return false; }
    });
    focusStyle = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return "";
      const s = getComputedStyle(el);
      const ol = `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`;
      return s.boxShadow !== "none" ? ol + " shadow" : ol;
    });
  } catch (e) { /* keep defaults */ }
  check(
    "keyboard focus lands on CHECKOUT (data-slot Button)",
    !!focusTarget,
    focusTarget || "not reached in 40 tabs"
  );
  check(":focus-visible engages on keyboard focus", focusVisible);
  check(
    "visible brand focus treatment (ring or outline)",
    /solid|shadow/.test(focusStyle) && !/^none/.test(focusStyle),
    focusStyle.slice(0, 60)
  );

  // ---------- [5] 404 keeper ----------
  section("404 page");
  const nf = await req("/definitely-not-a-route-xyz");
  check("404 status", nf.status() === 404, String(nf.status()));
  const nfHtml = await nf.text();
  check("404 has HOME exit", /href=["']\/["']/.test(nfHtml), 'href="/"');

  // ---------- [6] metadata & seo ----------
  section("metadata & seo");
  check(
    "openGraph siteName/type restored",
    /property=["']og:site_name["']/i.test(homeHtml) &&
      /property=["']og:type["']/i.test(homeHtml),
    "og:site_name + og:type"
  );
  const robotsOk = (await req("/robots.txt")).ok();
  const sitemapOk = (await req("/sitemap.xml")).ok();
  check("robots.txt + sitemap.xml reachable", robotsOk && sitemapOk, `robots=${robotsOk} sitemap=${sitemapOk}`);

  await browser.close();
  results.forEach((l) => console.log(l));
  console.log(`\n==== RESULT: ${pass} pass / ${fail} fail ====`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("SUITE ERROR:", e.message);
  process.exit(2);
});
