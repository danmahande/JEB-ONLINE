# Repo Improvement Review — JEB-ONLINE

**Reviewed:** `main` @ `62e7067` (2026-10-07), plus the live deployment `jeb-online.vercel.app`.
**Method:** four independent read-only audit passes (gate battery, API/security/a11y, design system + hygiene, deployment + ledger cross-check), then parent re-verification of every load-bearing claim with its own commands. Nothing was edited; no file was committed.

---

## Verdict in one paragraph

The engineering discipline in this repo is mostly real and the audit trail is unusually honest. But three things are true simultaneously, and only the third matters to the owner right now:

1. **Code quality is high.** `tsc --noEmit` is silent, `next build` produces 39 routes, all 154 source files end in exactly one `\n`, `test:admin` is 29/29, zero fictional classes except one, and the checkout recomputes every price server-side so the browser cannot set the total.
2. **The rules are unenforced.** There is no CI and no git hook. Every gate — including the EOF rule and the PROOF BLOCK that seven rounds of incident reports created — is a manual step a human or agent must remember.
3. **Production is not currently a store.** The live catalog feed returns zero products. As deployed, a buyer sees a wall of animated skeleton tiles and cannot add a single item to a cart.

The most valuable improvement is not another component fix. It is **moving the enforcement out of prose and into CI**, because every recurring failure class in the ledger (EOF offenses ×35, fictional classes ×3 rounds, ledgered bug re-shipped ×3, an inverted commit) is a *skipped manual check* — and prose has now failed 28 times to prevent it.

---

## Tier 0 — Production is broken right now

### 0.1 The live shop exposes an empty catalogue (blocker)

```
GET https://jeb-online.vercel.app/api/products
→ {"success":true,"count":0,"products":[],"total":0}
GET .../api/products?all=true       → count 0
GET .../api/products?pageSize=100   → count 0
```

`src/app/api/products/route.ts:19` filters `where = { isActive: true }` and, without a `page` param, applies no `skip`/`take` (`:35`). So `total: 0` means **zero active product rows in the deployment's database** — not a query artifact. Confirmed independently on the homepage: the SSR HTML contains 12 `ms-tile` elements that are all `animate-pulse` skeletons, **0** `/p/` product links, **0** `<img>` tags, and 0 instances of the real empty-state text (the empty state at `product-grid.tsx:231` renders client-side only, after the skeletons resolve).

**Who hits it:** every visitor. **What breaks:** there is nothing to buy; the header cart and search have no catalog to search.

**Fix direction:** run the seed against the production `DATABASE_URL` (`npx tsx scripts/seed.ts` — the exact command is already documented in `.gitignore:79` as the way to recreate the runtime DB), or reactivate the rows. Then verify with the same three URLs above and expect `total > 0`.

**Why no gate caught it:** gate 3 (`curl / → 200`) is satisfied by a page of skeletons. A 200 is not a store. This is the argument for a real smoke assertion: *seed data exists and the feed returns ≥1 product*.

### 0.2 Canonical origin is `localhost` in production (high)

`src/lib/site.ts:4` → `SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`, and production does not set the variable.

Live evidence:
- `/robots.txt` → `Sitemap: http://localhost:3000/sitemap.xml`
- `/sitemap.xml` → 2 URLs total, both `http://localhost:3000/...`

The same constant drives `layout.tsx:22` (`metadataBase`) and `:51` (og:url), and `p/[slug]/page.tsx:98,107` (og:image + canonical). So every product page's canonical link and social image URL point at a machine that does not exist — while the sitemap advertises zero products to crawlers.

`NEXT_PUBLIC_SITE_URL` appears in **no** `.env.example` and **nowhere** in the README. `site.ts` is the only correct place for it; it just needs to be set and documented.

### 0.3 The image fallback used by five components is not deployed (high)

`/products/placeholder.png` → **404** live (control: `/` → 200).

The file exists only as **untracked** `public/products/placeholder.png` (24,510 bytes). It is referenced by shipped code in five places:

