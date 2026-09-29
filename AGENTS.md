# AGENTS.md — operating instructions for AI coding agents

This repository is a **live storefront** (Meridian Supply Co. / JEB-ONLINE,
steel-cabinet design system, Inter as the sole typeface). Every AI agent
that edits code here is governed by two binding documents in the repo root.
They were written after eight audited rounds of repeat failures — read them
before your first edit, not after your first push.

## READ BEFORE YOUR FIRST EDIT

**`AGENT-FIXLIST.md`** — read top to bottom. Two sections are binding for
every commit:

1. **THE OPERATING PLAYBOOK** — the working loop: THINK → PLAN → CODE →
   VERIFY → REPORT, plus the six pre-push gates with exact commands and
   expected outputs.
2. **THE CRAFT STANDARDS (C1–C11)** — TypeScript / React / zustand /
   accessibility / Next.js / CSS rules, each traced to a real incident in
   this repo, plus the reference implementations to imitate
   (cart-drawer.tsx, src/lib/format.ts, use-url-state.ts, quick-view.tsx).

The **repeat-offense ledger** (Playbook §VII) lists every failure class
that has already shipped broken — some of them three times. Do not add a
row to it.

## THE THREE NON-NEGOTIABLES (the ones that keep recurring)

1. **A class name that is not in `src/app/globals.css` renders nothing.**
   Before writing ANY `.ms-*` class in JSX,
   `rg -n "^\.ms-your-class" src/app/globals.css` must HIT.
   `ms-steel-face` / `ms-steel-bevels` are CSS **variables**
   (consumed by `.ms-tile::after`), not classes — they have shipped as
   fictional class names in THREE consecutive rounds (7, 8 and 9; 16 more
   tokens in round 9). Ten seconds of grep prevents a tenth audit round.

2. **Unlayered primitives beat layered Tailwind utilities.** `.ms-label`
   (globals.css:228 — 10px / 700 / 0.14em / uppercase) silently kills
   `text-xs`, `text-sm`, `font-medium` and `tracking-widest` on the same
   element. `.ms-key` box-shadows eat `ring-*` focus rings. Check Playbook
   Rule 2 and the Rule 3 typography table before combining any of them.

3. **Every file you touch ends with exactly one trailing newline**
   (`od -An -c FILE | tail -1` is the ground truth). Thirteen EOF
   offenses across nine rounds so far.

## BEFORE EVERY PUSH — the six gates (Playbook §IV)

```bash
npx tsc --noEmit 2>&1 | grep -v "^skills/" | grep -c "error TS"   # → 0
npx next build                                                     # → 13/13
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/    # → 200
rg -n "ms-steel" src/components src/app --glob '*.tsx'             # → 0 hits
od -An -c <EVERY touched file> | tr -s ' ' | tail -1               # ends in \n
node scripts/verify-round7-fix.js                                  # → 22/22
```

`tsc` is the only type proof — `next.config` sets `ignoreBuildErrors: true`,
so a green build proves nothing about types.

Report format (Playbook §V): files changed / verified (with outputs) /
NOT verified. Every claim maps to a command you ran **this session**.

## PRODUCT CONTRACT (owner-locked — do not redesign)

- **One action per catalog tile:** ADD TO CART → quick-view sheet →
  pack + qty → the sheet's ADD TO CART → drawer. Sold-out keeps
  NOTIFY ME. No direct-add, no Buy Now, no second action button.
- **One search only:** the persistent header channel (`.ms-hsearch`).
  The hero search is RETIRED — do not restore it.
- **Inter is the only typeface** — `Inter({ subsets: ["latin"],
  variable: "--font-body", display: "swap" })`, no weight pin (an 800 is
  used by `.ms-weight-toggle` / `.ms-chip`).
- Dormant shadcn primitives (`card`, `carousel`, `checkbox`, `chart`,
  `collapsible`, `command`, `context-menu`, `avatar`, `badge`,
  `alert-dialog`) are **unused** by the storefront. Do not restyle them
  without an owner request — ten rounds of that churn shipped zero user
  value. If you touch one anyway, say "dormant, zero usages" in the
  commit message.
