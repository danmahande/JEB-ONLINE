# AGENT FIXLIST — commit `1927edc` review

> For the AI agent working in this repo. The site is currently **down (HTTP 500
> on every route)**. Fix the blockers first, in order. Every issue below was
> verified against the working tree — file:line references are exact at the
> time of writing. Do not ship until the Definition of Done at the bottom
> passes.

---

## ⚠️ READ FIRST — STATUS UPDATE + PRODUCT DECISION (supersedes everything below)

**Status:** every blocker and major in this document has been fixed, verified in
the browser, and shipped (commit `0334e1c`: checkout contract + guards,
`quoteCart` money math everywhere, header form/aria/focus handoff, GO scroll;
plus the follow-up commit that implements the decision below). Do not re-fix
them. Do not regress them.

**PRODUCT DECISION — the hero search is RETIRED. Do not restore it.**
The store owner approved "Option A": **exactly one search lives on the page —
the header channel (`.ms-hsearch`)**. The hero search input was deleted from
`hero.tsx` and the hero `.ms-search` / `.ms-search-key` / `.ms-search-mark`
CSS families were deleted from `globals.css` on purpose.

Therefore you MUST IGNORE every instruction in this document that restores or
repairs the hero search — specifically:

- ROUND 2 → "HERO SEARCH — `.ms-search` family" (restore CSS) — **obsolete**
- ROUND 3 → "BLOCKER 3 — hero search input is now invisible" — **obsolete**
- ROUND 4 ADDENDUM (V1/V2/V3 + the verbatim-restore fix) — **obsolete**

V1/V2/V3 were real bugs, but they died with the component. Do NOT:

- re-add a `<form role="search">`, `query` / `onQuery` props, or any input to
  `src/components/storefront/hero.tsx`
- re-add `.ms-search` (channel), `.ms-search-key`, or `.ms-search-mark` rules
  to `globals.css`
- re-copy CSS "verbatim from f67b810" into the hero

**SECOND DECISION — the header search is PERSISTENT (always open).** No grip
button, no `.is-open` class, no 34px collapse, no width/opacity transition
choreography, no tabIndex juggling, no mobile takeover rule. The white
channel (`.ms-hsearch`, 38px, hairline `--color-line` border, white bg to
match the header rail, brand `:focus-within` ring, `.ms-hsearch-mark`
magnifier, `.ms-hsearch-input` transparent well, GO = `.ms-hsearch-key
.ms-key`) is rendered twice from the `SearchField` component in
`header.tsx`: inline in the bar on md+, full-width row under the bar on
mobile — both bound to the one query state. The dark `.ms-search-input`
base was deleted from `globals.css`. Do NOT re-introduce any collapse
machinery or dark well.

**The hero now is (keep it this way):** a `ms-shopfront` display window at
`h-[180px] md:h-[210px] lg:h-[240px]` carrying the greeting label, the display
line "MAIZE FLOUR. CEMENT. IRON SHEETS." (`.ms-display`), and two wired CTAs —
`ENTER CATALOG ↓` (scrolls to `#catalog`) and `TRACK ORDER` (`goTrack`).
Search discoverability is solved by the persistent header channel — never by
a second input.

---

## How to verify while fixing

```bash
npx tsc --noEmit        # 0 errors (currently: 1 parse error in header.tsx)
npm run dev             # or the resident dev server on :3000
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/   # must be 200
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/?view=checkout"
npx next build          # must complete — this is what CI will run
```

---

## BLOCKER 1 — header.tsx: JSX return has two root elements (parse error, site down)

**File:** `src/components/storefront/header.tsx:89-295`
**Error:** `TS2657: JSX expressions must have one parent element` / SWC:
`Expected ',', got 'open'` at line 281. Every route returns 500.

The component returns `<header>…</header>` followed by a second root element
`<CartDrawer …>` with no wrapping fragment. JS syntax error → nothing renders.

**Fix:** wrap both in a fragment, or better — delete the header-level
`<CartDrawer>` entirely (see BLOCKER 3).

## BLOCKER 2 — header.tsx: wrong state + duplicate CartDrawer

**File:** `src/components/storefront/header.tsx:280-293`

Even after fixing the syntax, this `CartDrawer` is wrong three ways:

1. `open={searchOpen}` / `onOpenChange={setSearchOpen}` — the **cart** drawer is
   driven by the **search** state. Opening search would slide the cart out.
2. `page.tsx` already renders its own `<CartDrawer>` (lines ~232–243) wired to
   the real `cartOpen` state and `onCheckout`. Two drawers mounted = two
   overlay portals, z-index fights, double aria-modal.
3. `onCheckout` does `window.location.hash = '#checkout'` — the app navigates
   views through `useUrlState("view", …)` (`?view=checkout`), not hash routing.
   This hash does nothing the architecture understands.