| File | Line |
|---|---|
| `src/components/storefront/cart-drawer.tsx` | 93 |
| `src/components/storefront/quick-view.tsx` | 157 |
| `src/components/storefront/product-grid.tsx` | 322 |
| `src/components/storefront/checkout.tsx` | 542 |
| `src/app/p/[slug]/product-view.tsx` | 159 |

Vercel deploys from git, so the fallback can never exist in a deploy unless the PNG is committed. Any product with a null/empty `image` renders a broken image in the drawer, quick-view sheet, grid, checkout summary and PDP. Given 0.1, this is currently masked.

### 0.4 One session-reading page is statically frozen (medium)

`src/app/account/signup/page.tsx:16` runs `if (await getCustomerSession()) redirect("/account/orders")` and exports **no** `dynamic` — while its siblings do (`account/page.tsx:9`, `account/orders/page.tsx:10`).

Verified three ways: the build table prints `○ /account/signup`; `.next/server/app/account/signup.html` exists on disk; the route is listed in `.next/prerender-manifest.json`.

This is the *same class* as recorded offense **#43**, on a different route, and it is not in the ledger. The R23 repair fixed `/account` and missed signup. Consequence: the "already signed in → go to your orders" redirect is evaluated at build time and frozen, so a signed-in customer visiting `/account/signup` gets the anonymous signup form.

**Fix:** add `export const dynamic = "force-dynamic";` — and, better, add the mechanical check below so the next route cannot repeat it.

**Mechanical check that generalizes it:** for every file matching `getServerSession|getAdminSession|getCustomerSession`, assert `dynamic = "force-dynamic"` is present *or* the route reads `ƒ` in the build table. That is a ~15-line CI script and it retires this offense class permanently.

---

## Tier 1 — Will bite next

### 1.1 The working tree is dirty and the newest work is undeployed

```
$ git status --short
 M src/app/admin/products/admin-products.tsx
 M src/components/storefront/checkout.tsx
?? .zwork/
?? public/products/placeholder.png
$ git rev-list --left-right --count origin/main...HEAD
0       1          # 0 behind, 1 ahead
$ git stash list
stash@{0}: WIP on main: 6f48b76 ...
```

Both diffs are *good work*: `checkout.tsx` (+35) adds a live freight + estimated-total panel at the operator-choice step, where the tariff difference actually drives the decision; `admin-products.tsx` (+122/−31) makes the ~700px product form collapsible so the inventory list is not pushed below the fold. Neither has been pushed, so none of the four "round-28 batch 1/2" UX repairs is live. There is also an unreferenced stash from an older base.

### 1.2 One corrupt string can 500 the entire catalog feed (high)

`src/app/api/products/route.ts:63` — `variants: JSON.parse(p.variants || "[]")` — sits inside an unguarded `.map()` at `:39`, and the surrounding `catch` (`:78`) turns any throw into `500 {"success":false,"error":"Failed to load products"}`.

`variants` is a plain `String @default("[]")` (`prisma/schema.prisma:56`), so any row holding a malformed value (a legacy ERP import, a partial write, or a future non-admin writer) kills the whole grid for **all** buyers. The safe pattern already exists twelve files away: `p/[slug]/page.tsx:13-20` wraps the parse in try/catch and returns `[]`.

Four more `JSON.parse` sites on the same field are unguarded: `orders/route.ts:269`, `admin/products/route.ts:47`, `admin/products/[id]/route.ts:72` (plus `use-url-state.ts:21`, which parses URL state).

### 1.3 Nothing enforces anything (the structural finding)

```
$ Test-Path .github        → False
```

No CI workflow, no git hook, no pre-push script. The six gates, the per-file EOF rule and the PROOF BLOCK are all manual. The repo is the proof: **its own documents have drifted from its own code**, which only happens when humans verify by memory.

| Stale claim | Where it says it | What the code actually is |
|---|---|---|
| `.ms-label` is "10px / 700 / **0.14em**" | `AGENTS.md:333` | `globals.css:230-232` → **11px / 700 / 0.1em** |
| "build **13/13**" | `AGENTS.md` gate list | **39** routes |
| "suite **22/22**" | `AGENTS.md` gate list | `test:admin` = **29** tests (no `22/22` script) |
| "#28–35 … **still outstanding**" | `AGENT-FIXLIST.md:664` | R21 closed them; all 8 files verified EOF-clean |
| `dropdown-menu` has "0 usages" | `AGENTS.md` round-11 section | imported at `header.tsx:10` |

