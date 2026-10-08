# Admin Dashboard Evaluation — UI, Flow, Functionality, Usability

**Reviewed:** 8 Oct 2026 · `main` @ `8bf191c` · static code review (three independent passes: inventory/functionality, UI+a11y, workflow analysis) plus live probes of `/admin`, `/admin/login` and `/api/admin/orders`.

**One-line verdict:** the admin is honest, transactionally sound and visually coherent — order intake, stock integrity, status walking, customer tracking and the stock ledger all work and are verified. But it manages a no-payment-gateway store with **zero support for the one activity that defines a no-payment-gateway store: knowing who has paid.** And there is no way to record a real waybill — the tracking number your customers see is generated at checkout as `TRK-DS100001-UG` (`src/app/api/orders/route.ts:368`) and no admin surface can ever replace it.

---

## The two findings that bite daily (verified line-by-line)

### H1 — A half-typed note publishes itself to the customer on "Mark shipped"

`admin-order-detail.tsx:147` sends `note: noteDraft.trim() || undefined` for **all three** actions. The server confirms the consequence: on `advance`, the typed note becomes the public tracking event (`api/admin/orders/[orderNumber]/route.ts:169` — `note ?? "Status advanced…"`) **and** goes into the customer's status email (`:176`). The note textarea ("Note for the customer", `:251`) sits in the same card as "Start processing" / "Mark shipped" / "Cancel order".

**Failure mode:** owner types a half-finished note, then clicks "Mark shipped" without pressing "Attach note" first — the draft publishes to the customer's email and public tracking history. OrderEvents are append-only; there is no undo.

**Fix:** send `note` only on the `"note"` action.

### H2 — Session expiry destroys a fully-typed product draft

`admin-products.tsx:328` (same pattern `:430`, and order detail `:151`): on 401, `router.replace("/admin/login")` runs instantly and silently. The `draft` — ~15 fields + variants + description + an uploaded image — is discarded. No precheck, no interstitial, no draft persistence anywhere in the file.

**Failure mode:** the 8-hour session expires while the owner fills the product form; they discover it only after clicking Save. Total loss, repeated daily for any long-lived tab.

**Fix:** persist the draft to `sessionStorage` per product id, or show "Session expired — your draft is preserved, sign in to resume" instead of an immediate redirect.

---

## Functionality: what the workflow requires and the dashboard does not have

Ranked by pain for a ~20-orders/day owner:

1. **No payment state at all.** `paymentMethod` is a display string; there is no paid/unpaid field, action, filter or event. "Who has actually sent money?" is unanswerable. The workarounds each fail: the note field is **public** on tracking; "Start processing" emails the customer that the warehouse started (so using it as a "paid" marker lies); leaving an unpaid order in NEW pollutes the one queue you triage. There is no abandoned/unpaid state and no refund handling because there is no payment record to refund against. The buyer who paid Tuesday cannot see that you registered it — **both sides of the money loop are blind.**
2. **No dispatch capture.** No waybill/parcels/dispatch-date field anywhere (verified: the only "tracking" matches in admin code are CSS letter-spacing classes). Real dispatch knowledge lives in the owner's head or in public notes.
3. **No new-order signal.** Email alert only if `ownerAlertAddress()` is configured; no badge, no poll. And `/admin` has **no dashboard** — it redirects straight to `/admin/products` (`admin/page.tsx:6-7`), so the owner's day starts in the wrong room.
4. **No pack slip / print view.** Manual dispatch means copying addresses and receiver phones off a screen; `receiverPhone` is plain text, no `tel:`/`mailto:` links.
5. **No order editing after placement** — wrong qty, wrong receiver phone, negotiated price: nothing can be corrected, only annotated publicly.
6. **No export** — reconciling MoMo/M-Pesa/bank statements against orders means manual transcription.
7. **Customer cancellation is invisible** — the customer can self-cancel while `new_order` (restocks transactionally, correctly), but no email or signal reaches the owner; they discover it as a chip count.
8. Minor: **`returned` status is unreachable** — `NEXT_STATUS` (`order-workflow.ts:20-24`) has no transition into it and no API path sets it; the RETURNED filter chip will read (0) forever. Orders search fires a DB query per keystroke (no debounce; AbortController prevents staleness, not load).

