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
6. **`.ms-steel-face` / `.ms-steel-bevels` are NOT classes.** They are CSS
   variables (`--ms-steel-face`, `--ms-steel-bevels`) consumed by
   `.ms-tile::after`. Writing them as class names does nothing. This
   fiction shipped in Round 7's button.tsx, was removed with
   documentation, and shipped AGAIN in Round 8 across card/carousel/
   chart/checkbox. Before using ANY `.ms-*` class,
   `rg "^\.CLASSNAME" src/app/globals.css` must hit — if the rule is not
   there, the class is fiction.

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

---

## ROUND 5 — `c16d2ef` audit: trust strip + testimonials + expanded footer

> What the commit does: adds a stats row, a testimonials block (page.tsx),
> and rebuilds the footer with newsletter, Shop/Company columns, Trade
> Specifications, Contact Info, legal buttons and social icons. Build
> passes (✓ `next build`), no runtime errors — the page renders. But this
> round introduces a new **category** of problem: invented facts on a live
> storefront. Fix order below.

### BLOCKER A — fabricated business claims on a real storefront

**Files:** `src/app/page.tsx:254-260, 276-289` · `src/components/storefront/footer.tsx:127`

This is not a design bug — it is invented commercial fact on a live shop:

1. **Fake statistics** — "500+ Businesses Served", "98% On-Time Delivery",
   "15+ Years Experience" (`page.tsx:256-259`). Nobody counted these. If a
   real buyer asks for the 500 customers, the store has nothing to show.
2. **Fake named testimonials with 5-star ratings** — "Sarah Kimani,
   AgroProcessors Ltd, Nairobi" and "Thomas Mugisha, BuildTech Solutions,
   Kigali" (`page.tsx:276-289`). These people do not exist. Publishing
   fabricated endorsements for a real business is the fastest way to lose
   trust (and in many jurisdictions, illegal — fake reviews are regulated).
3. **Fabricated certification** — `["Certifications", "EAC, ISO 9001"]`
   (`footer.tsx:127`). Claiming ISO 9001 without holding it is
   misrepresentation with real legal exposure. The EAC claim is fine (the
   shop does trade in the EAC); ISO 9001 must go unless the certificate
   exists.

**Fix — delete or replace with verified data.** Either remove the stats and
testimonial sections entirely (preferred until real data exists), or wire
them to real numbers (count of completed orders from the DB, real customer
quotes with written permission). Never hardcode invented figures on a
commerce site. This is a permanent rule, not a one-off.

### BLOCKER B — placeholder contact details presented as real

**File:** `src/components/storefront/footer.tsx:145-148`