**Fix:** remove `<CartDrawer>` and the `CartDrawer` import from header.tsx.
The header already reports intent upward via `onOpenCart` (line 241) — that is
the correct data flow. Cart ownership stays with page.tsx.

## BLOCKER 3 — checkout.tsx: imports a function that does not exist

**File:** `src/components/storefront/checkout.tsx:5` and `:41`

```ts
import { LEVIES } from "@/lib/levies";       // ← no such export
const { duty, vat, freight, total } = LEVIES(subtotal, active);
```

`src/lib/levies.ts` exports only: `BORDER_LEVIES`, `leviesFor(region)`,
`pct(rate)`, `levyTag(region)` (verified by grep). There is no `LEVIES`
function anywhere in the codebase. The checkout chunk crashes on load
(module resolution error), so even with BLOCKERS 1–2 fixed, opening
`?view=checkout` dies.

**Fix:** there is **no client-side all-in-one levy calculator by design** —
duties/levies are computed **server-side** in `src/app/api/orders/route.ts`
(see lines 194–208: it re-prices from the DB and applies
`BORDER_LEVIES` there). For the Review-step *display*, either:
- reuse the same `leviesFor(active.region)` list and compute
  `subtotal * levy.rate` per line for the estimate panel, or
- fetch the quote from the API instead of inventing a client function.
Never approximate the server's math with a new local helper — one source of
truth only.

## BLOCKER 4 — checkout.tsx: cart line field names are wrong (NaN money)

**File:** `src/components/storefront/checkout.tsx:37, 321, 325`

```ts
const subtotal = cart.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
// CartLine (src/lib/types.ts:47) has: qty: number; unitPriceUsd: number
// → l.quantity and l.unitPrice are undefined → undefined*undefined = NaN
```

Every total becomes `NaN`; `JSON.stringify(NaN)` serializes to `null` in the
order POST; the review rows print `fmt(undefined)`. The rest of the app uses
the correct names — `header.tsx:48`, `cart-drawer.tsx:103-118` all use
`l.qty` and `l.unitPriceUsd`.

**Fix:** `sum + l.qty * l.unitPriceUsd`, and `fmt(l.unitPriceUsd, active)`.
Note the API ignores client totals anyway (it re-prices server-side from
`productId` + `qty`) — but the UI must still show correct numbers.

## BLOCKER 5 — globals.css: invalid CSS kills the stylesheet (3rd occurrence)

**File:** `src/app/globals.css:1124-1144`

```css
.sr-only.focus:not-sr-only { … }
```

`:not-sr-only` is **Tailwind utility syntax, not a CSS pseudo-class**.
Lightning CSS (the compiler) rejects the entire sheet → all styling gone, all
routes 500. This same bug has now taken the site down in `d7a7804`,
`f282dba` and again in `1927edc`.

The `<a>` skip link in `layout.tsx` already uses the Tailwind classes
`sr-only focus:not-sr-only …` — Tailwind v4 generates all of them. The
hand-written block is redundant **and** fatal.

**Fix:** delete the whole hand-written skip-link block (the `/* Skip-link for
accessibility */` comment through the end of the `:not-sr-only` rule).

---

## MAJOR 1 — globals.css: five primitive families deleted while JSX still uses them

Rules deleted, references remaining (grep-verified):

| Missing rule(s) | Still referenced by |
|---|---|
| `.ms-search`, `.ms-search:focus-within`, `.ms-search-mark` | `hero.tsx` (steel search channel) |
| `.ms-footer-rail` | `footer.tsx` |
| `.ms-plaque`, `.ms-plaque-die`, `.ms-plaque-index`, `.ms-plaque-body`, `.ms-plaque:hover` lift, `.ms-plaque .ms-file-label` | `page.tsx:179-187` (trust strip) |
| `.ms-pack-rail` | `product-grid.tsx` |
| `.ms-tab` family | `product-grid.tsx` catalog tabs |

`.ms-hsearch`, `.ms-chip`, `.ms-key` survived this round — leave them alone.

**Fix:** restore the missing rules from git history:
`git show f67b810:src/app/globals.css` contains the complete verified sheet.
Do **not** delete `.ms-*` rules "because they look unused" — grep the JSX for
the class name first, every time. (See Patterns to learn.)

## MAJOR 2 — checkout.tsx: unstable zustand selector

**File:** `src/components/storefront/checkout.tsx:17`

```ts
const cart = useCart((s) => ({ ...s }));   // new object identity every render
```

A selector returning a fresh object each call breaks zustand's snapshot
contract (React 18+: "The result of getSnapshot should be cached" warnings,
re-render loops). The codebase pattern is narrow selectors:
`useCart((s) => s.lines)`, `useCart((s) => s.hasHydrated)`.