What exists and works well (verified): order search by customer name/number, live status counts, server-side pagination (25/page with correct bounds), transactional stock ledger with reasons, low-stock and SOLD OUT badges, customer self-cancel, status emails, NOTIFY ME auto-release on restock, login rate limiting, 401 on unauth APIs (probed live).

---

## UI and usability findings (from the a11y pass; 2 high, 6 medium, 5 low)

**Medium:**
- **M1** — Orders search: one server query per keystroke, no debounce (`admin-orders.tsx:182→94`). 12-character search = 12 DB queries.
- **M2** — Operators create/edit are bare `<div>`s, not `<form>`s — **Enter key does nothing** (`admin-operators.tsx:513`, `:327`). Products and login do this correctly.
- **M3** — "Cancel edit" discards a 15-field draft with no confirmation when dirty (`admin-products.tsx:239-243`).
- **M4** — Hide/Publish toggles have no pending state; double-clicking or clicking Edit mid-flight is possible (`admin-products.tsx:1000`, `admin-operators.tsx:371`).
- **M5** — Focus indicator on five textareas/selects is downgraded to a 1px border-colour swap via `focus-visible:outline-none` (`admin-order-detail.tsx:254`, `admin-products.tsx:568,838,893,1080`), suppressing the repo's own 2px global outline (`globals.css:206-209`).
- **M6** — Stock adjustment applies immediately with no resulting-stock preview and no confirmation; a typo'd `-500` (vs `-50`) writes an irreversible ledger movement (`admin-products.tsx:409-440`).

**Low:** a failed movements fetch renders the false empty state "No stock movements recorded yet" (`:396-406`); order history shows raw `new_order → processing` snake_case while the list uses friendly labels (`admin-order-detail.tsx:357`); line items omit unit price so the owner can't sanity-check without arithmetic; success notices auto-clear after 4s and overlap; status buttons keep their label when busy ("Start processing" stays static, unlike products' "Saving...").

**Genuinely good (verified, and worth not breaking):** no icon-only buttons; every field labelled including sr-only search labels; status is text+colour never colour-only; `aria-pressed` filters, `aria-expanded` form toggle, focus moves to the form heading on open, `aria-current` nav; the admin **reuses the storefront design system** (`ink/hush/line/mist/brand` tokens, Inter) rather than a shadcn default look; muted text ≈4.7:1 (AA pass); typed values are preserved on failed saves everywhere tested; errors are inline `role="alert"`.

---

## Day-in-the-life (click counts)

| Task | Path | Cost | Note |
|---|---|---|---|
| Advance + dispatch an order | Orders → order → Start processing → Mark shipped → Mark delivered | 2 screens, 5 clicks | but **cannot enter a real waybill** |
| Restock a product | Products → Stock → delta+reason → Apply | 3 clicks | best flow in the admin; auto-emails NOTIFY ME |
| Change one price | Products → Edit → scroll ~20-field form → Save | 3 interactions | one-field change routes the whole form |
| New product with image | Add → ~10 fields → crop → upload → save | ~15 interactions | no draft persistence; a distraction loses everything |
| Customer cancels | — | 0 owner clicks | and **0 owner awareness** — no notification |

---

## Verdict and the fix list

**Sufficient for launch day on the happy path; not honest on the money loop.** The order pipeline will not lose or corrupt anything — but "who has paid" is invisible, and the customer-facing tracking number is fiction.

**Fix before real orders, in this order:**
1. **Payment-received record** on the order: owner-only action (method, reference, date) → paid/unpaid flag on the orders list, ideally gating "Start processing". Schema addition + small UI; the single highest-value change.
2. **Waybill entry** at "Mark shipped" (a field that replaces the generated `TRK-…` string the customer sees).
3. **H1 note leak** — one-line client fix.
4. **`/admin` home = an orders dashboard**: NEW orders split paid/unpaid (the counts already exist server-side behind the filter chips), plus low-stock. The owner's day should start in the room their work is in.
5. **H2 draft preservation** on 401.
6. M2 (Enter key), M3 (dirty-draft confirm), M6 (stock preview) — small, mechanical.
7. Customer-cancel notification email to the owner.

**Deliberately deferred:** bulk stock ops, CSV export, order editing, reopening terminal orders, print views — real needs at scale, none blocks 20 orders/day.