`["Address", "Plot 123, Industrial Area, Kampala, Uganda"]` and
`["Phone", "+256 700 000 000"]` are template placeholders. A customer who
calls +256 700 000 000 reaches nobody; a driver sent to "Plot 123" finds
nothing. Same rule as Blocker A: real data or remove the row. (The real
phone/address must come from the store owner — ask, don't invent.)

### BLOCKER C — dead controls everywhere (the "fake button" pattern)

Every one of these renders as an interactive control but does nothing when
clicked or submitted — verified by clicking in the browser:

1. **Newsletter** (`footer.tsx:37-52`): the input is not wrapped in a
   `<form>` (`input.closest('form') → null`) and SUBSCRIBE has no
   onClick/handler. No state, no POST, no toast. There IS an existing
   endpoint pattern to follow — see `src/app/api/restock-notify/route.ts`
   and the restock form in `product-view.tsx` (state → POST → success
   state). Either build the newsletter on that pattern (new `/api/subscribe`
   route + Prisma model) or remove the block until it exists.
2. **Legal buttons** (`footer.tsx:163-167`): Privacy Policy / Terms of
   Service / Cookie Policy — no handlers. If the pages don't exist, don't
   ship the buttons; if they must stay, link to real pages.
3. **Social icons** (`footer.tsx:172-190`): buttons with aria-labels but no
   URLs. They should be `<a href="https://..." rel="noopener noreferrer"
   target="_blank">` pointing at real accounts — or removed.
4. **"GRAINS & HARDWARE — SOLD ACROSS BORDERS" became a `<button>`**
   (`footer.tsx:169`) — it was a static `<p>`; a clickable element with no
   action is noise for keyboard/screen-reader users. Revert to `<p>`.
5. **"New Arrivals" / "Best Sellers"** (`footer.tsx:61-62`) and the whole
   **COMPANY column** (`footer.tsx:82-110`): all navigate to `"shop"` with
   no query/filter, so every link lands on the same unfiltered rack. From
   the shopper's side these are lies with extra steps. Either implement
   them (e.g. `onNavigate("shop")` + set the category tab or query — the
   catalog already supports `?q=`; About/FAQ/Policy pages need real pages)
   or cut the list back to links that are true today.

### MAJOR 1 — CSS cascade bug in the newsletter input (the round-2 lesson, again)

**File:** `src/components/storefront/footer.tsx:42-43`

The markup hopes `ms-field` + `text-white bg-white/10 border-white/20
placeholder:text-white/40` blend: dark translucent field on the ink footer.
**Verified rendered result: solid white background `rgb(255,255,255)`, ink
text `rgb(27,42,74)`, light border** — a bright white slab on the dark
footer (screenshot `.shots/round5-footer-agent.png`).

Why: `.ms-field` sets `background: #ffffff; color: var(--color-ink);
border: 1px solid var(--color-line)` as **unlayered** custom CSS in
globals.css. Unlayered beats Tailwind's layered utilities — the same
mechanism that hid the hero search input in rounds 2–4. This is now the
second time: **before styling over an existing `ms-*` primitive, read what
it sets and either pick a primitive that matches (or no primitive) — never
fight an unlayered class with utilities.**

Fix options: drop `ms-field` and use plain Tailwind on a bare input; or add
a dedicated dark-field primitive (e.g. `.ms-field-dark`) in globals.css;
do not stack utilities against `.ms-field`.

### MAJOR 2 — voice drift in the footer bottom bar

`footer.tsx:162`: the legal row uses `text-sm` body text; every other
footer label is `ms-label` (Space Grotesk caps, tracked). Same bar, two
type systems. And re-check labels: the SHOP/COMPANY lists are written in
Title Case but render uppercase only because `ms-label` forces
`text-transform: uppercase` — fine visually, but write them in the voice
you mean (uppercase), like the rest of the file did.

### MINOR

- `footer.tsx` lost its EOF newline again (`\ No newline at end of file`)
  — this was fixed once before; keep the newline.
- Newsletter input has no accessible label (`JOIN OUR NEWSLETTER` is a
  sibling `<p>`); when the form becomes real, use `<label htmlFor>` or
  `aria-label`.
- Footer height roughly doubled (brand blurb + newsletter + 2 nav columns +
  divider + 2 spec columns + bottom bar). On mobile that's many screens of
  footer before the page ends — consider collapsing the spec/contact block
  into a `<details>` or trimming rows once real data replaces the filler.

### What was GOOD in `c16d2ef` — keep these instincts

- Social proof & footer completeness is the right *impulse* — the execution
  data is what must change (real numbers, real quotes, real links).
- The nav hover treatment (small square bullet → brand color on hover) is
  perfectly on-voice with the square brand marks used elsewhere.
- Social icons carry `aria-label`s; sections reuse existing primitives
  (`ms-plaque`, `ms-spot`, `Reveal`) so the stats cards blend into the
  trust strip visually.
- TRADE SPECIFICATIONS as a separate data sheet (instead of deleted) was
  the right call.
- Build stays green; no console/runtime errors introduced.

### Round 5 Definition of Done

1. No invented numbers, no fake testimonials, no unheld certifications —
   anywhere in the app (grep for "500+", "98%", "ISO 9001", "Sarah
   Kimani", "Thomas Mugisha" returns nothing).
2. No placeholder contact data ("Plot 123", "+256 700 000 000") — real
   details from the owner, or rows removed.
3. Every interactive element in the footer actually does something:
   newsletter posts somewhere (or is gone), legal links resolve (or are
   gone), social icons are real `<a href>`s (or are gone), the tagline is
   a `<p>` again, every nav item lands somewhere distinguishable from
   clicking CATALOG.
4. Newsletter field renders as an intentional dark field (or a white one
   that matches the design system on purpose) — not a cascade accident.
5. `npx next build` still green; EOF newline restored.

---

## ROUND 5 RESOLUTION — fixed by Super Z (owner approved the rules)

Do not re-introduce any of the removed content. The owner set permanent
policy for this storefront:

1. **No invented social proof.** The stats row and the fake testimonials are
   gone. The "WHAT OUR CUSTOMERS SAY" section STAYS as a reserved shelf with
   an honest empty state ("NOTHING PUBLISHED YET…"). Real reviews go into
   the `REVIEWS` constant at the top of `src/app/page.tsx` — only with
   written permission, verbatim, no stars until real ratings exist.
2. **No unheld certifications.** The Certifications row is gone. If the
   business ever actually certifies, it comes back with the real
   certificate number.
3. **No invented contact data.** Address/phone/hours rows are gone. CONTACT
   now carries only what is real: the support email and the fact that
   orders run and track on this site. When the owner publishes a real
   address/phone, add them back as real rows.
4. **No dead controls.** The newsletter is now REAL: `POST /api/subscribe`
   → `NewsletterSubscriber` table (Prisma, deduped per email) with a
   idle→sending→done/error state machine in `footer.tsx` (`NewsletterSignup`).
   Social icons and Privacy/Terms/Cookie buttons are REMOVED until real
   accounts/pages exist. The tagline is a `<p>` again.
5. **Every nav destination is distinguishable.** Footer SHOP links ride the
   catalog's real `?q=` filter (`GRAINS` → 7 grain lines, `HARDWARE` → its
   rack) via `goShopQuery` in `page.tsx`. "New Arrivals"/"Best Sellers" and
   the whole COMPANY column are gone (no such pages).
6. **Never style over a `ms-*` primitive with Tailwind utilities.** The
   newsletter input is a bare input with Tailwind-only classes (renders
   translucent dark on the ink wall, as designed). This is the standing
   rule from rounds 2/4/5 — unlayered custom CSS always wins.

Verified: `next build` green; /api/subscribe 201/200-already/400 paths
tested; browser E2E — subscribe success state renders, GRAINS link filters
the rack to 7 lines and scrolls to catalog, TRACK AN ORDER switches to
?view=track, empty reviews state renders, no white cascade slab. Test
subscriber rows deleted from the DB after the run.

---

## ROUND 6 — `7daee1a` audit: discount badges + quick add + share/copy (verified live in browser)

Commit: "Improve catalog cards with discount badges, quick add functionality,
enhanced quick-view with share options, and better visual hierarchy".
Touched: `product-grid.tsx` (+64), `quick-view.tsx` (+47). Every finding below
was reproduced in a real browser against the running site, not guessed from code.

### POSITIVES — keep these
1. **Quick Add is real and correct.** The payload matches the `CartLine`
   contract field-for-field (productId, slug, productLabel, brand,
   variantLabel, unitPriceUsd, weightKg, qty, image, maxStock), the store's
   dedupe (productId + variantLabel) and maxStock cap handle it, `toast`
   fires, and the drawer shows the right line at the right price — verified:
   "Maize Flour (Posho) · 5KG BAG · USh 18,806". `e.stopPropagation()` keeps
   the tile's quick-view open from hijacking the click. This is the first
   agent commit in six rounds where a new control is fully functional.
2. **No CSS cascade bug.** `.ms-label` / `.ms-sticker` only set font and
   border, so the raw `bg-red-500 text-white` utilities on the badge render
   correctly. Lesson from rounds 2/4/5 apparently absorbed.
3. Copy Link targets a route that exists (`/p/[slug]`).

### BLOCKER A — fabricated discounts, both directions (owner-policy violation)
`product-grid.tsx` and `quick-view.tsx` both compute:

```tsx
const discountPercentage = v?.priceDelta && p.unitSellingPrice > 0
  ? Math.round(Math.abs((v.priceDelta / p.unitSellingPrice) * 100))
  : 0;
```

`priceDelta` is **pack-size economics**, not a promotion — the schema itself
documents it: `[{ "label": "25KG BAG", "priceDelta": 0, "weightKg": 25 }]`.
Seed data, Maize Flour: base $18.40, deltas `[-13.5, 0, +17.2]`.

Browser-verified on the live tile (USh region):
- **Small pack** (delta −13.5 → USh 18,806): red **"−73%"** badge +
  strikethrough ~~USh 70,617~~. Nothing is on sale — that is simply the 5KG
  bag's real price being framed as a 73%-off fire sale.
- **Big pack** (delta +17.2 → USh 136,629): red **"−93%"** badge +
  strikethrough ~~USh 70,617~~ **below** the actual price. `Math.abs()`
  erases the sign, so a 93% **surcharge** renders as a 93% **discount**, and
  the crossed-out "original" price is cheaper than the selling price. This is
  the most self-contradicting price display a storefront can produce.

This is Round 5's fabricated-claims category again (fake stats → now fake
reference pricing). The store runs zero promotions; every "-%" badge it can
ever show is fabricated, and fake "was/now" pricing is a consumer-protection
liability in every EAC market, not just a style problem.

