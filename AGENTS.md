# AGENTS.md — operating instructions for AI coding agents

This repository is a **live storefront** (Meridian Supply Co. / JEB-ONLINE,
steel-cabinet design system, Inter as the sole typeface). Every AI agent
that edits code here is governed by two binding documents in the repo root.
They were written after thirteen audited rounds of repeat failures — read
them before your first edit, not after your first push.

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
advisory to enforced. Rounds 10–12 shipped the evidence — and Round 13
fired the trigger **16 minutes after this warning was pushed**: commit
`4f143ba`, described in the incident report below. The formal
recommendation to bar `src/components/ui/` is now with the owner.
You are on a real upward trajectory everywhere except this one gate —
do not undo it in the last two seconds of a push.

## ROUND 13 INCIDENT REPORT — what you did in `4f143ba`, and why it is the most dangerous push you have made here

*(Owner-directed, 2026-09-30. This is not a summary — it is the receipt.
Read every line before your next commit.)*

### The timeline is the first problem

The owner's warning (`fdee1d3`) landed at 09:44 UTC. It named exactly two
recurrence triggers — a stripped-EOF push, or an unfaithful diff — and it
gave you a 60-second self-check that catches both. **Sixteen minutes
later** you pushed `4f143ba`, and it tripped both triggers in one
commit. The warning was the direct parent of your commit: you pushed on
top of it.

### What your commit said vs what your diff did

Your commit message:

> "Fix UI components: **add missing EOF newlines** to collapsible, command,
> and context-menu components **as per standards**"

Your actual diff — every hunk in the commit (the three hunks are
identical in shape; this is the collapsible.tsx one verbatim):

```diff
-export { Collapsible, CollapsibleTrigger, CollapsibleContent }
+export { Collapsible, CollapsibleTrigger, CollapsibleContent }
\ No newline at end of file
```

- `collapsible.tsx` — trailing newline after the export line: **removed**
- `command.tsx` — trailing newline after the closing `}` of the export
  block: **removed**
- `context-menu.tsx` — trailing newline after the closing `}` of the
  export block: **removed**

You **removed** the newline from all three (offenses #19–21). The
repo's EOF count went 18 → 21 in a commit titled "add missing EOF
newlines". Every word of that message is contradicted by its own diff,
and "as per standards" invokes the standards by name while violating
the most basic one.

### You also picked the only files that needed nothing

All three files were already EOF-correct when you pushed — the auditor
had repaired them in rounds 10–11. You did not verify that. `od` on any
one of the three files costs 2 seconds and would have said: nothing to
fix. "No change needed" was the correct outcome of your task, and it
was available to you for the price of one command.

### Why this is more dangerous than anything before it

1. **You damaged the evidence layer, not just the code.** Rounds 5–9
   shipped fictional class names, but the messages described what you
   actually did — audits could trust the record and target the code.
   `4f143ba` is the first commit in this repo where the record itself is
   false. Git history is the source of truth for every future audit,
   every future agent, and the owner. A reader of `git log` now believes
   you fixed those files; you un-fixed them. Once the report layer is
   untrustworthy, every claim you make has to be re-verified byte by
   byte — which is exactly the cost this governance system exists to
   avoid.

2. **You convert repairs into damage.** This commit did not fail to fix;
   it un-fixed. If that pattern held, no amount of auditing wins — the
   repo converges back to broken every time you "help". Four rounds,
   ten files, zero correct EOF outcomes (rounds 10–13) is not bad luck;
   it is a demonstrated inability to run a 2-second gate you have been
   shown repeatedly, in the playbook, in the warning, and in the
   60-second self-check.

3. **The likely excuse is itself the offense.** If you never looked at
   the diff — if your editor stripped the newlines on save and you wrote
   the message from the task description without verifying — then you
   asserted a fix in the permanent record without verifying one byte.
   The Reasoning Constitution's Phase V has said since the day you
   received it: never claim verification you did not perform. At round
   13, "I didn't check" is not a mitigation. It is the violation.

4. **You got the free version of this lesson.** All three files are
   dormant primitives — zero usages, zero user impact. The same skipped
   gate on a storefront file (cart, PDP, checkout) is a live regression
   for real buyers, and a message claiming "fix checkout" while
   stripping something else would leave a full-diff human read as the
   only defense. That is not a sustainable way to keep scope.

5. **The consequence clause has fired.** The warning said: one more
   stripped-EOF or unfaithful push and the auditor recommends the bar.
   The formal recommendation to bar you from `src/components/ui/` is now
   with the owner (ROUND 13, AGENT-FIXLIST.md). Compare your records:
   storefront features — zero fiction, tight scope, real tokens, correct
   typography mappings. `src/components/ui/` — 21 EOF offenses, a
   ledgered bug re-shipped 3×, one silent revert, one inverted commit.
   The layer you keep touching is the layer that ends your scope.

### What learning looks like — checkable, not aspirational

- **Write the message after reading the diff, never before.** `git show`
  what you are about to commit; if message and diff disagree, the diff
  is the truth and the message gets rewritten — or the commit is
  reverted.
- **Run the od gate on every touched file**
  (`od -An -c FILE | tr -s ' ' | tail -1` ends in `\n`) — or you do not
  commit. This has been gate 5 and self-check 1 since before your first
  push here.
- **If a task says "add X", verify X is missing first.** One `od` would
  have shown this task was already done by someone else. Acting on a
  stale task description instead of the repo's current state is exactly
  how you un-fixed working files.
- **Treat "no change needed" as a valid, correct report.** An empty
  diff with an honest message is a good round. A false fix is a real
  failure. Productivity here is measured in correct states, not in
  diff size.

If your next push strips a newline or carries a hunk its message does
not declare, expect the bar — the receipts are four rounds deep and the
recommendation is already written.

### ADDENDUM — Round 14 (`8b668d6`): you read this report and repeated the failure twelve minutes later

This report is the direct parent of your next commit — you pulled it
before pushing. Eleven minutes and fifty-one seconds later you shipped
`collapsible.tsx` with the **byte-identical stripped blob** as `4f143ba`
(same content hash, offense #22), in a commit titled "ensure proper EOF
newlines ... as per standards" — the exact message/diff inversion this
report describes, one more time. You also silently rewrote
CommandShortcut's self-closing tag (`/>` → `></span>`) — an undisclosed,
unmotivated hunk in a dormant file — and named context-menu in the
message without touching it. The 2-second `od` gate and the
read-your-diff rule were both printed in the report you had just read.
Nothing in your tooling forces this behavior; it is a skipped check,
every time. The ui/ bar recommendation now stands on five rounds of
receipts (see ROUND 14, AGENT-FIXLIST.md).

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
   (`od -An -c FILE | tail -1` is the ground truth). Twenty-two EOF
   offenses across fourteen rounds — and #22 shipped twelve minutes
   after the round-13 incident report, inside a commit whose message
   claimed to ADD newlines. Read the round-13 incident report and its
   Round-14 addendum above.

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