**Highest-leverage fix in this entire document:** a GitHub Actions workflow that runs, on every push:

1. `npx tsc --noEmit` (must be silent)
2. `npx next build` (must exit 0)
3. `npm run test:admin` (0 failures)
4. **EOF check** — every tracked `src/**` file's last byte is `0x0A`
5. **fictional-class check** — every `ms-*` token used in JSX exists in `globals.css`
6. **session-route check** — every `getServerSession` consumer has `force-dynamic` or reads `ƒ`
7. **story assertion** — `/api/products` returns `total > 0`, and `/` contains ≥1 `/p/` link

Gates 4–6 are the three recurring offense classes, mechanized. Gates 1–3 already pass; they become permanent. Gate 7 is the one that would have caught the empty production store. Writing it is a few hours; it makes the last 28 rounds of prose unnecessary.

### 1.4 Legal and trust pages contradict the product (high, honesty)

This repo has a recorded pattern of "copy lies", and three live instances:

- **Payment terms disagree.** `terms-content.tsx:42` — *"Payment is due at the time of purchase"* — versus `checkout.tsx:616` — *"Nothing is charged on this site"* — and `confirmation.tsx:70` — *"Nothing was charged online."* A buyer reading both pages gets opposite contracts.
- **A referenced page does not exist.** `terms-content.tsx:66` — *"Please review our Return Policy separately"* — but there is no return-policy route under `src/app/`.
- **The privacy policy describes a different product.** `privacy-content.tsx:40` claims collection of *"payment details"*; `:42-43` claims IP address and referral URL via cookies; `:72` claims to *"serve targeted advertisements"*. No checkout collects payment details, no analytics or ads code exists in any route, and nothing writes IP addresses for advertising. Publishing a data-practices policy for data practices the site does not run is a legal exposure, not a copy nit.

### 1.5 The header is inert on all four content pages (high, UX)

`terms/privacy/shipping/contact-content.tsx` each render `<Header onNavigate={() => {}} onOpenCart={() => {}} />` (`:11-12`, `:18-19`). The header looks identical to the storefront's — search box, cart lamp — and doing anything with it does nothing. On a live shop, a search box that silently swallows the query is a broken-shop signal. Either wire these pages to the real navigation or render a reduced header, but do not ship a dead copy of a live control.

### 1.6 `Reveal` renders nothing at all (medium — and it is the fictional-class class)

`src/components/storefront/reveal.tsx:47` emits `ms-reveal` / `ms-reveal-in`. In `globals.css`, `.ms-reveal` exists **only inside the reduced-motion block** (`:476`, `:497`), and `ms-reveal-in` does not exist anywhere (`rg -c → 0` hits). There is no base `opacity:0` + transition rule.

So: every block wrapped in `<Reveal>` is always visible with no animation, and `inView` (line 20) drives a dead ternary. The reviewer's strict word-boundary diff found this is the **only** used-but-undefined class in the repo — which is genuine progress (rounds 7–9 shipped 16+) but is still an instance of the same failure mode, and it silently disables a documented feature. Either add the base rule or delete the component.

*Confirmed clean:* `.ms-steel-face` / `.ms-steel-bevels` are never used as class names (0 hits) — they are correctly CSS variables at `globals.css:163-164` consumed by `.ms-tile::after`. Zero defined-but-unused `ms-*` classes.

### 1.7 Unused heavy dependencies still carry CVEs (medium)

`@mdxeditor/editor` and `react-syntax-highlighter` have **zero imports** anywhere in `src/` (grep: no hits). Removing them deletes the `js-yaml` and `prismjs` vulnerability chains with no code change.

