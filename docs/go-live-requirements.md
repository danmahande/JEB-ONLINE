# Go-Live Requirements — Meridian Supply Co. / JEB-ONLINE

**As at:** Thursday, 8 October 2026 · **Code:** `main` @ `27e5919`, tree clean, CI green
**Live:** https://jeb-online.vercel.app — **4 story-check failures; not sellable**

This is the checklist. `docs/launch-plan.md` explains the reasoning; this is what to tick off.
**Owner** = who must act. `YOU` = only you can (credentials, money, business decisions). `ME` = I can do it
in code this session. `BOTH` = you supply access, I do the work.

Status tags: `[ ]` outstanding · `[x]` done and verified · `[~]` done but unverified.

---

## A. Hard blockers — the shop cannot open without these

| # | Requirement | Owner | How to verify | Status |
|---|---|---|---|---|
| A1 | **Seed the production database** (14 products, 6 regions, bus operators) | YOU + ME | `node scripts/check-story.mjs <url>` reports "a working shop" | `[ ]` |
| A2 | **Set `NEXT_PUBLIC_SITE_URL`** in Vercel → Settings → Environment Variables | YOU | `robots.txt` no longer advertises `http://localhost:3000` | `[ ]` |
| A3 | **Register the production domain** and point it at Vercel | YOU | `https://<domain>/` serves the storefront with a valid certificate | `[ ]` |
| A4 | **Set `NEXT_PUBLIC_CONTACT_EMAIL`** to the real address on that domain | YOU | Contact page, footer and all three legal pages show it | `[ ]` |
| A5 | **Inbound + outbound email working** (verified sender: SPF + DKIM) | YOU | A test order sends the customer confirmation AND your owner alert | `[ ]` |
| A6 | **Vercel env: `RESEND_API_KEY`, `MAIL_FROM`, `OWNER_ALERT_EMAIL`** | YOU | Same test as A5 | `[ ]` |
| A7 | **`NEXTAUTH_SECRET`** (≥32 chars) in Production | YOU | Customer login and signup work on the live site | `[ ]` |
| A8 | **`DATABASE_URL` + `DATABASE_URL_UNPOOLED`** present in Production | YOU | Build log shows `prisma migrate deploy` succeeding | `[ ]` |

**A2 + A1 together clear 3 of the 4 live failures.** A3–A4 are the domain switch completed.

---

## B. Before the doors open — verification nobody has run yet

| # | Requirement | Owner | Notes | Status |
|---|---|---|---|---|
| B1 | **Apply the pending migration** `20261007160000_public_write_throttle` | BOTH | Written, parses, **never applied**. First `migrate deploy` exercises it | `[ ]` |
| B2 | **Verify the 429 throttle on live data** | BOTH | Proven in 10 unit tests only, never against a real DB | `[ ]` |
| B3 | **Gate 7 — place one real order end to end** | BOTH | Order in `/admin/orders`, total correct, stock decremented, both emails, tracking by order no. AND tracking no., customer can cancel, a *different* customer cannot | `[ ]` |
| B4 | **Run the storefront suite** (`scripts/verify-round7-fix.js`, 22 checks) | BOTH | Never run — needs a seeded Postgres. **Note: its contact assertion still hardcodes the old domain and will fail until fixed** | `[ ]` |
| B5 | **Fix that suite assertion** | ME | Blocked by the write guard (credential-shaped test fixture in the file) — needs your say-so | `[ ]` |

---

## C. Business readiness — no code, all judgement

| # | Requirement | Owner | Why it is a launch blocker | Status |
|---|---|---|---|---|
| C1 | **Payment & fulfilment runbook** | YOU | No gateway by choice, so the manual path IS the transaction: where money lands per method (MoMo/M-Pesa/Airtel/bank/TT), deposit vs balance, who confirms, reply time, what "dispatched" means. Someone other than you must process a paid order from it alone | `[ ]` |
| C2 | **Stock-hold policy** | YOU | Orders don't reserve stock — two buyers can be told yes for the last bag. Decide: reserve with a timeout, or accept oversell and handle it in C1 | `[ ]` |
| C3 | **Confirm or overrule the two open pricing facts** | YOU | No FX markup on `rateToUsd`, and no handling fee beyond `shippingBase` + per-kg + duty + VAT. If you intend a margin, it must be in the price *before* launch — the quote is what the buyer sees and agrees to | `[ ]` |
| C4 | **Manual shipping base/duty overrides** | YOU | Admin currently can't override the computed shipping base, duty or VAT on a single order. If a corridor quote is wrong, your only remedy is to edit the region globally — which changes every future order. Acceptable for launch if C1 says so | `[ ]` |
| C5 | **Admin password check** | YOU | ≥14 chars, generated via `npm run admin:hash`, not a default. Log in from a clean browser | `[ ]` |
| C6 | **Catalogue sanity pass** | YOU | 14 seeded products: real prices, real stock, real images, no obvious placeholders. Confirm you actually sell all of them | `[ ]` |

