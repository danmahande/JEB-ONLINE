/**
 * Round 7+ standing regression suite — 45 checks (session/admin checks
 * skip without customer/admin-capable backends; SUITE_ADMIN_EMAIL +
 * SUITE_ADMIN_PASSWORD enable the round-26 admin-phase checks).
 *
 * REBUILT 2026-09-30 (Task 90): the original script was lost with the
 * container (it was gitignored under /scripts/*). This rebuild covers the
 * current storefront contract: layout/SEO, Inter typography, current hero
 * copy and single header search, pack selection when catalog data exists,
 * the tile -> quick-view -> cart flow when an in-stock product exists,
 * correct empty-cart behavior otherwise, current label sizing, keyboard
 * focus, the 404 keeper, and served metadata/assets.
 *
 * Round 23-26 additions: ticker data path, header account contract
 * (Amazon pattern + caret), /account dynamic branches, and the full
 * round-26 order pipeline — PII-stripped tracking, customer/admin cancel
 * with stock restore, admin orders list/advance/note/cancel, the stock
 * movement ledger, register throttling, and the contact page.
 *
 * Systemic fix in the same task: this file is now tracked in git
 * (.gitignore exception !/scripts/verify-round7-fix.js) so gate scripts
 * survive container recycling.
 *
 * Usage: production build and server on :3000, then
 * `node scripts/verify-round7-fix.js`. Catalog-dependent checks are
 * explicitly skipped when the API contains no matching active products.
 * NOTE: the register-throttle check burns the local IP's sign-up window
 * (5/15min) — rerunning the suite within 15 minutes will skip the
 * customer-phase checks unless the register_attempt row is cleared.
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
  // Round 25: the entry must LOOK like a control — pointer cursor, hover
  // treatment, and a caret that visibly rotates while the menu is open.
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
  // Clickability you can SEE, not guess: pointer cursor + hover pill + a
  // caret that is actually on screen (Round 25 owner ask).
  const afford = await page.evaluate(() => {
    const t = document.querySelector('button[aria-label="Account menu"]');
    if (!t) return null;
    const caret = t.querySelector("svg");
    return {
      cursor: getComputedStyle(t).cursor,
      hoverClass: t.className.includes("hover:bg-line"),
      caretVisible: !!caret && caret.getClientRects().length > 0,
    };
  });
  check(
    "ACCOUNT entry reads as clickable (pointer cursor + hover treatment)",
    !!afford && afford.cursor === "pointer" && afford.hoverClass,
    afford ? `cursor=${afford.cursor} hover=${afford.hoverClass}` : "trigger missing"
  );
  check(
    "ACCOUNT entry carries a visible caret",
    !!afford && afford.caretVisible,
    afford ? `caretVisible=${afford.caretVisible}` : "trigger missing"
  );
  await page.locator('button[aria-label="Account menu"]').click();
  let anonMenu = false;
  let openAfford = { state: "", rotated: false };
  try {
    const menu = page.getByRole("menu");
    await menu.getByText("SIGN IN", { exact: true }).waitFor({ state: "visible", timeout: 5000 });
    anonMenu = await menu.getByText("CREATE ACCOUNT", { exact: true }).isVisible();
    openAfford = await page.evaluate(() => {
      const t = document.querySelector('button[aria-label="Account menu"]');
      const caret = t?.querySelector("svg");
      if (!caret) return { state: t?.getAttribute("data-state") || "", rotated: false };
      const s = getComputedStyle(caret);
      // Tailwind v4 rotate-* uses the native CSS rotate property; accept
      // either that or a transform matrix so the check survives engines.
      return {
        state: t?.getAttribute("data-state") || "",
        rotated: (s.rotate && s.rotate !== "none") || s.transform !== "none",
      };
    });
  } catch {
    anonMenu = false;
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(350); // caret transition (200ms) settles before the reset read
  const closedAfford = await page.evaluate(() => {
    const t = document.querySelector('button[aria-label="Account menu"]');
    const caret = t?.querySelector("svg");
    if (!caret) return { state: t?.getAttribute("data-state") || "", rotated: true };
    const s = getComputedStyle(caret);
    return {
      state: t?.getAttribute("data-state") || "",
      rotated: (s.rotate && s.rotate !== "none") || s.transform !== "none",
    };
  });
  check("anonymous account menu offers SIGN IN + CREATE ACCOUNT", anonMenu);
  check(
    "caret rotates while the menu is open and resets on close",
    openAfford.state === "open" &&
      openAfford.rotated === true &&
      closedAfford.state === "closed" &&
      closedAfford.rotated === false,
    `open=${openAfford.state}/rot=${openAfford.rotated} closed=${closedAfford.state}/rot=${closedAfford.rotated}`
  );
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

  // ---------- [7] round-26 order pipeline ----------
  // Gate 7 for every new/changed data path: PII-stripped tracking, customer
  // cancel with stock restore, admin orders (list/advance/note/cancel),
  // stock ledger, admin-gate role separation, register throttle, contact.
  section("round-26 order pipeline (PII, cancel, admin orders, stock)");

  const contactRes = await req("/contact");
  const contactHtml = await contactRes.text();
  check(
    "contact page live with real channels only",
    contactRes.ok() &&
      contactHtml.includes("CONTACT SALES") &&
      contactHtml.toLowerCase().includes("sales@meridiansupply.co"),
    `HTTP ${contactRes.status()}`
  );

  const pipelineProduct = products.find((p) => p?.productId && p.currentStock >= 10);

  // ---------- [8] round-27 bus cargo: public operators API ----------
  // The checkout operator picker reads this endpoint — the fleet must be
  // listed with whitelisted fields only, per corridor and fleet-wide.
  section("round-27 bus cargo (operators, receiver, freight math)");

  const opsRes = await req("/api/shipping/operators?region=UG");
  const opsData = await opsRes.json().catch(() => ({}));
  const ugOperators = opsData?.operators || [];
  check(
    "public operators API: UG fleet with whitelisted fields only",
    opsRes.ok() &&
      ugOperators.length >= 3 &&
      ugOperators.every(
        (o) =>
          o.regionCode === "UG" &&
          typeof o.cargoRatePerKg === "number" &&
          typeof o.minCharge === "number" &&
          typeof o.bookingNote === "string" &&
          !("updatedAt" in o) &&
          !("createdAt" in o)
      ),
    `HTTP ${opsRes.status()} fleet=${ugOperators.length}`
  );
  const allOpsRes = await req("/api/shipping/operators");
  const allOps = await allOpsRes.json().catch(() => ({}));
  check(
    "operators API without region returns the full fleet across corridors",
    allOpsRes.ok() &&
      (allOps?.operators || []).length >= 10 &&
      new Set((allOps?.operators || []).map((o) => o.regionCode)).size >= 4,
    `fleet=${(allOps?.operators || []).length} corridors=${new Set((allOps?.operators || []).map((o) => o.regionCode)).size}`
  );

  if (!pipelineProduct) {
    skip("round-26 order pipeline", "no active product with stock >= 10");
  } else {
    const stockOf = async () => {
      const r = await req("/api/products");
      const d = await r.json();
      const p = (d.products || []).find((x) => x.productId === pipelineProduct.productId);
      return p ? p.currentStock : null;
    };
    const post = (u, data, extra = {}) =>
      page.request.post(BASE + u, {
        data,
        headers: { Origin: BASE, ...(extra.headers || {}) },
        ...extra,
      });

    // --- admin/stock gate is closed BEFORE any session exists (jar cleared
    // at the end of [2c]) ---
    const anonAdmin = await req("/api/admin/orders");
    check("admin orders API closed to anonymous callers", anonAdmin.status() === 401, String(anonAdmin.status()));

    // --- customer phase ---
    const custEmail = `pipe-${Date.now()}@test.example`;
    const custReg = await post("/api/account/register", {
      email: custEmail, password: "Pipeline26!x", name: "Pipeline Probe",
    });
    const csrf2 = (await (await req("/api/auth/csrf")).json())?.csrfToken;
    const custLogin = await page.request.post(`${BASE}/api/auth/callback/customer`, {
      form: { csrfToken: csrf2, email: custEmail, password: "Pipeline26!x" },
      headers: { Origin: BASE },
      maxRedirects: 0,
    });
    if (!custReg.ok() || custLogin.status() !== 302) {
      skip("round-26 customer-phase checks", `register=${custReg.status()} login=${custLogin.status()}`);
    } else {
      // Round 27: the corridor fleet drives checkout. GM Coach (sortOrder 1)
      // leads the UG list; a KE operator exists for the cross-corridor probe.
      const cargoOperator = ugOperators[0];
      const crossOperator =
        ((await (await req("/api/shipping/operators?region=KE")).json().catch(() => ({})))
          ?.operators || [])[0];
      if (!cargoOperator) {
        skip("round-27 customer-phase checks", "UG operator fleet missing");
      } else {
      const baseOrder = (qty) => ({
        customerName: "Pipeline Probe",
        contact: "+256700000001",
        email: custEmail,
        address: "1 Suite Lane",
        city: "Kampala",
        country: "UG",
        paymentMethod: "MTN MoMo",
        receiverName: "Rider Probe",
        receiverPhone: "+256770000002",
        operatorId: cargoOperator.id,
        cart: [{ productId: pipelineProduct.productId, qty }],
      });
      const placeOrder = async (qty, overrides = {}) => {
        const r = await post("/api/orders", { ...baseOrder(qty), ...overrides });
        const d = await r.json().catch(() => ({}));
        return { status: r.status(), body: d };
      };
      const stockBefore = await stockOf();

      // role separation: a customer session must NOT read the admin list
      const custAdmin = await req("/api/admin/orders");
      check("admin orders API closed to customer sessions", custAdmin.status() === 401, String(custAdmin.status()));

      // ---- round-27 checkout guards (server-side, never client-honored) ----
      const missingOperator = await post("/api/orders", {
        ...baseOrder(1),
        operatorId: undefined,
        receiverName: undefined,
        receiverPhone: undefined,
      });
      const missingOperatorBody = await missingOperator.json().catch(() => ({}));
      check(
        "operator-served checkout without an operator 400s",
        missingOperator.status() === 400 && /operator/i.test(missingOperatorBody?.error || ""),
        `HTTP ${missingOperator.status()} ${missingOperatorBody?.error || ""}`
      );
      const missingReceiver = await post("/api/orders", {
        ...baseOrder(1),
        receiverName: undefined,
        receiverPhone: undefined,
      });
      const missingReceiverBody = await missingReceiver.json().catch(() => ({}));
      check(
        "checkout without a terminal receiver 400s",
        missingReceiver.status() === 400 && /receiver/i.test(missingReceiverBody?.error || ""),
        `HTTP ${missingReceiver.status()} ${missingReceiverBody?.error || ""}`
      );
      if (crossOperator) {
        const crossCorridor = await post("/api/orders", {
          ...baseOrder(1),
          operatorId: crossOperator.id,
        });
        check(
          "operator from another corridor rejected with 400",
          crossCorridor.status() === 400,
          `HTTP ${crossCorridor.status()}`
        );
      } else {
        skip("cross-corridor operator probe", "KE fleet missing");
      }

      // order 1: placed -> PII-stripped tracking -> cancel -> stock restored
      const o1 = await placeOrder(2);
      check("order placed through the API (customer session)", o1.status === 201 && o1.body?.order?.orderNumber, `HTTP ${o1.status}`);
      const on1 = o1.body?.order?.orderNumber || "";

      // freight must be the operator's tariff — per-kg with a minimum —
      // computed SERVER-SIDE from the catalog weight (client never sends money)
      const expectedFreight = Math.max(
        cargoOperator.minCharge,
        cargoOperator.cargoRatePerKg * (o1.body?.order?.totalWeightKg || 0)
      );
      check(
        "freight charged at the operator tariff (per-kg with minimum, ETA + receiver echoed)",
        o1.body?.order?.freightSource === "bus_operator" &&
          o1.body?.order?.operatorName === cargoOperator.name &&
          Math.abs((o1.body?.order?.shippingAmount || 0) - Math.round(expectedFreight * 100) / 100) < 0.011 &&
          o1.body?.order?.etaDays === `${cargoOperator.transitDaysMin}-${cargoOperator.transitDaysMax} DAYS` &&
          o1.body?.order?.receiverName === "Rider Probe",
        `operator=${o1.body?.order?.operatorName} freight=${o1.body?.order?.shippingAmount} expected=${Math.round(expectedFreight * 100) / 100} eta=${o1.body?.order?.etaDays}`
      );

      const track1 = await req(`/api/orders?orderNumber=${encodeURIComponent(on1)}`);
      const t1 = await track1.json().catch(() => ({}));
      const orderKeys = Object.keys(t1?.order || {});
      const piiKeys = ["customerInfo", "customerName", "customerId", "notes", "customerAccountId", "receiverName", "receiverPhone"];
      check(
        "public tracking leaks NO customer PII (offense #44 class)",
        track1.ok() &&
          !piiKeys.some((k) => orderKeys.includes(k)) &&
          !JSON.stringify(t1).includes("1 Suite Lane") &&
          !JSON.stringify(t1).includes("Rider Probe") &&
          t1?.order?.operatorName === cargoOperator.name &&
          t1?.order?.status === "new_order" &&
          Array.isArray(t1?.lineItems),
        `keys=${orderKeys.join(",")}`
      );

      // the BUYER's own session sees the receiver + operator on /account/orders
      const acctRes = await req("/account/orders");
      const acctHtml = await acctRes.text();
      check(
        "signed-in buyer sees the terminal receiver on their orders",
        acctRes.ok() && acctHtml.includes("Rider Probe") && acctHtml.includes(cargoOperator.name),
        `HTTP ${acctRes.status()}`
      );

      const cancelRes = await post("/api/account/orders/cancel", { orderNumber: on1 });
      const cancelBody = await cancelRes.json().catch(() => ({}));
      const stockAfterCancel = await stockOf();
      const track1b = await (await req(`/api/orders?orderNumber=${encodeURIComponent(on1)}`)).json().catch(() => ({}));
      check(
        "customer cancel: 200, status cancelled, stock restored",
        cancelRes.status() === 200 &&
          cancelBody?.order?.status === "cancelled" &&
          track1b?.order?.status === "cancelled" &&
          stockAfterCancel === stockBefore,
        `HTTP ${cancelRes.status()} stock ${stockBefore}->${stockAfterCancel}`
      );
      const cancelAgain = await post("/api/account/orders/cancel", { orderNumber: on1 });
      check("second cancel rejected with 409", cancelAgain.status() === 409, String(cancelAgain.status()));

      // orders 2 & 3 for the admin phase (placed while still the customer)
      const o2 = await placeOrder(2);
      const o3 = await placeOrder(1);
      check("orders 2+3 placed for admin phase", o2.status === 201 && o3.status === 201, `HTTP ${o2.status}/${o3.status}`);
      const on2 = o2.body?.order?.orderNumber || "";
      const on3 = o3.body?.order?.orderNumber || "";
      const stockAfterOrders = await stockOf();

      // --- admin phase ---
      const adminEmail = process.env.SUITE_ADMIN_EMAIL;
      const adminPassword = process.env.SUITE_ADMIN_PASSWORD;
      if (!adminEmail || !adminPassword) {
        skip("round-26 admin-phase checks", "SUITE_ADMIN_EMAIL/SUITE_ADMIN_PASSWORD not set");
      } else {
        await page.context().clearCookies();
        const csrf3 = (await (await req("/api/auth/csrf")).json())?.csrfToken;
        const adminLogin = await page.request.post(`${BASE}/api/auth/callback/credentials`, {
          form: { csrfToken: csrf3, email: adminEmail, password: adminPassword, callbackUrl: "/admin/products" },
          headers: { Origin: BASE },
          maxRedirects: 0,
        });
        if (adminLogin.status() !== 302) {
          skip("round-26 admin-phase checks", `admin login=${adminLogin.status()}`);
        } else {
          const listRes = await req("/api/admin/orders");
          const list = await listRes.json().catch(() => ({}));
          check(
            "admin orders list: gated, populated, with counts",
            listRes.ok() &&
              Array.isArray(list?.orders) &&
              list.orders.length > 0 &&
              typeof list?.counts === "object" &&
              list.orders.some((o) => o.orderNumber === on2),
            `HTTP ${listRes.status()} orders=${(list.orders || []).length}`
          );
          const pageRes = await req("/api/admin/orders?page=1&pageSize=5");
          const pageData = await pageRes.json().catch(() => ({}));
          check(
            "admin orders pagination slices and counts",
            pageRes.ok() &&
              (pageData?.orders || []).length === Math.min(5, pageData?.total ?? 0) &&
              pageData?.totalPages === Math.ceil((pageData?.total ?? 0) / 5) &&
              pageData?.total >= 3,
            `total=${pageData?.total} totalPages=${pageData?.totalPages}`
          );

          const patch = async (on, action, note) => {
            const r = await page.request.patch(
              BASE + `/api/admin/orders/${encodeURIComponent(on)}`,
              { data: { action, note }, headers: { Origin: BASE } }
            );
            return { status: r.status(), body: await r.json().catch(() => ({})) };
          };

          // order 2: advance -> note -> cancel (processing) -> stock restored
          const adv1 = await patch(on2, "advance");
          const track2 = await (await req(`/api/orders?orderNumber=${encodeURIComponent(on2)}`)).json().catch(() => ({}));
          const noteRes = await patch(on2, "note", "Suite note: dispatch run scheduled.");
          const track2b = await (await req(`/api/orders?orderNumber=${encodeURIComponent(on2)}`)).json().catch(() => ({}));
          const adminCancel = await patch(on2, "cancel");
          const stockAfterAdminCancel = await stockOf();
          const track2c = await (await req(`/api/orders?orderNumber=${encodeURIComponent(on2)}`)).json().catch(() => ({}));
          check(
            "admin advance + customer-visible note + cancel with stock restore",
            adv1.status === 200 && adv1.body?.order?.status === "processing" &&
              track2?.order?.status === "processing" &&
              noteRes.status === 200 &&
              (track2b?.events || []).some((e) => (e.note || "").includes("Suite note")) &&
              adminCancel.status === 200 && adminCancel.body?.order?.status === "cancelled" &&
              track2c?.order?.status === "cancelled" &&
              stockAfterAdminCancel === stockAfterOrders + 2, // o2's qty returns to the shelf
            `advance=${adv1.status} note=${noteRes.status} cancel=${adminCancel.status} stock ${stockAfterOrders}->${stockAfterAdminCancel}`
          );
          const advCancelled = await patch(on2, "advance");
          check("advance on cancelled order rejected with 409", advCancelled.status === 409, String(advCancelled.status));

          // order 3: full walk to delivered, then 409
          const a1 = await patch(on3, "advance");
          const a2 = await patch(on3, "advance");
          const a3 = await patch(on3, "advance");
          const a4 = await patch(on3, "advance");
          check(
            "admin walks order to delivered; extra advance 409s",
            a1.status === 200 && a2.status === 200 && a3.status === 200 &&
              a3.body?.order?.status === "delivered" && a4.status === 409,
            `${a1.status}/${a2.status}/${a3.status}/${a4.status}`
          );

          // stock ledger: receipt moves stock, movement recorded, guards hold
          const stockPreAdjust = await stockOf();
          const adj = await post("/api/admin/stock", {
            productId: pipelineProduct.productId, delta: 4, reason: "receipt", note: "Suite receipt GRN-001",
          });
          const adjBody = await adj.json().catch(() => ({}));
          const stockPostAdjust = await stockOf();
          const mvRes = await req(`/api/admin/stock?productId=${encodeURIComponent(pipelineProduct.productId)}&take=8`);
          const mv = await mvRes.json().catch(() => ({}));
          const neg = await post("/api/admin/stock", {
            productId: pipelineProduct.productId, delta: -99999, reason: "damage",
          });
          const zero = await post("/api/admin/stock", {
            productId: pipelineProduct.productId, delta: 0, reason: "adjustment",
          });
          check(
            "stock ledger: adjust applies, records, and guards negatives/zeros",
            adj.status() === 201 &&
              adjBody?.movement?.delta === 4 &&
              stockPostAdjust === stockPreAdjust + 4 &&
              mvRes.ok() &&
              (mv?.movements || []).some((m) => m.delta === 4 && m.reason === "receipt") &&
              neg.status() === 409 &&
              zero.status() === 400,
            `adjust=${adj.status()} stock ${stockPreAdjust}->${stockPostAdjust} neg=${neg.status()} zero=${zero.status()}`
          );

          // ---- round-27: operator management (retariff, create, hide) ----
          section("round-27 admin operator management");
          const adminOpsRes = await req("/api/admin/operators");
          const adminOps = await adminOpsRes.json().catch(() => ({}));
          check(
            "admin operators list: gated + full fleet",
            adminOpsRes.ok() && (adminOps?.operators || []).length >= 12,
            `HTTP ${adminOpsRes.status()} fleet=${(adminOps?.operators || []).length}`
          );

          const tar = (adminOps?.operators || []).find((o) => o.id === cargoOperator.id);
          const newRate = +(((tar?.cargoRatePerKg ?? 0) + 0.05).toFixed(2));
          const bump = await page.request.patch(
            BASE + `/api/admin/operators/${encodeURIComponent(cargoOperator.id)}`,
            { data: { cargoRatePerKg: newRate }, headers: { Origin: BASE } }
          );
          const publicBump = await (await req("/api/shipping/operators?region=UG")).json().catch(() => ({}));
          const bumped = (publicBump?.operators || []).find((o) => o.id === cargoOperator.id);
          const restore = await page.request.patch(
            BASE + `/api/admin/operators/${encodeURIComponent(cargoOperator.id)}`,
            { data: { cargoRatePerKg: tar.cargoRatePerKg }, headers: { Origin: BASE } }
          );
          check(
            "admin retariffs an operator; public API reflects it; original restored",
            bump.status() === 200 &&
              bumped && Math.abs(bumped.cargoRatePerKg - newRate) < 1e-9 &&
              restore.status() === 200,
            `bump=${bump.status()} public=${bumped?.cargoRatePerKg} restore=${restore.status()}`
          );

          // run-unique name: the suite must re-run cleanly against a dirty DB
          const suiteOperator = {
            regionCode: "UG", name: `Suite Coach ${Date.now()}`, cargoRatePerKg: 0.9, minCharge: 6,
            transitDaysMin: 1, transitDaysMax: 1,
            bookingNote: "Suite-created operator for gate coverage; safe to hide.",
          };
          const createOp = await post("/api/admin/operators", suiteOperator);
          const createOpBody = await createOp.json().catch(() => ({}));
          const createdId = createOpBody?.operator?.id || "";
          const dupOp = await post("/api/admin/operators", suiteOperator);
          const badOp = await post("/api/admin/operators", {
            regionCode: "UG", name: "Bad Coach", cargoRatePerKg: -1, minCharge: 6,
            transitDaysMin: 1, transitDaysMax: 1,
            bookingNote: "Negative rate must be rejected outright.",
          });
          const emptyPatch = createdId
            ? await page.request.patch(BASE + `/api/admin/operators/${encodeURIComponent(createdId)}`, { data: {}, headers: { Origin: BASE } })
            : null;
          const hideOp = createdId
            ? await page.request.patch(BASE + `/api/admin/operators/${encodeURIComponent(createdId)}`, { data: { isActive: false }, headers: { Origin: BASE } })
            : null;
          const publicHide = await (await req("/api/shipping/operators?region=UG")).json().catch(() => ({}));
          check(
            "operator create 201 / duplicate 409 / bad rate 400 / empty patch 400 / hide removes from checkout",
            createOp.status() === 201 &&
              dupOp.status() === 409 &&
              badOp.status() === 400 &&
              emptyPatch && emptyPatch.status() === 400 &&
              hideOp && hideOp.status() === 200 &&
              !(publicHide?.operators || []).some((o) => o.id === createdId),
            `create=${createOp.status()} dup=${dupOp.status()} bad=${badOp.status()} empty=${emptyPatch?.status()} hide=${hideOp?.status()}`
          );
        }
      }

      // throttle is checked LAST: it burns the register window for this IP
      const throttleStatuses = [];
      let saw429 = false;
      for (let i = 0; i < 8 && !saw429; i++) {
        const r = await post("/api/account/register", {
          email: `throttle-${Date.now()}-${i}@test.example`,
          password: "Throttle26!x",
          name: "Throttle Probe",
        });
        throttleStatuses.push(r.status());
        if (r.status() === 429) saw429 = true;
      }
      const pre429 = throttleStatuses.slice(0, throttleStatuses.indexOf(429));
      check(
        "register throttle: 429 after burst (5/15min per IP)",
        saw429 && pre429.every((s) => s === 201 || s === 409),
        `statuses=${throttleStatuses.join(",")}`
      );
      } // cargoOperator guard
    }
  }

  await browser.close();
  results.forEach((l) => console.log(l));
  console.log(`\n==== RESULT: ${pass} pass / ${fail} fail / ${skipped} skipped ====`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("SUITE ERROR:", e.message);
  process.exit(2);
});