```
$ npm audit --omit=dev
10 vulnerabilities (4 moderate, 6 high)
  deepmerge-ts     high     (prisma → @prisma/config)
  js-yaml          high     (@mdxeditor/editor)
  prismjs          moderate (react-syntax-highlighter → refractor)
  sharp            high     (libvips/libheif/librsvg CVEs)
  source-map-js    high     (event-loop DoS)
$ npm audit   → 15 vulnerabilities (4 moderate, 11 high)
```

`sharp` and `source-map-js` are transitive through Next and should be handled with an `overrides`/`resolutions` pin rather than an ignore.

---

## Tier 2 — Design system, hygiene and scale

**2.1 Dead primitives: 43 of 48.** Only `button`, `dialog`, `dropdown-menu`, `input`, `toaster` (+ `toast` transitively) are imported from app or storefront code. AGENTS.md's 10-name dormant list is confirmed, and **33 more are also unimported** — including `drawer`, `sheet`, `select`, `sidebar`, `sonner`. Most of this volume, plus the ten rounds of churn the ledger documents on it, is dead weight. (The round-11 note that `dropdown-menu` had "0 usages" is stale: `header.tsx:10`.)

**2.2 87% of the repo is screenshots.** `.shots/` is **tracked** — 53 PNGs, **31,030,099 bytes** of a ~35.8 MB tracked total — and all ten largest tracked files are audit screenshots (largest 1.26 MB). `.gitignore` has no `.shots` rule. Every clone and every deploy pays for it.
```
$ git check-ignore -v .shots/
NOT-IGNORED
```

**2.3 Two lockfiles that disagree.** `bun.lock` (next 16.1.3, react 19.2.3) vs `package-lock.json` (next 16.3.6, react 19.3.0). `vercel.json` runs `npm run build`, so the deployed tree follows `package-lock.json`; the README's documented local workflow is `bun install`. Two different React/Next trees from one repo. Keep one and delete the other, or add a `packageManager` field so the intent is explicit.

