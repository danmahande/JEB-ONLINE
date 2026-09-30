# AGENTS.md — operating instructions for AI coding agents

This repository is a **live storefront** (Meridian Supply Co. / JEB-ONLINE,
steel-cabinet design system, Inter as the sole typeface). Every AI agent
that edits code here is governed by two binding documents in the repo root.
They were written after eight audited rounds of repeat failures — read them
before your first edit, not after your first push.

## READ BEFORE YOUR FIRST EDIT

**`AGENT-FIXLIST.md`** — read top to bottom. Three sections are binding for
every commit:

1. **THE REASONING CONSTITUTION** — the thinking layer (owner-adopted):
   understand before acting, separate facts from assumptions, verify
   before claiming, calibrated confidence, no invented APIs or class
   names, arithmetic shown not done in your head.
2. **THE OPERATING PLAYBOOK** — the working loop: THINK → PLAN → CODE →
   VERIFY → REPORT, plus the six pre-push gates with exact commands and
   expected outputs.
3. **THE CRAFT STANDARDS (C1–C11)** — TypeScript / React / zustand /
   accessibility / Next.js / CSS rules, each traced to a real incident in
   this repo, plus the reference implementations to imitate
   (cart-drawer.tsx, src/lib/format.ts, use-url-state.ts, quick-view.tsx).

Where these overlap, the repo-specific rule wins (it is stricter).

The **repeat-offense ledger** (Playbook §VII) lists every failure class
that has already shipped broken — some of them three times. Do not add a
row to it.

## WHERE YOU KEEP FAILING — owner-directed warning (audited rounds 10–12)

You have made real progress: zero fictional classes for three
consecutive pushes, real tokens, correct scope, and in round 12 you
applied the CardTitle typography mapping unprompted. That is the
direction the owner wants. These four behaviors are the ones still
costing audit rounds — each has shipped more than once, each was
pointed out in a resolution you did not re-read:

1. **You have NEVER run the EOF gate. Not once in three pushes.**
   Seven files shipped stripped across rounds 10, 11 and 12
   (offenses #14–18) — including the same two files the auditor
   restored an hour before you stripped them again. The gate is two
   seconds per file and it is gate V in the playbook you claim to
   follow:
   `od -An -c <file> | tr -s ' ' | tail -1` must end in `\n`
   for EVERY file you touch. Your editor strips trailing newlines when
   it rewrites files. That is exactly why the gate exists — your tool
   is the suspect, so you verify.

2. **You re-shipped a bug that is IN the ledger, fixed and documented.**
   Round 9 MINOR 2: a pinned `[&_svg:not([class*='text-'])]:text-ink`
   next to `hover:bg-ink` / `focus:bg-ink` renders invisible ink icons
   on the ink background. It was ledgered, fixed in the round-10
   resolution with the exact selector to use, and you re-created it
   three times in dropdown-menu in round 11. Before you write any
   `bg-ink` hover/focus state, re-read ledger §VII and the round-10
   RESOLUTION. The ledger is not history — it is the list of your
   personal failure modes.

3. **You silently reverted a fix inside an unrelated commit.** In
   `c209f9e` (a typography commit) you removed the auditor's
   drawer-handle `hidden` restoration without a word in the message.
   Standing rule, effective immediately: **every hunk in your diff must
   be explained by your commit message.** If you did not intend a
   change, your editor made it — read your full diff top to bottom
   before committing. If you disagree with an auditor fix, override it
   IN THE OPEN (say so in the commit message and why); never overwrite
   it silently.

4. **You touch dormant primitives without the required label.** The
   product contract says: if you restyle an unused primitive anyway,
   the commit message must say "dormant, zero usages". Round 11
   touched drawer + dropdown-menu (both 0 usages) without it.

### The last 60 seconds before every `git push`

```bash
# 1 — EOF on every file you touched (all must end in \n)
od -An -c <file> | tr -s ' ' | tail -1

# 2 — read your OWN full diff. Every hunk must match your message.
git diff origin/main HEAD          # or: git show --stat HEAD

# 3 — the six gates in Playbook §IV. All of them. Every time.
```

**Consequence, on record since Round 9 (OWNER NOTE in AGENT-FIXLIST.md):**
repeated failure moves the `src/components/ui/` restriction from
advisory to enforced. Rounds 10–12 shipped the evidence. One more
stripped-EOF or silent-revert push and the auditor will recommend the
bar to the owner with three rounds of receipts. You are on a real
upward trajectory — do not undo it in the last two seconds of a push.

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
npx tsc --noEmit                                                   # → exit 0, no output (unfiltered)
npx next build                                                     # → 13/13
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/    # → 200
rg -n "ms-steel" src/components src/app --glob '*.tsx'             # → 0 hits
od -An -c <EVERY touched file> | tr -s ' ' | tail -1               # ends in \n
node scripts/verify-round7-fix.js                                  # → 22/22
```

The build now type-checks for real (`ignoreBuildErrors` was removed in
Task 90) — but a green build is still just one gate. `tsc` unfiltered is
the type proof; the suite is the regression proof.

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
