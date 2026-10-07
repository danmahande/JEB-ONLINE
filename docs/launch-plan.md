# Launch Plan — Meridian Supply Co. / JEB-ONLINE

**Written:** 2026-10-07 · **Code state:** `main` @ `514c99c` (CI green) · **Live:** https://jeb-online.vercel.app

**What this document is:** the ordered path from "the code is ready" to "a stranger can buy and you get paid."
It is not a repeat of the code review (`docs/repo-improvement-review-2026-10-07.md`). It assumes round-29 is
shipped, which it is.

**How to read the status tags:** every item is tagged `DONE`, `TODO`, or `UNVERIFIED`. `UNVERIFIED` means no
one has proven it, including me — it is not a synonym for "fine".

---

## 0. Three decisions this plan assumes — confirm or overrule

These block real progress, so the plan proceeds on the recommended default. Anything downstream of a wrong
assumption is marked.

| # | Decision | Assumed default | Consequence if wrong |
|---|---|---|---|
| D1 | **`meridiansupply.co` ownership** | You own it and will point it at Vercel | If it is someone else's, every reference in `site.ts`, footer, contact, privacy, terms and shipping must change before launch — including the `sales@` address |
| D2 | **Repository visibility** | Make it private | If it stays public, accept that prices, admin design and business logic are visible; the exposed `.env` value should then be rotated regardless |
| D3 | **Commercial model** | Order capture + manual payment, as built | If you want a live gateway, that is a build (Flutterwave/Paystack for UGX + mobile money) and it reopens the checkout flow that round-29 verified |

**Verified facts behind D1:** `meridiansupply.co` resolves to `88.222.223.133` / `5.252.75.2` and serves
HTTPS 200 — but **it is not your Vercel deployment**. Your storefront uses that domain in its footer, contact
page, all three legal pages, and as the sender in the mail layer.

---

## 1. Launch blockers

Nothing below is optional. Each lists the exact action and how to prove it worked.

### B1 — Domain and email identity
**Status: TODO** (depends on D1)

- Point the apex and `www` at Vercel, then set the project domain in Vercel → Settings → Domains.
- Create the sending mailbox (e.g. `orders@`), verify the domain with your email provider (SPF + DKIM DNS
  records) — an unverified sender is why order mail lands in spam or silently fails.
- **Verify:** `https://<your-domain>/` returns the storefront with a valid certificate, and the address on
  `/contact` is one you can receive mail at.

### B2 — Production data and the canonical origin
**Status: TODO** — this is the difference between a shop and a wall of loading skeletons.

Production currently serves an empty catalogue: `GET /api/products → {"success":true,"count":0}`.

```
# 1. Seed (upsert; never deletes rows). Use the Neon connection string.
$env:DATABASE_URL="postgresql://..."; npx tsx scripts/seed.ts

# 2. Vercel → Settings → Environment Variables (Production):
#    NEXT_PUBLIC_SITE_URL = https://<your-domain>     (no trailing slash)

# 3. Verify — must report "a working shop"
node scripts/check-story.mjs https://<your-domain>
```

Migration is automatic: `vercel.json` runs `prisma migrate deploy` as part of the build.

**Verify:** the story check passes all five assertions (catalogue non-empty, product links present, image
fallback 200, no localhost in `robots.txt`, sitemap lists products).

### B3 — Transactional email
**Status: TODO** — currently log-only, which is invisible to you *and* to the customer.

With `RESEND_API_KEY` / `MAIL_FROM` unset, `src/lib/mail.ts` writes to the server log and returns
`{sent:false}`; the order routes ignore that result. So an order can be accepted, the buyer sees a
confirmation screen, and **no email is sent to anyone** — while `/shipping` promises a confirmation.

Set in Vercel: `RESEND_API_KEY`, `MAIL_FROM` (a verified sender), `OWNER_ALERT_EMAIL`.

**Verify:** place a test order and confirm *both* emails arrive: customer confirmation and your owner alert.
If they don't, the order is silently lost to you.

### B4 — Payment and fulfilment runbook (the business process)
**Status: TODO** — a document, not code.

Because no money moves through the site, the site is only half the transaction. Write down, and keep visible
to whoever works orders:

- Where the money lands per method — MoMo, M-Pesa, Airtel Money, bank transfer/TT, cash on delivery.
- Deposit vs. balance terms, and what happens if the buyer never pays.
- Who confirms stock and freight, and the reply time you promise.
- What "shipped" means for a bus cargo order (booked on which run, which operator, receiver named).
- What you do when an order cannot be filled.

**Verify:** someone other than you can process a paid order end to end using only this document.

### B5 — Stock-hold policy
**Status: TODO (decision)**

Orders do not reserve stock. Two buyers can order the last bag and both be told yes. Choose: reserve on
order with a timeout, or accept oversell and handle it in the runbook (B4). Deciding explicitly is enough
for launch; the database `CHECK (currentStock >= 0)` belongs in the first week (§3).

### B6 — Throttle the public write endpoints
**Status: TODO**

`/api/subscribe` and `/api/restock-notify` accept unauthenticated writes with no rate limit. Registration is
throttled (`RegisterAttempt`); these are not, so anonymous bulk spam can write unlimited rows.

**Verify:** the sixth rapid request from one address is rejected (409/429).

### B7 — Admin credentials
**Status: TODO — check before launch**

Make sure the production admin account is not a default or weak password (`MINIMUM_ADMIN_PASSWORD_LENGTH`
is 14 in code, and login attempts are rate-limited, which helps but does not substitute). Generate with
`npm run admin:hash`.

**Verify:** an obviously weak password is refused; the admin login works from a clean browser.

---

