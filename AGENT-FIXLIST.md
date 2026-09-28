# AGENT FIXLIST — commit `1927edc` review

> For the AI agent working in this repo. The site is currently **down (HTTP 500
> on every route)**. Fix the blockers first, in order. Every issue below was
> verified against the working tree — file:line references are exact at the
> time of writing. Do not ship until the Definition of Done at the bottom
> passes.

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