**Fix:** `const lines = useCart((s) => s.lines);` and select actions
individually. Same for `cart-drawer.tsx` if it kept `useCart((s) => s)` —
returning the store object itself is stable and fine, but prefer slices.

## MAJOR 3 — checkout.tsx: stale country + forced postal code

**File:** `src/components/storefront/checkout.tsx:33, 55, 270-276`

1. `country: active.country` is captured **once** in `useState`'s initializer.
   If the shopper changes the region (header select) while on checkout, the
   address keeps the old country. Derive it instead:
   `value={active.country}` on the readonly input; drop it from state.
2. `postalCode` is **required** — most EAC delivery addresses have no postal
   code. Requiring it blocks real orders in Kampala, Nairobi, Kigali. Make it
   optional (drop from validation and from the API contract if it's
   mandatory server-side).

## MAJOR 4 — checkout.tsx: labels not associated, errors not announced

**File:** `src/components/storefront/checkout.tsx:167-276`

Every `<label>` lacks `htmlFor` and every input lacks `id` — screen readers
announce nothing when the field is focused. Error `<p>`s render as plain text
(no `role="alert"`), and inputs don't set `aria-invalid`. The codebase already
does this correctly in `product-grid.tsx` (`role="alert"` on errors).

**Fix:** `id` + `htmlFor` pairs, `aria-invalid={!!errors.name}`, and
`role="alert"` on the error paragraphs.

## MAJOR 5 — checkout.tsx: dead code & misleading pay UI

1. The `placing &&` banners in steps 1 and 2 (lines 158-163, 286-291) can
   never show — `placing` only becomes true inside `placeOrder()`, which runs
   on step 3. Delete them.
2. The ink circle with a hard-coded `$` (line 371-373) — prices everywhere are
   in the shopper's local currency (UGX/KES/TZS/RWF/CDF). A dollar glyph next
   to "Amount to pay: UGX 4,500,000" is misleading. Use the currency code or
   a neutral lock icon.
3. Validation is split: step 1 checks name/email/phone, but address/city only
   fail at step 3's `placeOrder`. A shopper reaches Review with an empty
   address and gets bounced back with no pointer to the problem. Validate all
   required fields in `goNext` per step.

## MINOR

1. **header.tsx:132** — `pathname.includes("track")` never fires: the track
   view lives in the query string (`?view=track`), and `usePathname()` ignores
   queries. TRACK ORDER never highlights. Read the `view` param instead.
2. **header.tsx:56-64 + 143** — the click-outside listener is attached to a
   `ref` placed on the **region selector** div, but closes **searchOpen**.
   Wrong wiring (leftover from the old custom dropdown). Move `ref` to the
   search container or gate the listener on it.
3. **header.tsx:66-71** — `isChangingRegion` with a fake 500 ms
   `setTimeout` spinner: `setRegion` is synchronous local state; a pretend
   loading state disables the select for no reason. Remove it or tie it to
   real async work.
4. **globals.css:1234-1276** — hand-written `.animate-pulse` / `.animate-spin`
   duplicate Tailwind v4 built-in utilities of the same name. Delete the
   hand-written copies and use Tailwind's. `.progress-bar` (line 1262) is
   referenced by **zero** components — dead rule, delete it.
5. **checkout.tsx:312** — bare `<img>` (no width/height, not optimized) in the
   review list. The rest of the storefront is on `next/image` since
   `bfcd213`. Use `next/image` with fixed `size-16` dimensions.