## 2. Go-live sequence

Run in order. Each step has a gate; do not skip one because the previous looked fine.

1. **Rotate anything that may have leaked.** `.env` existed in the public repo at commits `2b14a72` and
   `7ccd6f0` (removed in `cbd8565`). The value is 36 characters with no host or credential separators —
   consistent with a local `file:` database path — but **confirm what it was**; if there is any chance it was
   a real credential, rotate it and treat the history as exposed. `UNVERIFIED: exact value, by design.`
2. **Make the repo private** (D2) if that is your answer.
3. **Set every production env var** from `.env.example`: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
   `NEXTAUTH_SECRET` (≥32 chars), `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `MAIL_FROM`,
   `OWNER_ALERT_EMAIL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`.
4. **Deploy**, then confirm the build ran `prisma migrate deploy` without error.
5. **Seed** (B2) and run **`node scripts/check-story.mjs <prod-url>`** → must pass.
6. **Gate 7 — place one real order yourself**, end to end. This is the gate no test suite covers
   (`UNVERIFIED` to date):
   - order appears in `/admin/orders`; total matches the checkout quote;
   - stock decremented; both emails arrived (B3);
   - `/track` finds it by order number *and* tracking number;
   - a customer can cancel it, and a *different* customer cannot.
7. **Point the domain** and re-run the story check against it (B1).
8. **Confirm monitoring and backups** (§4) — before traffic, not after.
9. **Go/no-go:** story check green, one real order processed, emails received, rollback understood (§5).

**If a step fails, stop.** The whole point of ordering it this way is that each gate is cheap and the next
one is not.

---

## 3. First week after launch

Ranked by risk to money and to customers.

1. **Money precision** — every money column is `Float`. Duty → levies → VAT → total accumulates binary error;
   move to `Decimal` (or integer minor units). A ledger that does not add up is a support problem at best.
2. **Stock cannot go negative** — add the DB `CHECK (currentStock >= 0)`; today correctness rests on one
   guarded `updateMany` in the orders route.
3. **Monitoring** — error tracking, uptime alerting on `/` and `/api/products`, and confirm your Neon
   backup/PITR position. Right now a broken checkout is invisible until someone complains.
4. **Accessibility** — icon-only close/remove in the cart drawer lack `aria-label`; pack selectors lack
   `aria-pressed`; no live-region announcements for cart changes or form errors. Real usability, and
   reasonable-effort compliance.
5. **`trackingNumber` index** — the public tracking lookup does an unindexed `OR` scan.
6. **Checkout fields** — `company` and `postalCode` are validated then never sent to the order; either send
   them or remove the inputs (`UNVERIFIED: could not confirm from the client alone` — verify in step 6).
7. **Analytics decision, with its copy** — you currently collect nothing, and the privacy policy I corrected
   now says so explicitly. If you add analytics, the policy must change in the same commit.

---

## 4. Monitoring and backup baseline

**Status: TODO — none of this exists today.**

- **Error tracking** (e.g. Sentry): client + server + route handlers. Without it, the only signal is a
  customer complaint.
- **Uptime**: a synthetic check on `/` and `/api/products` every few minutes, alerting to you.
- **Database**: confirm Neon's retention/PITR window and test one restore into a scratch branch. An untested
  backup is a hope, not a backup.
- **Email**: alert if `sendAll` returns `sent:false` — right now those failures are swallowed.
- **A weekly run of `node scripts/check-story.mjs`** — it catches exactly the class of failure that shipped
  silently in round 28 (empty catalogue, localhost canonicals, missing image).

---

## 5. Rollback and incident basics

- **Bad deploy:** Vercel → Deployments → promote the previous successful build. Instant, no rebuild.
- **Bad code:** `git revert <sha>` and push; CI gates the result.
- **Database:** migrations are forward-only here (`prisma migrate deploy`); a schema mistake needs a new
  forward migration or a restore from the Neon backup. **Test the restore path before you need it.**
- **Sold out / broken order:** the runbook in B4 is the answer; make sure it says who is on the other end.

---

## 6. Post-launch (30 / 60 / 90)

**30 days**
- Split `src/app/page.tsx` (359 lines, one client component holding shop, checkout, confirmation and track)
  into real routes. It is the largest maintainability liability in the codebase.
- Retire unused code: 43 of the 48 `src/components/ui/` primitives are imported by nothing.
- Build the returns flow and order status emails.

**60 days**
- Shrink `AGENT-FIXLIST.md` (230 KB) now that CI enforces the mechanical rules mechanically. Keep the
  judgement rules — design decisions, product contract, honesty standard — and archive the rest.
- Refresh the dependency tree (50 packages are behind) with CI as the safety net.

**90 days**
- Evaluate a real payment gateway against the manual flow's actual friction, using real order data.
- Consider the ERP sync the schema was designed around (`productId`, `merchantId` fields are already there).

---

## 7. Known unknown, stated plainly

These are the things this plan cannot stand on yet. Treat each as a risk, not a detail.

- **Gates 6 and 7 have never been run** on this machine: `scripts/verify-round7-fix.js` and the end-to-end
  order both need a seeded Postgres, and the sandbox cannot host a second instance (`pg` child error 487).
  Step 6 of §2 is the first time a real order will be placed. Expect to find something.
- **`.env` history value is unconfirmed** — see step 1.
- **`meridiansupply.co` ownership is unconfirmed** — see D1; it is live and is not your deployment.
- **No CI check of the storefront suite** — CI runs typecheck, tests, mechanical gates and build, but the
  22-check shop suite needs a database and is not wired into the pipeline yet.
- **Backup/PITR status unverified** — nobody has tested a restore.
