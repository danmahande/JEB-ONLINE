/**
 * Round 7+ standing regression suite — 33 checks (session checks skip
 * without a customer-capable backend).
 *
 * REBUILT 2026-09-30 (Task 90): the original script was lost with the
 * container (it was gitignored under /scripts/*). This rebuild covers the
 * current storefront contract: layout/SEO, Inter typography, current hero
 * copy and single header search, pack selection when catalog data exists,
 * the tile -> quick-view -> cart flow when an in-stock product exists,
 * correct empty-cart behavior otherwise, current label sizing, keyboard
 * focus, the 404 keeper, and served metadata/assets.
 *
 * Systemic fix in the same task: this file is now tracked in git
 * (.gitignore exception !/scripts/verify-round7-fix.js) so gate scripts
 * survive container recycling.
 *
 * Usage: production build and server on :3000, then
 * `node scripts/verify-round7-fix.js`. Catalog-dependent checks are
 * explicitly skipped when the API contains no matching active products.
 */
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:3000";
let pass = 0, fail = 0, skipped = 0;
const results = [];
function check(name, ok, detail = "") {
  if (ok) { pass++; results.push(`  PASS  ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; results.push(`  FAIL  ${name}${detail ? " — " + detail : ""}`); }
}
function skip(name, reason) {
  skipped++;
  results.push(`  SKIP  ${name} — ${reason}`);
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
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  check("body font-family is Inter", /inter/i.test(bodyFont), bodyFont.slice(0, 40));
  const phFont = await page.evaluate(() => {
    const el = document.querySelector("input, textarea");
    return el ? getComputedStyle(el, "::placeholder").fontFamily : "NO-INPUT";
  });
  check("::placeholder inherits Inter", /inter/i.test(phFont), String(phFont).slice(0, 40));
  const api = await req("/api/products");
  const productResponse = await api.json();
  const products = Array.isArray(productResponse.products) ? productResponse.products : [];
  const multiVariantProduct = products.find((product) =>
    product?.slug && Array.isArray(product.variants) && product.variants.length > 1
  );
  const heroImageLoaded = await page.locator('section[aria-label="Hero"] img').evaluate((image) =>
    image.complete && image.naturalWidth > 0
  );
  const desktopSearchState = await page.evaluate(() => {
    const forms = [...document.querySelectorAll("header form[role='search']")];
    return {
      count: forms.length,
      visible: forms.filter((form) => form.getClientRects().length > 0).length,
      heroSearchCount: document.querySelectorAll('section[aria-label="Hero"] form[role="search"]').length,
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileSearchVisible = await page.locator("header form[role='search']").evaluateAll((forms) =>
    forms.filter((form) => form.getClientRects().length > 0).length
  );
  await page.setViewportSize({ width: 1280, height: 720 });
  check(
    "current hero, responsive header search, and catalog feed",
    homeHtml.includes("UGANDA-ORIGIN SUPPLY FOR EAST AFRICA") &&
      homeHtml.includes("Trusted grains and hardware,") &&
      homeHtml.includes("SHOP THE RACK") &&
      homeHtml.includes("TRACK ORDER") &&
      heroImageLoaded &&
      desktopSearchState.count === 2 &&
      desktopSearchState.visible === 1 &&
      desktopSearchState.heroSearchCount === 0 &&
      mobileSearchVisible === 1 &&
      api.ok() &&
      productResponse.success === true &&
      productResponse.count === products.length,
    `hero asset loaded; desktop/mobile searches visible; catalog API HTTP ${api.status()}, ${products.length} active products`
  );
  if (multiVariantProduct) {
    await page.goto(`${BASE}/p/${multiVariantProduct.slug}`, { waitUntil: "networkidle" });
    const w800 = await page.evaluate(() => {
      const toggles = [...document.querySelectorAll(".ms-weight-toggle")];
      return {
        count: toggles.length,
        weight: toggles[0] ? getComputedStyle(toggles[0]).fontWeight : "-",
        selected: toggles.some((toggle) => toggle.classList.contains("is-on")),
      };
    });
    check("PDP pack toggle uses true 800", w800.count > 0 && w800.weight === "800" && w800.selected,
      `toggles=${w800.count} computed=${w800.weight} selected=${w800.selected}`);
  } else {
    skip("PDP pack toggle uses true 800", "catalog API has no active multi-variant product");
  }

  // ---------- [2b] ticker strip — served countries + live FX ----------
  // Round 23 restoration: the ticker renders SERVING (countries) and
  // LIVE FX (1 USD ≈ corridor rates) from /api/fx. This is a data-path
  // check (Gate 7): the numbers on screen must equal the API's numbers.
  section("ticker strip — countries + live FX");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const fxRes = await req("/api/fx");
  const fxOk = fxRes.ok();
  const fxData = fxOk ? await fxRes.json().catch(() => null) : null;
  const fxRegions = fxData?.success && Array.isArray(fxData.regions) ? fxData.regions : [];
  if (!fxOk || fxRegions.length === 0) {
    skip("ticker shows served countries from /api/fx", "fx feed unavailable or empty");
    skip("ticker reflects live FX rates from /api/fx", "fx feed unavailable or empty");
  } else {
    let trackText = "";
    try {
      await page.waitForFunction(
        () => (document.querySelector(".ms-marquee-track")?.textContent || "").includes("LIVE FX"),
        undefined,
        { timeout: 10000 }
      );
      trackText = await page.textContent(".ms-marquee-track");
    } catch {
      trackText = await page.textContent(".ms-marquee-track").catch(() => "");
    }
    const countries = fxRegions.map((r) => r.countryName);
    check(
      "ticker shows served countries from /api/fx",
      trackText.includes("SERVING") && countries.every((c) => trackText.includes(c)),
      `${countries.join(" · ")}`
    );
    const expectedRates = fxRegions
      .filter((r) => r.currency !== "USD" && r.rateToUsd > 0)
      .map((r) => `${r.currency} ${Math.round(r.rateToUsd).toLocaleString("en-US")}`)
      .join(" · ");
    check(
      "ticker reflects live FX rates from /api/fx",
      trackText.includes("LIVE FX — 1 USD ≈") && trackText.includes(expectedRates),
      expectedRates
    );
  }
  const collapse = await page.evaluate(async () => {
    const strip = document.querySelector("header > div");
    const styleOf = () => {
      const s = getComputedStyle(strip);
      return { maxHeight: s.maxHeight, opacity: s.opacity };
    };
    window.scrollTo(0, 400);
    await new Promise((r) => setTimeout(r, 600));
    const scrolled = styleOf();
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 600));
    const top = styleOf();
    return { scrolled, top };
  });
  check(
    "ticker collapses on scroll and re-expands at top",
    collapse.scrolled.maxHeight === "0px" &&
      collapse.scrolled.opacity === "0" &&
      collapse.top.maxHeight !== "0px" &&
      collapse.top.opacity === "1",
    `scrolled=${collapse.scrolled.maxHeight}/${collapse.scrolled.opacity} top=${collapse.top.maxHeight}/${collapse.top.opacity}`
  );

  // ---------- [2c] header order & account entry (owner-directed) ----------
  // Round 23 put ACCOUNT rightmost; Round 24 moved to the Amazon order —
  // ACCOUNT (greeting + menu) BEFORE the cart, cart keeps the extreme right
  // with extra spacing, and the entry greets Amazon-style (HELLO, …).
  section("header order & account entry");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => !!document.querySelector('button[aria-label="Account menu"]'),
    undefined,
    { timeout: 10000 }
  );
  const order = await page.evaluate(() => {
    const bar = document.querySelector("header .container");
    if (!bar) return { ok: false, why: "header bar not found" };
    const interactive = [...bar.querySelectorAll("button, a, select, input")].filter(
      (el) => el.getClientRects().length > 0 && !el.closest('[role="menu"]')
    );
    const cart = bar.querySelector('button[aria-label^="Open cart"]');
    const account = bar.querySelector('button[aria-label="Account menu"]');
    if (!cart || !account) return { ok: false, why: "cart or account trigger missing" };
    const cartBox = cart.getBoundingClientRect();
    const acctBox = account.getBoundingClientRect();
    const maxRight = interactive.length
      ? Math.max(...interactive.map((el) => el.getBoundingClientRect().right))
      : -Infinity;
    const gap = cartBox.left - acctBox.right;
    return {
      ok:
        Math.abs(maxRight - cartBox.right) < 2 &&
        acctBox.right <= cartBox.left &&
        gap >= 24,
      why: `cart=${Math.round(cartBox.right)} acct=${Math.round(acctBox.right)} gap=${Math.round(gap)} els=${interactive.length}`,
    };
  });
  check(
    "CART is rightmost, ACCOUNT sits before it with widened spacing",
    order.ok,
    order.why || ""
  );
  const greetingText = await page.textContent('button[aria-label="Account menu"]');
  check(
    "account entry greets Amazon-style (HELLO, … / ACCOUNT)",
    !!greetingText && greetingText.includes("HELLO,") && greetingText.includes("ACCOUNT"),
    (greetingText || "").replace(/\s+/g, " ").trim().slice(0, 40)
  );
  await page.locator('button[aria-label="Account menu"]').click();
  let anonMenu = false;
  try {
    const menu = page.getByRole("menu");
    await menu.getByText("SIGN IN", { exact: true }).waitFor({ state: "visible", timeout: 5000 });
    anonMenu = await menu.getByText("CREATE ACCOUNT", { exact: true }).isVisible();
  } catch {
    anonMenu = false;
  }
  await page.keyboard.press("Escape");
  check("anonymous account menu offers SIGN IN + CREATE ACCOUNT", anonMenu);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("header .md\\:hidden button").first().click();
  let mobileAccount = false;
  try {
    await page
      .getByRole("menu")
      .getByText("ACCOUNT", { exact: true })
      .waitFor({ state: "visible", timeout: 5000 });
    mobileAccount = true;
  } catch {
    mobileAccount = false;
  }
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1280, height: 720 });
  check("mobile hamburger menu still carries ACCOUNT", mobileAccount);

  // /account is a session-dependent redirect (signed-in -> /account/orders,
  // anon -> /account/login). It must render DYNAMICALLY: a static prerender
  // bakes the no-session branch and signed-in customers can never reach
  // their orders (Round 23 offense #43). Exercise both branches over HTTP
  // with a real customer session — this is the click-through of the header
  // ACCOUNT link, the owner-directed entry point.
  const authed = await (async () => {
    const email = `suite-${Date.now()}@test.example`;
    const password = "SuiteGate23!x";
    const reg = await page.request.post(`${BASE}/api/account/register`, {
      data: { email, password, name: "Suite Gate" },
      headers: { Origin: BASE },
    });
    if (!reg.ok() && reg.status() !== 409) return null;
    const csrfRes = await page.request.get(`${BASE}/api/auth/csrf`);
    const csrf = (await csrfRes.json().catch(() => null))?.csrfToken;
    if (!csrf) return null;
    const login = await page.request.post(`${BASE}/api/auth/callback/customer`, {
      form: { csrfToken: csrf, email, password },
      headers: { Origin: BASE },
      maxRedirects: 0,
    });
    if (login.status() !== 302) return null;
    return email;
  })();
  if (!authed) {
    skip("signed-in /account routes to /account/orders", "customer register/login unavailable");
  } else {
    const acctRes = await page.request.get(`${BASE}/account`, { maxRedirects: 0 });
    const acctLoc = acctRes.headers().location || "";
    check(
      "signed-in /account routes to /account/orders (not the baked login 307)",
      acctRes.status() === 307 && acctLoc.endsWith("/account/orders"),
      `status=${acctRes.status()} loc=${acctLoc || "none"}`
    );

    // The header greets the signed-in customer by name and offers the
    // relevant menu; SIGN OUT must actually end the session (Gate 7).
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    let greetOk = false, menuOk = false;
    try {
      await page.waitForFunction(
        () => (document.querySelector('button[aria-label="Account menu"]')?.textContent || "").includes("HELLO, SUITE"),
        undefined,
        { timeout: 10000 }
      );
      greetOk = true;
    } catch { greetOk = false; }
    if (greetOk) {
      const menu = page.getByRole("menu");
      await page.locator('button[aria-label="Account menu"]').click();
      try {
        await menu.getByText("YOUR ORDERS", { exact: true }).waitFor({ state: "visible", timeout: 5000 });
        menuOk = await menu.getByText("SIGN OUT", { exact: true }).isVisible();
      } catch { menuOk = false; }
      if (menuOk) {
        await menu.getByText("SIGN OUT", { exact: true }).click();
        await page.waitForURL(`${BASE}/`, { timeout: 15000 });
        await page.waitForFunction(
          () => (document.querySelector('button[aria-label="Account menu"]')?.textContent || "").includes("HELLO, SIGN IN"),
          undefined,
          { timeout: 10000 }
        ).catch(() => {});
      }
    }
    check(
      "signed-in header greets by name and offers YOUR ORDERS + SIGN OUT",
      greetOk && menuOk,
      greetOk ? (menuOk ? "menu shown" : "menu missing items") : "greeting never showed name"
    );
    const afterSignout = await page.request.get(`${BASE}/api/auth/session`);
    const sessionBody = (await afterSignout.text()).trim();
    check(
      "SIGN OUT ends the customer session",
      sessionBody === "{}" || sessionBody === "",
      `session=${sessionBody.slice(0, 60)}`
    );
  }
  // page.request shares the browser context's cookie jar — drop the session
  // cookie so the anonymous branch is genuinely anonymous.
  await page.context().clearCookies();
  const anonAcct = await page.request.get(`${BASE}/account`, { maxRedirects: 0 });
  check(
    "anonymous /account routes to /account/login",
    anonAcct.status() === 307 && (anonAcct.headers().location || "").endsWith("/account/login"),
    `status=${anonAcct.status()} loc=${anonAcct.headers().location || "none"}`
  );

  // ---------- [3] drawer flow & money ----------
  section("drawer flow & money");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const stockedProduct = products.find((product) => product?.slug && product.currentStock > 0);
  let cartCount = 0;
  let cartFlowRan = false;
  if (stockedProduct) {
    const tileAction = page.locator('button[aria-label*="choose pack and quantity"]').first();
    await tileAction.waitFor({ state: "visible", timeout: 10000 });
    await tileAction.click();
    const quickView = page.getByRole("dialog");
    await quickView.waitFor({ state: "visible", timeout: 10000 });
    check("tile ADD TO CART opens quick-view", await quickView.isVisible());

    await quickView.getByRole("button", { name: /^ADD TO CART$/i }).click();
    await page.waitForFunction(() => {
      const button = document.querySelector('button[aria-label^="Open cart"]');
      return Number(button?.getAttribute("aria-label")?.match(/\((\d+) items\)/)?.[1] ?? 0) > 0;
    }, undefined, { timeout: 10000 });
    cartCount = await page.evaluate(() => {
      const button = document.querySelector('button[aria-label^="Open cart"]');
      return Number(button?.getAttribute("aria-label")?.match(/\((\d+) items\)/)?.[1] ?? 0);
    });
    cartFlowRan = true;
    check("quick-view ADD TO CART increments cart", cartCount >= 1, `count=${cartCount}`);
  } else {
    skip("tile ADD TO CART opens quick-view", "catalog API has no active in-stock product");
    skip("quick-view ADD TO CART increments cart", "catalog API has no active in-stock product");
  }

  // Header cart remains operable with either an empty or populated catalog.
  let drawerOpen = false, drawerMoney = "", contFs = "", contRadius = "";
  await page.evaluate(() => {
    document.querySelector('button[aria-label^="Open cart"]')?.click();
  });
  const drawer = page.locator('[data-state="open"]').filter({ hasText: /continue shopping|checkout/i }).last();
  await drawer.waitFor({ state: "visible", timeout: 10000 });
  const drawerDetails = await drawer.evaluate((element) => {
    const continueButton = [...element.querySelectorAll("button")].find((button) =>
      /continue shopping/i.test(button.textContent || "")
    );
    return {
      text: element.textContent || "",
      continueFontSize: continueButton ? getComputedStyle(continueButton).fontSize : "",
      continueBorderRadius: continueButton ? getComputedStyle(continueButton).borderRadius : "",
    };
  });
  const emptyStateVisible = await page.getByText("EMPTY", { exact: true }).isVisible();
  drawerOpen = true;
  drawerMoney = (drawerDetails.text.match(/(?:USh|KSh|TSh|FRw|FC|\$)\s?[\d,]+(?:\.\d+)?/g) || [])[0] || "";
  contFs = drawerDetails.continueFontSize;
  contRadius = drawerDetails.continueBorderRadius;
  check("drawer opens via header cart pill", drawerOpen);
  check(
    "drawer reflects its cart state",
    cartFlowRan
      ? /(?:USh|KSh|TSh|FRw|FC|\$)\s?[\d,]+(?:\.\d+)?/.test(drawerMoney)
      : emptyStateVisible,
    cartFlowRan ? drawerMoney || "no formatted destination-currency total" : `empty state visible=${emptyStateVisible}`
  );
  check("CONTINUE SHOPPING uses the current ms-label size", contFs === "11px", contFs || "not found");
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
  // Keyboard focus reaches the primary action that matches the current cart state.
  let focusTarget = "", focusVisible = false, focusStyle = "";
  const focusPattern = cartFlowRan ? /checkout/i : /continue shopping/i;
  for (let i = 0; i < 40 && !focusTarget; i++) {
    await page.keyboard.press("Tab");
    focusTarget = await page.evaluate((pattern) => {
      const element = document.activeElement;
      if (element?.matches('[data-slot="button"]') && pattern.test(element.textContent || "")) {
        return (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
      }
      return "";
    }, focusPattern);
  }
  focusVisible = await page.evaluate(() => document.activeElement?.matches(":focus-visible") ?? false);
  focusStyle = await page.evaluate(() => {
    const element = document.activeElement;
    if (!element) return "";
    const style = getComputedStyle(element);
    return `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`;
  });
  check(
    `keyboard focus reaches ${cartFlowRan ? "CHECKOUT" : "CONTINUE SHOPPING"}`,
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
  console.log(`\n==== RESULT: ${pass} pass / ${fail} fail / ${skipped} skipped ====`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("SUITE ERROR:", e.message);
  process.exit(2);
});