**2.4 Ignore gaps.** `.kilo/` and `.zwork/` are not in `.gitignore` (only `.kilo/worktrees/`, via the *local, non-travelling* `.git/info/exclude:9`), so they surface as untracked noise on any fresh clone. Correctly ignored already: `tsconfig.tsbuildinfo`, `.next/`, `db/`, `prisma/db/`, `.pgdata*`, `.server-env`, `.server-log`. No SQLite artifact is tracked (offense #38 stays closed).

**2.5 Data-model risks.**
- Every money column (`unitCost`, `unitSellingPrice`, `totalAmount`, `dutyAmount`, `vatAmount`, line totals) is `Float`. Duty → levies → VAT → total accumulates binary float error; use `Decimal` or integer minor units for anything ledger-shaped.
- `OrderProcessing.trackingNumber` has no index, yet the public tracking path does `findFirst` with `orderNumber OR trackingNumber`. Full-table scan as orders grow.
- No DB-level `CHECK (currentStock >= 0)`. Decrement safety rests entirely on one guarded `updateMany ... where currentStock >= qty` in `orders/route.ts` — correct today, one future writer away from negative stock.

**2.6 Mail can silently not send.** `src/lib/mail.ts` really does POST to Resend with a 5s abort and never logs the key (good). But with `RESEND_API_KEY`/`MAIL_FROM` unset it degrades to console-log and returns `{sent:false}`, and `orders/route.ts` ignores `sendAll`'s result — so an order can be "confirmed" with no customer email and no surface signal, while `shipping-content.tsx §6` explicitly promises a shipping-confirmation email.

**2.7 Untracked work that must not be merged.** Branch `agents/file-reading-capability` holds unique commit `01a5a9b` (+118/−322 on `orders/route.ts` against current main). Merging it today would revert large parts of the orders pipeline **and** reintroduce `error instanceof PrismaClientKnownRequestError` — the exact dead pattern offense #42 replaced with a duck-typed check. The R19 "do not merge yet" advisory is still correct, for new reasons.

**2.8 The one end-to-end suite cannot run here.** `scripts/verify-round7-fix.js` exists and matches the documented name, but it needs a production build + server + **Postgres** with seeded data. The repo's own `.env` holds a `file:` (SQLite) `DATABASE_URL` while `prisma/schema.prisma:14` says `postgresql`, so the suite dies with `PrismaClientInitializationError ... must start with the protocol postgresql://`. Gate 6 is unpassable on this machine by construction — which is why the same gate is repeatedly reported "NOT RUN".

---

## What I would do, in order

**Today (~45 minutes, all low-risk)**
1. Set `NEXT_PUBLIC_SITE_URL=https://jeb-online.vercel.app` in Vercel and document it in `.env.example` + README.
2. Seed the production database, then verify `total > 0` on `/api/products` and count `/p/` links on `/`.
3. `git add public/products/placeholder.png` — the fallback four components depend on.
4. Add `export const dynamic = "force-dynamic"` to `src/app/account/signup/page.tsx`.
5. Review, then commit and push the two modified files (with the required PROOF BLOCK, which by its own rule must now carry the complete GATES line).

**This week**
6. Remove `@mdxeditor/editor` and `react-syntax-highlighter` (zero imports; kills 2 CVE chains).
7. `.gitignore` `.shots/`, `.kilo/`, `.zwork/`; `git rm -r --cached .shots`.
8. Delete one lockfile; add `packageManager`.
9. Guard the five remaining `JSON.parse(p.variants)` sites with the PDP's try/catch pattern.
10. Wire or reduce the header on the four content pages.

**This month**
11. **CI with the seven checks in §1.3.** This is the item that pays for itself; it retires the EOF class, the fictional-class class and the session-route class permanently, and it is the only durable answer to a ledger that grows every round.
12. Honesty pass on privacy/terms: delete the payment-details, IP-for-ads and return-policy claims; reconcile the payment-terms contradiction.
13. Money → `Decimal`; index `trackingNumber`; add the `currentStock >= 0` constraint; surface `sendAll` failures in the order flow.

**Then, and only then, simplify the governance.** `AGENT-FIXLIST.md` is 230 KB. Once CI enforces the mechanical rules, that document can shrink to the judgment rules (design decisions, product contract, honesty standard) — because the parts that fail on repeat are exactly the parts a machine should be doing. Splitting it into a current-state file plus an append-only `history/` also stops the stale-claim drift in §1.3, which today makes the newest revision *less* trustworthy than the code it describes.

---

## Coverage and honesty

**Verified this session, by me, on the live deployment or at HEAD:** the four Tier-0 defects (feed `total:0` × 3 query shapes, `robots.txt`/`sitemap.xml` localhost, placeholder 404 vs control 200, `signup.html` + manifest + missing `dynamic`), the dirty tree and ahead/behind counts, `JSON.parse` at `products/route.ts:63` vs the guarded PDP version, the no-op header handlers on all four content pages, the privacy/terms/payment contradictions, `.ms-label` 11px/0.1em vs `AGENTS.md:333`, `ms-reveal` absent from `globals.css`, `mdxeditor`/`syntax-highlighter` zero imports, `.shots/` tracked at 31.0 MB, `.kilo`/`.zwork` unignored, both lockfiles' versions, `Test-Path .github` → False, the five `placeholder.png` call sites, and the admin-schema validation that keeps bad `variants` out via the admin path.

**Verified by an audit pass with pasted output, which I cross-read but did not re-run myself:** `tsc` exit 0 silent; `next build` exit 0 / 39 routes / 29 `ƒ`+10 `○`; 154/154 EOF clean; `test:admin` 29/29; `npm audit` 10 prod / 15 full; `npm outdated` 50 rows; PROOF BLOCK audit of the last 12 commits (blocks present on 4, partial on 2, absent on 6; **zero falsified byte claims**); `ms-steel` 0 hits; the fictional-class word-boundary diff (exactly one hit); the 43-of-48 unused-primitive count.

**Not verified, and why:** whether a first-time visitor's real session currently reaches checkout (no production seeded data, so no order can be placed); the live consequence of the frozen signup redirect (needs a signed-in session against production); Gate 6's pass/fail (needs Postgres + seed); `prisma migrate diff` against a shadow database; and runtime behaviour of the unguarded parses (they require a corrupt row, which the admin schema currently prevents). Everything above is reproducible: the commands and their outputs are quoted inline.