---

## D. Legal and trust

| # | Requirement | Owner | Why | Status |
|---|---|---|---|---|
| D1 | **Legal identity in the terms** | YOU + ME | Terms/privacy currently name no registered company, number or physical address — just "Kampala, Uganda". A real business address plus contact is expected for a Ugandan consumer-facing shop and is a buyer-trust signal | `[ ]` |
| D2 | **Governing jurisdiction confirmed** | YOU | Terms say Ugandan law. Confirm that matches the entity that will actually be paid | `[ ]` |
| D3 | **Contact page response promise** | YOU | It says "we'll reply the **same business day**". With no inbound email (A5) that promise is already being broken silently | `[ ]` |

---

## E. Security and reputation

| # | Requirement | Owner | Why | Status |
|---|---|---|---|---|
| E1 | **Decide repo visibility** | YOU | Still `private=false`. Exposes prices, admin design and business logic. Make private or accept it deliberately | `[ ]` |
| E2 | **Confirm or rotate the exposed `.env` value** | YOU | Present in commits `2b14a72` / `7ccd6f0` in a public repo (36 chars, no host or credential separators — looks like a local `file:` path, but unproven). If it was ever real, rotate | `[ ]` |
| E3 | **Add `.env.example` line by hand** | YOU | New `NEXT_PUBLIC_CONTACT_EMAIL` documented in README but not in the template — the write guard refuses to touch a file containing a credential-shaped placeholder | `[ ]` |

---

## F. First week after launch

| # | Requirement | Owner | Why |
|---|---|---|---|
| F1 | **Monitoring + alerting** | BOTH | Nothing exists. Error tracking, uptime on `/` and `/api/products`, and alert when email send fails (those failures are currently swallowed) |
| F2 | **Confirm and test a database restore** | YOU | Untested backup is a hope, not a backup. Restore into a scratch Neon branch |
| F3 | **Money precision: `Float` → `Decimal`** | ME | Duty → levies → VAT → total accumulates float error |
| F4 | **DB `CHECK (currentStock >= 0)`** | ME | Today only one guarded `updateMany` prevents negative stock |
| F5 | **Accessibility pass** | ME | Icon-only close/remove in the cart drawer lack `aria-label`; pack selectors lack `aria-pressed`; no live regions for cart changes or form errors |
| F6 | **Index `OrderProcessing.trackingNumber`** | ME | Public tracking does an unindexed `OR` scan |
| F7 | **Confirm `company` / `postalCode` handling** | ME | Checkout validates both then may not send them |
| F8 | **Analytics decision + matching privacy copy** | YOU | You collect nothing and the policy now says so. Adding analytics means changing the policy in the same commit |

---

## G. Deferred on purpose (not launch blockers)

- **Live payment gateway** — a build, not a config change (e.g. Flutterwave/Paystack for UGX + mobile money).
- **Order status / dispatch emails** beyond confirmations.
- **Public returns flow** — terms currently handle it case by case via email.
- **Splitting `src/app/page.tsx`** (359-line client component holding shop, checkout, confirmation and track).
- **Retiring unused code** — 43 of 48 `src/ui/` primitives are imported by nothing.
- **Shrinking `AGENT-FIXLIST.md`** (230 KB) now that CI enforces the mechanical rules.

---

## The shortest path to live

Do these seven, in this order. Nothing else on this page blocks a first sale.

1. **A2** set `NEXT_PUBLIC_SITE_URL` (~2 min)
2. **A8 + A1** confirm DB vars, then seed (~10 min)
3. **A5 + A6** email env vars and verify both emails arrive (~15 min)
4. **A7** set `NEXTAUTH_SECRET`
5. **B1 + B3** apply the migration, then place one real order end to end
6. **C1 + C2** write the runbook and decide stock holds — this is the part a tool cannot do for you
7. **A3 + A4** point the domain, set the contact address, re-run the story check

Re-run `node scripts/check-story.mjs https://jeb-online.vercel.app` after steps 1–2. It currently reports
**4 failures**; it must report "a working shop" before step 7 is worth doing.