**Fix:** delete the badge and the strikethrough in BOTH files (4 render
sites: tile badge, tile strike, QV badge, QV strike) plus both
`discountPercentage` computations. If pack-price context is wanted later, show
honest unit economics (e.g. "≈ USh 5,466 / 100KG") — never a fake "was" price.

### BLOCKER B — dead Share button on desktop
`quick-view.tsx`:

```tsx
onClick={() => navigator.share ? navigator.share({ ... }) : null}
```

`navigator.share` is **undefined** on every desktop Chromium/Firefox build
(browser-verified: `typeof navigator.share === "undefined"`), so on desktop
the button renders, is clickable, and does literally nothing — Round 5
BLOCKER C (dead controls) again, now shipped as new code. Two more defects in
the same line: no try/catch (user-cancel throws an unhandled AbortError), and
it shares `window.location.href` — the shop URL — while Copy Link shares
`/p/<slug>`, so the two "share" paths disagree about what a product's URL is.

**Fix:** delete the button, or wire the fallback chain properly: if
`navigator.share` exists use it inside try/catch, else copy the product URL
and show visible feedback (see BLOCKER C). Both buttons must share one URL
canonicalization (`/p/${product.slug}`).

### BLOCKER C — Copy Link is silent (dead-feeling control)
`navigator.clipboard.writeText(...)` with no await, no catch, no feedback.
Browser-verified: zero visual change after click. The user cannot tell
whether anything happened. On non-secure origins (http://LAN-IP deployments
of the standalone build) `navigator.clipboard` is undefined entirely →
unhandled TypeError on click.