6. **globals.css / design voice** — cart-drawer's empty state replaced the
   machined copy (`ms-display` "EMPTY" / "ADD GRAINS OR HARDWARE TO
   CONTINUE") with a generic shadcn `<Button>` and "Your cart is empty". The
   store voice is stamped-steel labels; keep the `ms-*` components and
   uppercase industrial copy. Same for `checkout.tsx` step cards: they use
   `rounded-lg border` cards while the design language is `ms-tile` /
   `ms-field` machined surfaces.
7. **checkout.tsx:38-39** — the POST body includes client-computed
   `subtotal/duty/vat/freight/total` which the API ignores (it re-prices).
   Sending them invites future desync; send only `customer`, `lines`,
   `region` and let the server be the single source of truth.

---

## Patterns to learn (why this keeps happening)

1. **Server components cannot carry event handlers.** `layout.tsx` is a
   server component (it exports `metadata`). `onKeyDown` on `<body>` cannot
   compile — this exact crash shipped twice (`f282dba`, and before). Event
   handlers belong in `"use client"` files only. If you need a listener in the
   layout, extract a tiny client component.
2. **This codebase's CSS is hand-machined — never delete `.ms-*` rules
   without grepping JSX.** The primitive families (`.ms-search`,
   `.ms-plaque`, `.ms-key`, `.ms-tab`, `.ms-chip`, …) are the design system.
   Three commits in a row deleted families that are referenced 7–9× each.
   `rg "<className" src/components` before removing any rule, and never
   re-add hand-written copies of Tailwind utilities (`:not-sr-only`,
   `.animate-spin`) — Tailwind v4 already generates them from the class
   strings in JSX.
3. **Match the store's field names.** The cart store type is
   `CartLine { qty, unitPriceUsd, … }` (`src/lib/types.ts:47`). Components
   that invent `quantity`/`unitPrice` produce silent `NaN` money. When wiring
   a component, open the type first and copy field names from a working
   consumer (`cart-drawer.tsx` is correct).
4. **One source of truth for money.** The order API re-prices every line
   server-side and applies levies there. Client-side total math is display
   only, must reuse the same named exports the rest of the app uses
   (`leviesFor`, `fmt`), and must never invent new ones (`LEVIES`).
5. **Verify before pushing.** Every one of these failures would have been
   caught by `npx tsc --noEmit` + `curl localhost:3000` + one look at the
   homepage. The repo now has a ready-to-add CI workflow
   (`.github/workflows/build-check.yml`, currently untracked) that runs
   exactly those checks on every push — a red X lands before shoppers ever
   see the site. It could not be pushed from here because the stored token
   lacks the `workflow` scope; add it via the GitHub UI or a scoped token.

## Definition of Done

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → 200
- [ ] `/`, `/?view=checkout` with a cart item, `/p/<any-slug>`, `/?view=track` all render styled and functional
- [ ] Checkout shows correct `qty`-based money, no `NaN`, order POST succeeds and confirmation renders
- [ ] Hero search channel, catalog tabs, trust plaques, footer rail all visibly styled again
- [ ] `npx next build` completes (this is what CI runs)
- [ ] `npx next build` also passes on a **fresh clone** of the branch — i.e. no reliance on uncommitted local state

---

## POSITIVES in `1927edc` — keep these, do not regress them while fixing

Every blocker/major fix above must preserve the intent below. These are the
genuinely good ideas in the commit; the bugs are in the wiring, not the ideas.

1. **Multi-step checkout wizard** (`checkout.tsx` — typed `useState<1 | 2 | 3>`,
   Details → Review → Pay). Right structure for launch. Fix the math/imports,
   keep the wizard.
2. **Progress indicator + animated width bar** (`(step / 3) * 100 %`). Keep;
   restore `.progress-bar` transition as a Tailwind-arbitrary class
   (`transition-[width] duration-300`) instead of a hand-written rule.
3. **Back navigation** ("← BACK") that preserves entered data. Keep.
4. **Field-level error object** (`Record<string, string>`) + email format check
   + server errors surfaced through toast (`variant: "destructive"`) +
   `!res.ok` guard. This is the correct error architecture — just add
   `htmlFor`/`id`/`aria-invalid`/`role="alert"` on top (MAJOR 4).
5. **`try/catch/finally` with `setPlacing(false)` in `finally`** — button can
   never get stuck disabled. Keep exactly as written.
6. **Checkout button disabled + spinner while processing** (cart-drawer) —
   prevents double-click double-orders. Keep. (Drop only the fake 500 ms
   `setTimeout` if you touch it; `onCheckout` is sync.)
7. **Inline total on the checkout button** — `CHECKOUT (UGX …)`. Price
   transparency at the point of action; keep.
8. **Qty stepper floor `Math.max(1, l.qty - 1)`** — cannot decrement below 1.
   Keep.
9. **Bigger touch targets (`size-8`) + descriptive aria-labels** ("Decrease
   quantity") in the cart lines. Keep.
10. **Hydration-safe guards** — `q && q.levies.length > 0 && active` before
    rendering levies rows. Keep; extend the same guard pattern where
    `regionHasHydrated` is false.
11. **`ProductSkeleton`** (`product-grid.tsx`) — anatomy-matching skeleton that
    reuses the design system (`ms-tile`, `ms-base`, `ms-spot`) with staggered
    `animationDelay: index * 40ms`. Best change in the commit; keep as-is.
12. **`mt-auto` on the price/action row** — pins actions to card bottom,
    equal-height card rhythm. Keep.
13. **Sticky header** (`sticky top-0 z-20`) and **focus ring on the region
    select** (`focus:ring-2 focus:ring-brand/30`). Keep.
14. **Correct cart-count math** in header (`lines.reduce(... l.qty)` — right
    field names). Keep.
15. **Total row emphasized in brand color** (`text-brand`) in the cart totals.
    Keep.

Fix strategy that preserves all of the above: repair in place (imports, field
names, fragment wrapper, delete the fatal CSS block, restore missing `.ms-*`
families from `git show f67b810:src/app/globals.css`). Do not rewrite the
components back to their pre-`1927edc` shape.

---

## ROUND 2 — `b76bbbe` + `121fb1e` + `8477ce5` audit: BOTH SEARCH BARS BROKEN

State after your three fix commits: `tsc` still fails (4 new errors, different
ones), every route still 500. The blocker-level wiring moved but new breaks
were introduced. Search bars are the worst hit — one has broken interaction
wiring, the other has the wrong CSS family restored.

### HEADER SEARCH — `src/components/storefront/header.tsx` (`.ms-hsearch`)

**H1 — Mouse users can never open it (interaction dead).**
The grip that should open the channel is a plain `<div>` with two decorative
SVGs — **no `onClick`, not a `<button>`**. The input is `width: 0; padding: 0;
opacity: 0` while closed (globals.css 1041-1047) → zero clickable area. The
channel only opens via `onFocus` bubbling to the container, so **only a
keyboard Tab can open it**. The verified original (f67b810) had:
`<button type="button" className="ms-hsearch-grip" aria-label={searchOpen ?
"Close search" : "Open search"} aria-expanded={searchOpen}>` that toggled
`searchOpen`, plus `useEffect` handing focus to `searchInputRef.current`.
**Fix:** restore the button-grip toggle + focus handoff.

**H2 — Enter does nothing.** No `<form role="search">`, no `onSubmit`, no
`onKeyDown`. The original was a form: Enter submitted to `onSearchSubmit`.
Typing + Enter in the header search is a dead end now.

**H3 — GO scrolls the WRONG way.** `onClick={if (query.trim())
onNavigate("shop")}` → `goShop()` → `scrollToTop()`. On the shop view (where
you already are) GO **yanks the shopper up to the hero, away from the filtered
results**. The original submit scrolled DOWN to `#catalog`. Fix: scroll to
`#catalog` like the hero's `onShop`, and no-op cleanly when already there.

**H4 — Click-outside is wired to the wrong element.** `ref` is attached to the
**region-selector** div, but the listener closes the **search** (`setFocused(false)`).
Result: any mousedown outside the region select — including on the search
channel itself — slams it shut, then focus re-opens it (flicker); clicking the
region select does NOT close search. Leftover from the old custom dropdown.

**H5 — No Escape, no onBlur.** Original: `onKeyDown` Escape closed the
channel. Now nothing closes it via keyboard once open (click-outside H4 is
unreliable), and tabbing away leaves it open.

**H6 — Invisible-but-focusable input.** Original managed
`tabIndex={searchOpen ? 0 : -1}` on input + submit key. Now the 0-width
invisible input is permanently in the tab order — screen-reader and keyboard
users land on an invisible field with no affordance.

**H7 — The ✕ close icon is decorative.** It sits in the grip `<div>` with no
handler — no mouse way to close or clear. Restore toggle behavior on the grip.

**H8 — `onSearchSubmit` prop deleted → /p/[slug] fails to compile.**
`product-view.tsx:131` still passes `onSearchSubmit` → TS2322. The original
Header had `onSearchSubmit?: () => void` precisely so product pages (no
catalog on-page) could hand the query to the home view. **Fix:** re-add the
optional prop and call it on submit (falling back to scrolling to `#catalog`
when absent).

**H9 — Task-54 seating choreography deleted.** The original kept the header
channel retracted while the hero search was on screen (`searchSeated`,
`is-seated`, slide-out after y > 200) — one search visible at a time. Now the
header channel has a permanent seat: **both search bars render simultaneously
on the homepage** (duplicate search UI). Restore the seated logic or accept +
document the design change.

### HERO SEARCH — `src/app/globals.css` (`.ms-search` family)

**S1 — WRONG CSS FAMILY RESTORED (the big one).** The restored `.ms-search`
(globals.css 1225-1236) is a copy of the **header's collapsed channel** —
`width: 34px; min-width: 34px; height: 34px; background: #ffffff` — not the
hero's machined steel channel. The hero form carries Tailwind
`w-full sm:w-80 lg:w-96`, but unlayered custom CSS beats layered utilities, so
**the hero search renders as a ~34px white square** with its contents
overflowing. The verified original (f67b810, lines 1119-1140) is:
`display:flex; align-items:stretch; padding:4px; border:1px solid #47463f;
background-image: var(--ms-steel-grain), var(--ms-steel-face);
box-shadow: var(--ms-steel-bevels); transition: transform .25s…`. **Fix:** copy
the `.ms-search`, `.ms-search-input`, `.ms-search-input::placeholder`,
`.ms-search-mark` blocks verbatim from `git show f67b810:src/app/globals.css`.
The comment "(was .ms-search)" shows the block was copied-and-renamed from the
header instead of restored from history.

**S2 — Base `.ms-search-input` rule does not exist.** Only
`.ms-hsearch .ms-search-input` exists (scoped to the header). The hero query
well renders as an **unstyled native input**: no dark milled socket gradient,
no bone `#f4f3ea` text, no brand caret, no inset shadows, no `min-width: 0`.

**S3 — `.ms-search-input::placeholder` rule missing** (original: bone text at
55% opacity).

**S4 — `.ms-search-mark` restored as the header-grip variant** (`flex: 0 0
34px`), original hero mark: `padding: 0 9px 0 7px; pointer-events: none`.

**S5 — `:focus-within` wrong effect** — brand ring pasted from the header;
original was the press-flush `translateY(2px)` + inset shadow (the key
"depresses" into the housing).

**S6 — Hero functionality is intact** — form `role="search"`, submit scrolls
to `#catalog`, shared query state works. Only the styling was destroyed. Do
not rewrite hero.tsx while fixing; fix the CSS.

### NEW COMPILE BLOCKERS INTRODUCED BY `8477ce5` (site still 500)

**C1 — `cart-drawer.tsx:24` `useCart((s) => s.remove)`** — CartState
(src/lib/store.ts:11) exposes **`removeLine`**, not `remove`. TS2339.

**C2 — `cart-drawer.tsx:25` `useCart((s) => s.setQuantity)`** — the store
action is **`setQty`** (store.ts:12). TS2339.

**C3 — `cart-drawer.tsx:27,37` `levy.tag === 'DUTY'`** — `BorderLevy`
(src/lib/levies.ts:14) has `{ code, label, rate, inVatBase }` — **no `tag`
field**. TS2339. Worse: this hand-rolls duty/VAT math in the drawer again,
violating Pattern 4 (one source of money — `quoteCart` already does exactly
this). Revert the drawer totals to `quoteCart(lines, region)`.

**C4 — `product-view.tsx:9` imports CartDrawer as default** — cart-drawer no
longer has a default export after `8477ce5`. TS2613. Either keep a default
export or update the import to named.

**C5 — `cart-drawer.tsx:28` `regions.find(...)!`** — non-null assertion; if
`regions` is empty or the persisted region string doesn't match, `active` is
undefined and `.countryName` crashes at runtime. Guard it.

**Pattern to learn (round 2):** when restoring "deleted" CSS, copy the rules
from git history (`git show <commit>:src/app/globals.css`) — do not
reconstruct them from a sibling component's similar-looking rules. The hero
channel and the header channel are two different machines that share a
vocabulary. Same lesson for store APIs: open `src/lib/store.ts` and copy the
exact action names (`removeLine`, `setQty`) before writing selectors.

---

## ROUND 3 — `61d7c4d` + `3e7ff05` + `5aaebd5` audit (verified live in browser)

Score: **tsc clean, site loads, 12+ round-1/2 issues fixed.** But the browser
test caught **one live crash, one order-blocking contract mismatch, and the
hero search input is now invisible**. Details, verified evidence first.

### VERIFIED FIXED (do not regress)

- tsc = 0 errors; `/`, `/?view=checkout`, `/?view=track`, `/p/[slug]` compile
- `removeLine` / `setQty` store names + `variantLabel` args in cart-drawer
- Named `CartDrawer` import in product-view (C4)
- `onSearchSubmit` prop restored on Header + product-view passes it (H8)
- Click-outside bound to `searchContainerRef` (H4), Escape closes (H5),
  grip click opens, input `tabIndex` managed (H6)
- Checkout a11y: `htmlFor`/`id` pairs + `role="alert"` on all errors (MAJOR 4)
- Postal code optional (MAJOR 3), step-1 validates address+city (MAJOR 5.3),
  dead `placing` banners removed (MAJOR 5.1)
- `displayRegion` fallbacks replace `!` assertions in drawer/product-view (C5)
- Machined cart-empty copy ("EMPTY / ADD GRAINS OR HARDWARE…") is back

### BLOCKER 1 — checkout crashes live: `regions[0].countryName` unguarded

**Evidence (browser):** `/?view=checkout` renders the error page.
`TypeError: Cannot read properties of undefined (reading 'countryName') in
<Checkout>`.
`5aaebd5` replaced `active!.countryName` with `active?.countryName ||
regions[0].countryName` — but `regions[0]` is undefined while the regions
list is still loading (empty array on first render). The fix moved the crash,
it didn't fix it. Three unguarded sites: checkout.tsx **84, 285, 306**.

**Fix:** `const fallback = regions.find(r => r.region === region) ??
regions[0];` then guard every render path on `displayRegion &&` (the drawer
already does this correctly with `displayRegion ? … : …`). Never access
`regions[0].x` bare.

### BLOCKER 2 — order POST contract mismatch: checkout can never succeed

**File:** `src/components/storefront/checkout.tsx:80-90` vs
`src/app/api/orders/route.ts:63-78`.
Checkout sends: `{ customer: {name, email, phone, address, city, postalCode,
country}, lines, region, subtotal, duty, vat, freight, total }`.
The API destructures a FLAT body: `customerName, contact, email, address,
city, country (region CODE UG|KE|TZ|RW|CD|INTL), paymentMethod, notes, cart`.
None of the names match → **every order POST returns 400 "Customer name and
phone contact are required"** even after Blocker 1 is fixed. The verified
original (`git show 06ff76e:src/components/storefront/checkout.tsx`, lines
76-90) sent the correct flat shape: `{...form, country: active?.region,
cart: lines.map(...)}`.
Also `country: active?.countryName` sends "Kenya" — the API looks up
`db.regionConfig.findUnique({ where: { region: country } })`, which needs the
CODE `KE`. **Fix:** restore the flat POST shape from 06ff76e; test with a
real order through to the confirmation view.

### BLOCKER 3 — hero search input is now invisible

**Evidence (browser):** after a clean dev restart, `.ms-search` is still a
34×34px white pill and `.ms-search-input` computes to **24px wide, opacity 0**
— the hero has no visible query field at all; the SEARCH key overlaps the
ENTER CATALOG button.
Cause: `61d7c4d` ADDED header-collapse rules to the hero family —
`.ms-search-input { width: 0; opacity: 0 }` + `.ms-search.is-open
.ms-search-input { width: 200px; opacity: 1 }` — but the hero form NEVER gets
`is-open` (that's header-only state). S1 from round 2 was never fixed; this
made it worse.

**Fix (same as round 2, still not done):** delete the added collapse rules and
copy the hero family verbatim from history —
`git show f67b810:src/app/globals.css` lines ~1119-1205: `.ms-search` (steel
grain face, padding 4px, border #47463f, width NOT set — the Tailwind
`w-full sm:w-80 lg:w-96` classes size it), `.ms-search-input` (flex:1, dark
milled socket, bone text, brand caret), `::placeholder`, `.ms-search-mark`
(padding 0 9px 0 7px), press-flush `:focus-within`. Verify in the browser
afterwards: form ≥ 320px on desktop, input visible with dark socket.

### MAJOR 1 — fabricated duty/VAT math in drawer AND checkout (verified live)

**Evidence (cart drawer, Kenya, Portland Cement 50KG):**
`DUTY (4.500000000000001%) KSh 50.2 · VAT (4.7025%) KSh 52.4 · TOTAL KSh 3,291.2`
- `duty = Σ ALL levy rates × subtotal` → for KE that's IDF 2.5% + RDL 2% =
  4.5% **mislabeled as DUTY** (real duty = `region.dutyRate × subtotal`,
  separate line)
- `vat = Σ levy.rate × (inVatBase ? subtotal + duty : subtotal)` → 4.7%
  nonsense (truth, `quoteCart`: `(subtotal + duty + leviesInVatBase) ×
  region.vatRate`)
- The `LEVIES (IDF 2.5% + RDL 2%)` row is gone; the total excludes the real
  levies → **drawer/checkout totals will not match what the order API
  charges**
- Raw floats printed in labels — round with `pct()` from src/lib/levies.ts
Same code is duplicated in checkout.tsx:47-60.

**Fix:** delete all the hand-rolled reduce chains in both files and call
`quoteCart(lines, displayRegion)` — it already computes
duty/levies/leviesTotal/vat/shipping/total exactly like the server. This is
round-2 C3, still open, now with live evidence.

### MAJOR 2 — keyboard users cannot open the header search

The grip is still a `<div>` with onClick — not focusable, no `role="button"`,
no `aria-expanded`, no aria-label. Input has `tabIndex={-1}` when closed.
Mouse works now (verified), but Tab-order users have zero way to open search.
The original (f67b810 header) used `<button type="button">` with
`aria-label={searchOpen ? "Close search" : "Open search"}` +
`aria-expanded`. Also: after opening, focus isn't handed to the input
(original had `useEffect(() => { if (searchOpen) searchInputRef.current?.focus() })`).

### MAJOR 3 — Enter does nothing in the header search (verified live)

Typed "cement" + Enter: no submit, no navigation (URL only changed via the
query-state sync, not a submit). No `<form role="search">`, no onSubmit.
Wrap the channel in a form that calls the same handler as GO.

### MAJOR 4 — GO scrolls shoppers AWAY from their results (verified live)

Scrolled to the catalog (y=406) with an active filter, clicked GO →
**scrolled to y=0** (back to the hero). page.tsx still does not pass
`onSearchSubmit` to Header, so GO falls back to `onNavigate("shop")` →
`goShop()` → `scrollToTop()`. Fix in page.tsx: pass
`onSearchSubmit={() => document.getElementById("catalog")?.scrollIntoView({
behavior: "smooth" })}` like the hero's onShop.

### MINOR

1. Grip click doesn't focus the input after opening.
2. Task-54 seating still absent — both search bars visible at once on the
   homepage. Decide deliberately, don't leave it accidental.
3. product-view.tsx: raw `'` in JSX copy (was `&apos;`) — will trip
   `react/no-unescaped-entities` if lint runs; missing newline at EOF.
4. `leviesFor(region)` with region `''` returns `[]` — silently zero levies
   while the drawer still renders levy-dependent totals. Harmless today
   (guarded), wrong if the guard ever disappears.

### Pattern to learn (round 3)

**Fix the contract, not the symptom.** Round 3 fixed names that tsc catches
(store actions, imports) but the two bugs that decide whether the store
actually WORKS — the order POST shape and the money math — were not touched,
and the "safe access" fix introduced a new crash of the same class it fixed.
Before writing an access like `x[0].field` or a POST body, open the consumer
(API route) and copy its exact contract. And after every fix round: run the
real flow in the browser (add → checkout → place order), not just tsc.

### Definition of Done (round 3)

- [ ] `/?view=checkout` renders the form (no error boundary) with empty regions
- [ ] Place a real order end-to-end: POST succeeds, confirmation view renders
- [ ] Hero search: steel channel ≥320px, dark input well visible, type + Enter scrolls to catalog
- [ ] Cart drawer (KE): DUTY uses region.dutyRate, LEVIES row present, VAT = 16%-style rate, total matches server quote
- [ ] Header search opens by mouse AND keyboard; Escape closes; GO scrolls to #catalog
- [ ] `npx tsc --noEmit` = 0 and `npx next build` passes

---

## ROUND 4 ADDENDUM — hero search verified live (desktop 1440 + mobile 390)

Ran the page in the workspace and put the hero search through a full
functional test. The wiring WORKS — the styling makes it unusable.

### What works (verified, char-by-char with real key events)

- Typing syncs: `?q=r → ri → ric → rice`, URL updates, live grid filter runs
  (rack 14 → 1 line), CLEAR chip appears
- **Enter submits** — form onSubmit fires, page scrolls exactly to
  `#catalog` (y=406 = catalogTop)
- SEARCH key click submits the same way
- Shared query state with the header search works

### What is broken (verified with computed styles + elementFromPoint)

**V1 — The query field is invisible.** `.ms-search-input` computes to
`opacity: 0; width: 24px`. The shopper sees no field, no caret, and no text
while typing — the search "works blind". Cause (round-3 Blocker 3, still
open): header-collapse CSS added to the hero family; `.is-open` never fires
on the hero form.

**V2 — The magnifier square is a dead click.** The visible 34px white square
is the most natural target, but `elementFromPoint` at its center returns the
decorative mark SVG. The restored `.ms-search-mark` has `pointer-events:
auto` and no handler — the ORIGINAL had `pointer-events: none` so clicks fell
through to the input, and the input filled the channel. Mouse users
effectively cannot search from the hero.

**V3 — SEARCH key overlaps ENTER CATALOG on desktop.** Key occupies x 91–193;
ENTER CATALOG spans x 77–236 at the same y (±4px) — two buttons stacked, the
pill reads "SEARCH ↓". The 34px form (`width: 34px` beats the Tailwind
`w-full sm:w-80 lg:w-96`) collapses the flex row so both controls land on the
same spot. Mobile escapes only because `flex-col` stacks them.

### Fix (unchanged from round 2/3 — now with the missing detail)

Copy the hero family verbatim from
`git show f67b810:src/app/globals.css` (~lines 1119–1205):
- `.ms-search` — steel-grain channel, `padding: 4px`, border `#47463f`,
  **no width property** (Tailwind sizes it)
- `.ms-search-input` — `flex: 1; min-width: 0` dark milled socket, bone text,
  brand caret (visible!)
- `.ms-search-mark` — with **`pointer-events: none`** (fixes V2)
- `::placeholder` + press-flush `:focus-within`
Then delete the added collapse rules (`.ms-search-input { width: 0; opacity:
0 }` and `.ms-search.is-open .ms-search-input`). Verify: channel ≥ 320px,
input visible and typeable, magnifier click focuses the input, no overlap
with ENTER CATALOG.