**Fix:** flip the button to a "COPIED" state for ~2s (or toast), guard for a
missing clipboard API, and handle the rejected promise. Silent controls fail
the owner's standing rule: every interactive element must actually work.

### MAJOR 1 — code that fails type-check was pushed to main
`npx tsc --noEmit` → 2× TS2339: `Property 'createdAt' does not exist on type
'Product'` (product-grid.tsx:346, twice). `npm run build` only stays green
because `next.config` sets `ignoreBuildErrors: true` — the errors are silently
swallowed, so the "build green" gate now proves nothing about types. Run
`tsc --noEmit` yourself before every push; it takes 20 seconds.

### MAJOR 2 — dead NEW-badge code, fabricated if ever wired
- The badge block reads `p.createdAt`, but `/api/products` never returns
  `createdAt` (its field mapping omits it) → runtime `undefined` → the badge
  can never render (verified: 0 NEW badges on the page). Shipping dead code
  with a type error against it is the visible symptom of MAJOR 1.
- Worse is the road not taken: **all 14 products carry `createdAt` =
  2026-09-23** (seeded once). If the agent "fixes" this by adding `createdAt`
  to the API response, every tile in the catalog goes purple "NEW" —
  fabricated urgency on a static catalog, Round 5's disease in merchandising
  form.
- `bg-purple-500` appears nowhere in the design system (matte steel, ink
  #1B2A4A, brand #FF6B35).

**Fix:** delete the NEW badge block. If freshness labeling is ever genuinely
wanted, it must come from a deliberate merchandising flag set per product (in
palette — brand orange, not purple), never derived from row timestamps.

### MINOR
1. **EOF newline regression:** the trailing newline that existed on
   `quick-view.tsx` at `c5b7058` was stripped by this commit — third
   documented offense. `product-grid.tsx` also lacks one (pre-existing).
   Editors/`git diff` noise; just keep the newline.
2. **Toast voice drift:** description "Maize Flour (Posho) added to cart" is
   sentence-case inside an all-caps label system. Title "ADDED TO CART" is
   right; make the description follow (e.g. "MAIZE FLOUR (POSO) · 5KG BAG
   ADDED TO CART").
3. **aria-label on a non-interactive div** (tile) — ignored by most
   assistive tech; move the product/price/stock summary onto the button that
   actually opens quick-view, which is where it does something.
4. **`text-xs` on the badge silently loses:** `.ms-label` sets
   `font-size: 10px` unlayered, so the utility's 12px never applies. Harmless
   today (the badge renders at 10px), but it is the utilities-vs-primitive
   skirmish again — do not stack sizing utilities on `ms-label`.
5. **`ml-auto` removed from the NOTIFY slip button** — no OOS products exist
   in the DB right now (0 sold-out tiles), so nothing is visibly broken, but
   when stock hits zero the notify button will no longer right-align on its
   row. Looks like unintended collateral from "visual hierarchy"; restore it.
6. **QV price comparison is unit-vs-total:** the strikethrough compares
   `unitSellingPrice` against `totalFmt(qty × unit)`. Moot once BLOCKER A's
   strikethrough is deleted; noted so the pattern does not return.

### Definition of Done (Round 6)
- `rg "discountPercentage|priceDelta /"` in src/components → 0 hits; no
  "-%" badge and no strikethrough price renders anywhere in the UI.
- Share and Copy Link: either deleted, or functional on desktop with visible
  feedback and one canonical product URL.
- `npx tsc --noEmit` → 0 errors in app code; `npm run build` green.
- `rg "purple-500"` → 0 hits.
- Trailing newline present on `quick-view.tsx` and `product-grid.tsx`.
- Browser check: select every pack size on Maize Flour → honest prices only,
  no badges; Quick Add still adds the correct line (it must survive the
  BLOCKER A deletion untouched).

### ROUND 6 RESOLUTION — fixed by Super Z
1. **Fabricated discounts are gone.** Both `discountPercentage` computations,
   both "-%" badges and both strikethrough prices deleted from
   `product-grid.tsx` and `quick-view.tsx`. `priceDelta` stays what it always
   was: pack-size economics. Verified: 5KG USh 18,806 / 25KG USh 70,617 /
   50KG USh 136,629 — zero badges, zero crossed-out prices anywhere.
2. **SHARE works on every platform now.** Native share sheet where
   `navigator.share` exists (mobile), else the copy path with visible
   feedback. try/catch around the sheet (user-dismiss is not an error). Both
   buttons share ONE canonical URL: `/p/<slug>` — never `window.location.href`.
3. **COPY LINK gives feedback.** Clipboard API with execCommand fallback for
   non-secure origins; the button flips to "COPIED ✓" (emerald) for 2s,
   `aria-live="polite"` announces it. Verified in-browser: clipboard contains
   `http://…/p/maize-flour-posho`.
4. **Dead NEW badge deleted** (also fixes the 2 tsc errors — `createdAt` is
   not on the Product type and must not be, for merchandising). If freshness
   labeling is ever wanted, it is a deliberate per-product flag in palette,
   never row timestamps, never purple.
5. **`ml-auto` restored** on the NOTIFY slip button (right-aligns like BUY
   when stock hits zero).
6. **Quick Add toast now matches the PDP convention** (product-view.tsx):
   caps title + "PRODUCT · PACK × QTY" description — "Maize Flour (Posho) ·
   50KG BAG × 1". Sentence-case descriptions are the app's established toast
   voice, so the fixlist's all-caps example was superseded by consistency
   with the existing toasts.
7. **Tile aria-label moved off the non-interactive div** onto the button that
   opens quick-view, now carrying price and stock. Pointless `text-xs`
   dropped from `ms-label` buttons (utilities lose to the unlayered
   primitive — standing rule).
8. **EOF newlines restored** on both files.

Gates: `npx tsc --noEmit` → 0 errors (app code); `npm run build` green 13/13;
DoD greps empty (`discountPercentage`, `-%`, `purple-500`, `line-through`);
browser E2E — pack switching honest, QUICK ADD adds the selected pack at the
selected price (50KG BAG · USh 136,629 in drawer), SHARE/COPY feedback live.

---

## PRODUCT DECISION (owner) — one action per tile: ADD TO CART

Round 7, owner directive. On every catalog tile:
- **QUICK ADD is removed** — the owner called it irrelevant; nothing may
  add to the cart directly from a tile.
- **BUY is removed.**
- The tile's single action key is **ADD TO CART** and it OPENS THE
  QUICK-VIEW SHEET (`onSelect(p)`) — that is where pack and quantity are
  chosen ("ADD n TO CART" confirms). It must not add anything directly.
- Sold-out tiles keep the NOTIFY ME restock flow, unchanged.
- Do not re-introduce tile-level direct-add buttons, "Buy Now", express
  checkout, or any second action key on tiles.

Implemented in `product-grid.tsx` (button label/aria updated, Quick Add
block + `useCart.addLine` wiring deleted). Verified: tile shows price +
one ADD TO CART key; clicking it opens the sheet; 50KG × 3 → "ADD 3 TO
CART" → badge 3; tile image click still opens the sheet; tsc 0 errors;
build green 13/13.

---

## ROUND 7 — `6d162af` + `0b0d17a` + `07d1553` + `a95f8e9` audit: font swap, hero copy, 404, shadcn restyle (verified live)

Four commits in one push. One real improvement (404), one product question
(hero copy), one design-system decision executed badly (fonts), and drive-by
deletions that must be restored regardless of what was asked.

### POSITIVES — keep
1. **404 HOME link** (`07d1553`) — two clear exits, correct `ms-label`
   classes and voice. Ship as-is.
2. `ms-steel-face` / `ms-steel-bevels` usage in the shadcn restyle is
   legitimate — those primitives pre-exist in globals.css.
3. No cascade white-slab bug, no fabricated stats/certs/contact rows,
   `tsc` 0 errors, build green.

### BLOCKER A — type tokens deleted while still referenced (incomplete refactor)
`0b0d17a` deleted the Space Grotesk import and the `--font-display` variable
from `layout.tsx`, but globals.css still declares
`font-family: var(--font-display), …` at FOUR live sites:
- `.ms-weight-toggle` (the pack selector on every tile)
- `.ms-hsearch-input::placeholder` (the persistent header search)
- `.ms-chip` (tile pack chips)
- the hush label rule (~line 1250)

With the variable gone, those declarations are invalid at computed-value
time and silently fall back to inheritance. It renders "fine" today only
because everything collapsed to Inter anyway. Either finish the refactor or
revert it — an orphaned token is a landmine that springs back to life the
next time someone touches fonts.

### BLOCKER B — drive-by deletions in a font commit (`layout.tsx`)
None of these are font-related; all were removed in the same commit:
1. **schema.org Organization JSON-LD** — the site-wide identity shard for
   crawlers. Verified gone from served HTML. Restore.
2. **Accessibility skip link** (`#skip-main`) **and its target**
   (`<div id="main-content" tabIndex={-1}>`). Verified gone. Restore both —
   a keyboard-only user now tab-traps through the whole header.
3. **openGraph `siteName` + `type`** deleted. og:title/og:description survive
   via Next's metadata defaults (verified live), but the curated fields are
   gone. Restore the block — WhatsApp link previews are the sales channel
   in this region; do not degrade them for free.
4. `suppressHydrationWarning` on `<html>` and the body
   `antialiased bg-background text-foreground` utilities — stripped for no
   stated reason. Restore.

### BLOCKER C — "Amazon Ember" is fictional stack dressing
`"Amazon Ember"` was inserted into every font stack in globals.css. Amazon
Ember is Amazon's proprietary font — it is not loaded by this site and is
installed on essentially zero visitors' machines, so it applies to NOBODY
(the stack always falls through to Helvetica/Arial). The commit's own
comment concedes Inter is the real choice. Shipping a font name that never
renders is the CSS version of a fabricated claim — remove it from every
stack it was added to.

### MAJOR 1 — Button primitive breaks the standing rules + a11y
`button.tsx` (the one shadcn component actually used — cart drawer):
1. Size variants now inject `ms-label` while keeping `text-sm`/`text-xs`/
   `text-base` in the same class strings. `.ms-label` sets font-size:10px
   unlayered → the utilities are all DEAD (verified live: CONTINUE SHOPPING
   renders 10px). This is the exact utilities-vs-primitive violation the
   standing rules ban — committed inside a primitive.
2. `focus-visible:border-ring focus-visible:ring-ring/50
   focus-visible:ring-[3px]` were REMOVED from the base while
   `outline-none` stayed → keyboard focus is now invisible on the drawer's
   CONTINUE SHOPPING buttons. Restore a visible focus treatment.
3. `rounded-md` was removed from the base but re-added per-size — noise.

### MAJOR 2 — hero copy: soft trust claim with zero basis (OWNER QUESTION)
`6d162af`: hero line changed from "MAIZE FLOUR. CEMENT. IRON SHEETS." to
"ESSENTIAL GOODS YOU CAN TRUST". The concrete list named the store's real
goods; the new line is generic AND asserts trust from a store with no sales
yet — the softest member of the fabricated-claims family (Round 5).
If the owner requested this copy, it is the owner's call and it stands —
but flagging that the specific line was stronger and claim-free.

### MINOR
1. **EOF newlines stripped on FOUR files** in this push: `not-found.tsx`,
   `hero.tsx`, `alert-dialog.tsx`, `avatar.tsx` — the 4th–7th documented
   offenses of this pattern. Stop stripping trailing newlines.
2. `alert-dialog.tsx` (0 usages in the app — dormant): `ms-display` on an
   18px dialog title brings line-height 0.95 (cramped) and `ms-label` makes
   the description 10px uppercase — unreadable styling if it's ever used.
3. `avatar.tsx`/`badge.tsx` restyled but referenced NOWHERE in the app —
   churn; badge also lost its focus-visible/aria-invalid treatments.
4. Inter `weight: ['400'…]` pinning is redundant for a variable font —
   harmless.

### Definition of Done (Round 7)
- `--font-display` either restored (Space Grotesk back on
  ms-label/ms-display/ms-price) or fully retired: 0 references left in
  globals.css, decision recorded in the design-system comment.
- `"Amazon Ember"` → 0 hits in globals.css.
- JSON-LD, skip link + #main-content, openGraph siteName/type,
  suppressHydrationWarning, body utilities: all restored in layout.tsx.
- Button base has a visible focus-visible treatment; size variants carry no
  dead text-* utilities alongside ms-label.
- Trailing newlines on all four stripped files.
- Hero copy per owner's explicit answer (concrete list vs trust line).

### OWNER ANSWER (received after audit)
The owner confirms both changes were explicitly requested:

1. **Amazon-style font** — direction approved, but BLOCKER C stands as
   written. Writing the literal name "Amazon Ember" into font stacks
   delivers the Amazon look to ZERO visitors (the font never loads, no
   visitor has it). The correct implementation of "Amazon-style" is what
   the commit's own comment already concedes: Inter as the working face —
   Inter is the standard stand-in for Ember's humanist sans — with the
   fictional name deleted from every stack it was sprinkled into.
2. **New hero line** — MAJOR 2 resolved as the owner's call:
   "ESSENTIAL GOODS YOU CAN TRUST" stands as approved copy. Recorded here
   so no future audit re-flags it as a fabricated claim.

Unchanged by this answer and still pending a fix decision: BLOCKER A
(orphaned `--font-display`), BLOCKER B (drive-by `layout.tsx` deletions),
MAJOR 1 (Button focus + dead utilities), MINOR 1–4 (incl. EOF newlines ×4).

### ROUND 7 RESOLUTION — fixed by Super Z

Executed per owner's "go ahead". One commit, all DoD items plus two
findings surfaced during verification.

**Design decision recorded (BLOCKER A/C resolution):** the type system is
now **Inter as the sole face** — the owner-approved "Amazon-style"
direction. Space Grotesk / `--font-display` is RETIRED, not restored; the
decision is written into the design-system comment above the `body` rule
in globals.css. What was done:
1. `var(--font-display)` removed from all four orphaned sites
   (`.ms-weight-toggle`, `.ms-hsearch-input::placeholder`, `.ms-chip`,
   `.ms-tab` — the 4th live site was ms-tab, not the "hush label") →
   they now resolve `var(--font-body)` with full fallback chain.
2. `"Amazon Ember"` removed from all 6 stacks it was sprinkled into
   (`--font-sans` theme token, body, ms-root, ms-display, ms-label,
   ms-price). 0 hits in src/.
3. Inter `weight` pin dropped in layout.tsx — it wasn't just redundant:
   the pin capped at 700 while `.ms-weight-toggle`/`.ms-chip` use 800,
   so the pin silently forced synthetic bold. Variable Inter renders true
   800 (verified computed weight).

**BLOCKER B restorations (layout.tsx):** schema.org Organization JSON-LD,
skip link `#skip-main` + `<div id="main-content" tabIndex={-1}>`,
openGraph `siteName` + `type`, `suppressHydrationWarning` on `<html>`,
body `antialiased bg-background text-foreground`. All verified in served
HTML.

**MAJOR 1 (button.tsx):** focus-visible trio restored to base
(`focus-visible:border-ring focus-visible:ring-ring/50
focus-visible:ring-[3px]`) plus the aria-invalid pair; dead
`text-sm`/`text-xs`/`text-base` removed from size variants (ms-label owns
type); `rounded-md` back in base, per-size copies removed.

**New finding 1 — the ring alone was still not enough.** Tailwind
`ring-*` composes through `box-shadow`, which unlayered steel primitives
own (`.ms-key` on the drawer buttons sets box-shadow directly) — the
restored ring was silently eaten exactly where keyboard focus matters
most (CHECKOUT / CONTINUE SHOPPING). Added a site-wide unlayered
`:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }`
— outline is a separate property nothing overrides. Verified: focused
CHECKOUT now shows the 2px brand outline. This is the standing rule: **on
this site, focus visibility comes from outline, not ring** — ring
utilities stay only for surfaces without a steel box-shadow.

**New finding 2 — `ms-steel-face` / `ms-steel-bevels` in button.tsx were
dead class names.** No `.ms-steel-face`/`.ms-steel-bevels` rules exist
anywhere (only `--ms-steel-face`/`--ms-steel-bevels` variables feeding
`.ms-tile::after`). Removed from base + 4 variants; 0 hits left. Same
"lie" family as the dead text-* utilities.

**MINOR 1:** trailing newlines restored on `not-found.tsx`, `hero.tsx`,
`alert-dialog.tsx`, `avatar.tsx` (+ the two files I touched).
**MINOR 2–4:** accepted, not fixed — alert-dialog/avatar/badge are
dormant (0 usages); weight pin resolved as a side effect (see above).

**Gates (all green):**
- `npx tsc --noEmit` → 0 app errors (build alone proves nothing —
  `ignoreBuildErrors: true` still set in next.config; see Round 6 MAJOR 1).
- `npm run build` → compiled, 13/13 pages.
- grep: `Amazon Ember` 0, `var(--font-display` 0, dead steel classes 0,
  EOF newlines OK on all six touched/stripped files.
- Browser E2E (scripts/verify-round7-fix.js): 22/22 — JSON-LD/skip
  link/OG live; body, ms-chip, ms-tab, search ::placeholder and PDP
  weight toggle all compute to Inter with true 800; drawer flow works
  (tile → sheet → add → drawer); CHECKOUT keyboard focus shows brand
  outline; 404 HOME exit intact. Screenshots:
  `.shots/round7-fix-home.png`, `.shots/round7-fix-drawer-focus.png`.

---

## ROUND 8 — `8a10f45` audit: card/carousel/chart/checkbox restyle (verified live)

One commit restyling four shadcn primitives. All four have ZERO usages in
the app (`rg "ui/(card|carousel|checkbox|chart)"` outside components/ui →
0 hits), so nothing user-facing changed. That is the only reason this
push is not blocker-grade: it repeats a Round 7 offense one round after
the fix was pushed and documented. Cleanest live impact of any push so
far — and the most repeat-offensive.

### POSITIVES — keep
1. `tsc` 0 errors; build green 13/13; the full 22-check round-7 browser
   suite re-run after a dev-server restart → 0 regressions.
2. Token usage is legitimate: `--color-ink/-brand/-line/-hush` all exist
   in the steel theme block — `text-ink`, `bg-white`, `border-line`,
   `text-hush` all resolve.
3. Carousel gap math (`-ml-6`/`pl-6`) is self-consistent; the larger
   nav-arrow hit targets are reasonable.

### MAJOR 1 — the commit's entire stated purpose is fictional (REPEAT OFFENSE)
`ms-steel-face` / `ms-steel-bevels` were added as CLASS names in six
places (Card root, Carousel root, Carousel prev/next, chart tooltip,
Checkbox root). These classes DO NOT EXIST — only the CSS VARIABLES
`--ms-steel-face` / `--ms-steel-bevels` exist, consumed by
`.ms-tile::after`. Grep: `^\.ms-steel-(face|bevels)` in globals.css → 0
hits; the whole src tree → 0 rules. Every surface this commit "restyled"
renders exactly as before. The steel cabinet look it claims to apply is
the CSS version of the Amazon Ember stack — a name that renders nothing.
Round 7 removed the identical fiction from button.tsx and recorded
"dead steel classes 0" as a gate; this push re-introduced it within one
round. Pattern #6 added to the learn-list above.

### MAJOR 2 — ms-display / ms-label misuse inside the dormant primitives
- `CardTitle`: `ms-display text-xl` — ms-display forces line-height 0.95
  + uppercase; 0.95 leading on a 20px title is the exact cramped styling
  flagged on alert-dialog (Round 7 MINOR 2).
- `CardDescription`: `ms-label` → 10px uppercase description text.
- Chart tooltip value: `ms-label` silently kills `font-mono` (unlayered
  primitive beats layered utility — same cascade lesson as Round 7's
  eaten ring) and renders numerals as 10px caps.
Dormant today; landmines the day anyone imports these components.

### MINOR
1. EOF newlines stripped on card.tsx, carousel.tsx, checkbox.tsx
   (offenses #8–10; chart.tsx left intact).
2. `focus-visible:ring-0` on carousel nav buttons — solves a box-shadow
   conflict that does not exist (the bevels are dead classes) and is
   redundant under the site-wide outline focus rule. Harmless, but it is
   confusion compounding on confusion.
3. Churn on zero-usage components: avatar + badge (Round 7), now card +
   carousel + checkbox + chart. Six dormant primitives restyled across
   two pushes while the storefront builds its surfaces from ms-tile /
   ms-plaque primitives that predate the shadcn layer.

### Definition of Done (Round 8)
- `ms-steel-face` / `ms-steel-bevels` → 0 hits in src/; if a steel card
  surface is actually wanted, promote a real rule (e.g. `.ms-steel-card`)
  in globals.css and use THAT class name.
- No ms-display on small titles; no ms-label where mono numerals were
  intended (chart tooltip values keep font-mono).
- Trailing newlines restored on card.tsx / carousel.tsx / checkbox.tsx.
- Standing gates: tsc 0, build 13/13, 22-check browser suite green.

### ROUND 8 RESOLUTION — fixed by Super Z

Executed per owner's "clean". No new rules invented — the storefront's
real surfaces already live on ms-tile/ms-plaque; these dormant primitives
just got honest.

1. **Dead steel classes → 0 across the whole ui/ layer.** Removed
   `ms-steel-face` / `ms-steel-bevels` from Card, Carousel root,
   Carousel prev/next, chart tooltip, Checkbox root (this round's six)
   AND from alert-dialog, badge, avatar (three latent hits from the
   Round 7 push that the Round 7 button-only grep gate missed). Grep
   `ms-steel` in src/components/ui → 0. No rule was promoted: if a steel
   card surface is ever actually wanted, write a real `.ms-steel-card`
   rule in globals.css first, then use it.
2. **Type misuse fixed:** CardTitle `ms-display` → `text-xl font-semibold
   leading-none tracking-tight text-ink` (no 0.95 crush, no forced
   uppercase); CardDescription `ms-label` → `text-sm text-hush`; chart
   tooltip values keep `font-mono tabular-nums` (ms-label removed — it
   was overriding the mono face unlayered).
3. **Carousel nav buttons:** dead bevels + redundant `focus-visible:ring-0`
   removed; keyboard focus rides the site-wide outline rule like every
   other surface.
4. **EOF newlines** restored on card / carousel / checkbox (and badge,
   found stripped during the sweep).

**Gates (all green):** tsc 0 app errors; build 13/13; 22-check browser
suite 0 regressions after dev restart; grep `ms-steel` in
src/components/ui → 0; EOF OK on all touched files.
