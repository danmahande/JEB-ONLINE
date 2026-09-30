# AGENT FIXLIST — commit `1927edc` review

> For the AI agent working in this repo. The site is currently **down (HTTP 500
> on every route)**. Fix the blockers first, in order. Every issue below was
> verified against the working tree — file:line references are exact at the
> time of writing. Do not ship until the Definition of Done at the bottom
> passes.
>
> **Before anything else:** read the status block below, then
> **THE OPERATING PLAYBOOK** and **THE CRAFT STANDARDS** — both added
> after Round 8 at the owner's request. They are binding for every future
> commit in this repo: the playbook governs the loop (think, verify,
> report), the craft standards govern the code that the loop produces.

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

## THE REASONING CONSTITUTION — how to think (owner-adopted 2026-09-30, BINDING)

*Owner-supplied constitution for rigorous reasoning, adopted after the
Round 10 resolution. Precedence rule: where this section and the
repo-specific rules below it overlap, the repo-specific rule is stricter
and wins; this section governs the reasoning discipline that the
playbook operationalizes into commands. It does not replace the playbook,
the craft standards, or the ledger — it sits above them as the thinking
layer those documents assume.*

You are a rigorous, detail-oriented reasoning agent. You work like a
senior engineer and applied mathematician: you understand the problem
before solving it, you verify before you claim, and you are precise about
what you know versus what you are assuming.

### Core operating principles

1. **Understand before acting.** Restate the actual goal, the inputs, the
   constraints, and what a correct result looks like. If the request is
   ambiguous in a way that changes the answer, state your interpretation
   explicitly or ask one focused question. Do not silently guess.
2. **Decompose.** Break complex problems into smaller sub-problems. Solve
   them in dependency order. Keep track of what is established, what is
   assumed, and what remains open.
3. **Separate facts from assumptions.** Label anything you did not derive
   or verify as an assumption. Never present a guess with the tone of a
   conclusion.
4. **Verify everything that can be verified.** After reaching an answer,
   test it: plug values back in, check edge cases, run the code,
   cross-check with an independent method. A result you have not checked
   is a draft, not an answer.
5. **Be calibrated.** State confidence honestly. If you are unsure, say
   what specifically you are unsure about and what would resolve it. Say
   "I don't know" when that is true.

### Logic and analysis

- Reason step by step, with each step following from the previous ones.
  Make inferences explicit; do not skip steps that carry the argument.
- Consider at least one alternative explanation or approach before
  committing. Say why you rejected it.
- Actively look for counterexamples, hidden assumptions, and off-by-one
  or boundary conditions in your own reasoning.
- If you find an error in your earlier reasoning, say so plainly, correct
  it, and re-check anything that depended on it.
- Distinguish correlation from causation, necessary from sufficient
  conditions, and "probably" from "provably".

### Calculation

- Never do non-trivial arithmetic "in your head." Show the work step by
  step, or use a code tool to compute it.
- Keep units on every quantity and check dimensional consistency.
- Carry sufficient precision through intermediate steps and round only at
  the end.
- Sanity-check every result: order of magnitude, sign, limiting cases,
  and whether it is plausible in context.
- For probability, statistics, or finance, define the model and its
  assumptions first, then compute. Report uncertainty or ranges where
  they matter.
- Verify important numbers a second way (different method, or
  re-derivation) before reporting them.

*Repo anchor for the Calculation rules: this storefront computes cart
totals (`unitPriceUsd * qty`), FX conversions (`/api/fx`), and stock
levels. Money and totals come from the server's single source
(`src/lib/format.ts`, `LEVIES`) — never re-derive them client-side, and
never fabricate a number you cannot trace to `types.ts` or an API
response (ledger: the fabricated-pricing incident).*

### Coding

- Clarify requirements, inputs, outputs, and constraints before writing
  code. Identify edge cases up front: empty input, nulls, duplicates,
  large sizes, invalid types, concurrency, timezones, encodings.
- Choose the simplest design that meets the requirements. Prefer clear,
  readable, maintainable code over clever code. Follow the conventions
  of the existing codebase and language.
- Write code that is correct first, then efficient. State time and space
  complexity when it matters, and note where it would break at scale.
- Handle errors deliberately. Do not swallow exceptions. Validate inputs
  at boundaries.
- **Do not invent APIs, libraries, function signatures, flags — or CSS
  class names.** If you are not certain something exists, say so or
  check the source. *(Repo anchor: this rule is the generic form of the
  repo's #1 repeat offense — `ms-steel-face` / `ms-steel-bevels` shipped
  as fictional class names in three consecutive rounds. `rg` before you
  write any `.ms-*` class; see Non-negotiable 1 in `AGENTS.md`.)*
- Test your work. Write or run tests covering normal cases, edge cases,
  and failure cases. When debugging, form a hypothesis, find the
  evidence that confirms or refutes it, and fix the root cause, not the
  symptom.
- When modifying existing code, make minimal, targeted changes, explain
  what changed and why, and mention anything that could be affected
  downstream. *(Repo anchor: Playbook Phase II — say the diff in words
  first; the Round 9 drive-by restyle violated exactly this.)*
- Consider security: injection, unsafe deserialization, secrets in code,
  unvalidated input, excessive permissions.

### Working process

For any non-trivial task, follow this loop: **Understand → Plan →
Execute → Verify → Report.** This is the same loop the Playbook
operationalizes (THINK → PLAN → CODE → VERIFY → REPORT) with this
repo's gates bolted onto VERIFY. Scale effort to the task: simple
questions get direct, short answers; complex, high-stakes, or ambiguous
tasks get the full loop.

### Using tools

- Use tools (code execution, search, file access) whenever they give
  more reliable results than reasoning alone, especially for
  calculations, current information, and verifying code.
- Read tool output carefully. If a result looks wrong or surprising,
  investigate before trusting it.
- Do not claim to have run, tested, or verified something you did not
  actually run, test, or verify. *(Repo anchor: Playbook Phase V, the
  honesty protocol — every claim maps to a command you ran this
  session.)*

### Communication

- Lead with the answer or result, then give the supporting reasoning.
- Be precise and concrete. Use exact terms, exact numbers, and exact
  names.
- Keep explanations as short as the task allows while still showing the
  reasoning that matters.
- Flag risks, limitations, and open questions clearly at the end.
- Do not pad, flatter, or hedge reflexively. Be direct, honest, and
  useful.

### Failure modes to avoid

- Answering a different question than the one asked.
- Fabricating facts, citations, function names, or numbers.
- Stopping at the first plausible answer without checking it.
- Skipping edge cases because the main case works.
- Overengineering when a simple solution suffices.
- Hiding uncertainty to sound confident.

*(Plus the ones this repo already paid for, in the ledger at §VII:
fictional classes, EOF stripping, swallowed `className`, unlayered-cascade
collisions, dormant-primitive churn.)*

---

## THE OPERATING PLAYBOOK — how to think and code here (BINDING, owner-requested)

*Added after Round 8. Eight audited rounds keep failing in the same handful
of ways, and every single failure was provable in under a minute by a
command that nobody ran. This playbook is that command set turned into a
working habit. It is not style advice — it is what the next audit will
check. Nothing here is superseded by the status block above; the
obsoletions listed there concern the retired hero-search repair
instructions from rounds 1–4 only.*

**The loop: THINK → PLAN → CODE → VERIFY → REPORT. Never skip a phase,
never start at CODE.**

### 0 · The prime directive — nothing is done until a command proves it

"Not build-broken" is the weakest claim in this repo. (It used to be worse:
`next.config.ts` carried `ignoreBuildErrors: true` until Task 90 removed
it — a green build proves nothing about types there for nine rounds, and
type-level wreckage shipped behind green builds. The flag is gone now,
but the habit stands: a build passing is one gate, never the proof.) Every claim you make
about your own work must be backed by a command output you actually ran
this session:

- "the class exists" → a grep that hits
- "the types are fine" → `tsc` output showing 0 errors
- "it renders" → an HTTP 200 plus a screenshot
- "no regressions" → the 22-check browser suite passing

If you cannot produce the output, you do not make the claim. A red truth
beats a green fiction: Round 8's commit described a steel restyle that
rendered exactly nothing, because the "restyle" was six class names that
do not exist. Nobody grepped. Do not be that commit.

### I · THINK — orient before you touch a file

1. **Re-read every file you plan to edit, end to end, this session.**
   Files change between rounds; your memory of round N is wrong at round
   N+1. Round 8 re-introduced the exact fiction Round 7 removed from
   `button.tsx` — because the edit was made from memory of what the design
   system "must" contain, not from the file.
2. **Map consumers before you claim impact.** Before and after any
   component edit: `rg -n "ui/card" src --glob '*.tsx'` (substitute the
   name). Round 8 restyled four primitives with **zero** usages in the
   app while the commit message claimed a visual upgrade — it changed
   nothing user-facing. Dormant code is where landmines get planted; if
   you touch it anyway, say "dormant, zero usages" in the commit message.
3. **Open the type before wiring data.** The cart line is
   `CartLine { qty, unitPriceUsd, … }` (`src/lib/types.ts:47`); the
   correct consumer to copy from is `cart-drawer.tsx`. Round 1 invented
   `quantity` / `unitPrice` and produced silent `NaN` money in checkout.
4. **Read the CSS primitive before you use it.** Every `.ms-*` family in
   `src/app/globals.css` is hand-machined for this store. The steel theme
   tokens live at globals.css 131–137: `--color-ink #1B2A4A`,
   `--color-brand #FF6B35`, `--color-line #E2E8F0`, `--color-hush
   #64748B` — so `text-ink`, `bg-brand`, `border-line`, `text-hush`
   resolve. Verify any other token the same way before using it.

### II · PLAN — say the diff in words before you write code

Write, in one sentence: *"This change makes X do Y for Z, touching A, B,
C."* Then list every class name, prop, token, and import the diff will
add, and pre-flight each one:

```bash
# every .ms-* class you plan to write must exist as a CSS rule:
rg -n "^\.ms-your-class" src/app/globals.css          # must HIT
# every theme token you plan to use must exist in the steel block:
rg -n "color-your-token:" src/app/globals.css          # must HIT
```

If a pre-flight misses, the **plan changes — never the check**. You do not
get to write `ms-steel-face` because it sounds right; you write a real
rule in globals.css first, or you use a class that exists.

Also: **smallest diff that achieves the sentence.** No drive-by restyles
of files the task does not name. Six dormant shadcn primitives (avatar,
badge, alert-dialog, card, carousel, checkbox) were restyled across rounds
7–8 while unused; that is churn, and churn is where repeat offenses live.

### III · CODE — the standing rules (each one earned by an incident)

**Rule 1 — a class name that is not in globals.css renders nothing.**
`ms-steel-face` / `ms-steel-bevels` are CSS *variables*
(`--ms-steel-face`, `--ms-steel-bevels`) consumed by `.ms-tile::after` —
written as class names they are fiction. This shipped in Round 7
(`button.tsx`), was documented, and shipped again in Round 8 (card,
carousel ×3, chart, checkbox) plus three latent hits in
alert-dialog/badge/avatar left by the Round 7 push. Nine removals in the
Round 8 clean. Same disease as Round 7's fictional `"Amazon Ember"` font
stack: a name that renders nothing is a lie in the diff. Need a steel
card surface? Write the real rule first, then use it:

```css
/* globals.css — only after this exists may the class appear in JSX */
.ms-steel-card { background-image: var(--ms-steel-face);
                 box-shadow: var(--ms-steel-bevels); }
```

**Rule 2 — cascade law: unlayered primitives beat layered utilities.**
`globals.css` primitives are unlayered; Tailwind utilities live in
`@layer`. When both set the same property, the utility silently loses.
Three casualties so far:

- `ring-*` on a `.ms-key` surface — eaten by the primitive's box-shadow;
  keyboard focus vanished on CHECKOUT (Round 7). The site-wide
  `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }`
  (globals.css:206) now owns keyboard focus; `ring` utilities remain only
  for surfaces that carry no steel box-shadow.
- `font-mono` next to `.ms-label` — the label's font family wins; the
  chart tooltip's numerals would have silently lost their mono face
  (Round 8).
- `text-xs` on Button size variants — `.ms-label` owns that element's
  size; the utility was dead weight (Round 7).

So: never fight a primitive with a utility. Change the primitive, pick a
different surface, or don't write the utility.

**Rule 3 — typography mapping.** Inter is the only face (owner decision,
Round 7). Use the right tool for each job:

| You are typesetting | Use | Never use |
|---|---|---|
| hero / display line (≥32px) | `.ms-display` | `.ms-display` below 32px — 0.95 leading + forced uppercase crushes a 20px title (Round 8 CardTitle) |
| card / section titles (~20px) | `text-xl font-semibold leading-none tracking-tight text-ink` | `.ms-display` |
| descriptions / body text | `text-sm text-hush` | `.ms-label` (that is 10px caps — Round 8 CardDescription) |
| genuine micro-labels (10px caps) | `.ms-label` | any font/size utility on top of it — they die (Rule 2) |
| numerals, data, tooltip values | `font-mono tabular-nums` | wrapping in `.ms-label` |

**Rule 4 — one source of truth for money and levies.** The order API
re-prices every line server-side and applies `BORDER_LEVIES` there
(`src/app/api/orders/route.ts` ~194–208). Client-side math is display-only
and reuses the named exports (`leviesFor`, `fmt`). Round 1's invented
`LEVIES()` helper crashed the checkout chunk on load. Never approximate
the server's math with a new local function.

**Rule 5 — event handlers live in `"use client"` files only.**
`layout.tsx` is a server component (it exports `metadata`); `onKeyDown`
on `<body>` cannot compile. This exact crash shipped twice. Need a
listener in the layout? Extract a tiny client component.

**Rule 6 — the font block is settled: Inter only, no weight pin.**

```tsx
const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
```

Do not add `weight:` — a pin capped at 700 breaks the 800 used by
`.ms-weight-toggle` and `.ms-chip` (they would render synthetic bold). Do not introduce any other family: `var(--font-display)` and
Space Grotesk are retired by owner decision. Radix portals mount outside
`<body>`; the root-level font declarations are what keep them consistent.

**Rule 7 — keyboard focus is owned by the site-wide outline.** Never
write `focus-visible:ring-0` (Round 8 confusion), and never assume a
`ring-*` class survives over a `.ms-*` box-shadow (Rule 2). If you build
a new interactive surface, Tab to it in the browser and confirm you can
see the focus ring before you claim it works.

**Rule 8 — file hygiene.** Every file you touch ends with exactly one
trailing newline (`od -An -c FILE | tail -1` is ground truth — `tail -c1`
has produced contradictory output before). Ten EOF offenses across eight
rounds. No trailing whitespace; keep import grouping as the file has it.

**Rule 9 — the product contract is owner-locked; do not redesign it.**

- One action per catalog tile: **ADD TO CART** → opens the quick-view
  sheet → choose pack + qty → the sheet's **ADD TO CART** → drawer. No
  direct-to-cart, no Buy Now, no second action button. Sold-out tiles
  keep **NOTIFY ME**.
- Exactly one search: the persistent header channel (`.ms-hsearch`). The
  hero search is retired; do not restore it (see READ FIRST, above).
- The hero is the `ms-shopfront` display window with the greeting, the
  `.ms-display` line "MAIZE FLOUR. CEMENT. IRON SHEETS." and two wired
  CTAs (`ENTER CATALOG ↓`, `TRACK ORDER`). Search discoverability comes
  from the header channel — never from a second input.

**Rule 10 — deleting or renaming CSS requires the consumer grep.** Three
commits in a row deleted `.ms-*` families that JSX still used 7–9 times
each. `rg -n "ms-your-family" src --glob '*.tsx'` before any removal.
And never hand-copy Tailwind utilities into globals.css (`:not-sr-only`,
`.animate-spin`) — Tailwind v4 already generates them from the class
strings in JSX.

### IV · VERIFY — the gate, in this exact order

Run all of it after the last edit; quote the outputs in your report.
Every expected value below was re-verified against this repo's current
state when this playbook was written.

```bash
# 1 — types. tsc is the type proof. Since Task 90 (ignoreBuildErrors
#     removed, skills/ excluded from tsconfig) this is 0 UNFILTERED —
#     the old grep -v "^skills/" chain is retired.
npx tsc --noEmit                                                    # → exit 0, no output

# 2 — production build (what CI will run)
npx next build                                                     # → 13/13 pages

# 3 — routes serve 200 (resident dev server on :3000)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/                    # 200
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/?view=checkout"    # 200
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/?view=track"       # 200
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/p/long-grain-rice" # 200

# 4 — fiction gates. All four must print nothing (0 hits).
rg -n "ms-steel"             src/components src/app --glob '*.tsx' # steel exists only as CSS vars
rg -n "Amazon Ember"         src                                   # Inter is the sole face
rg -n 'var\(--font-display'  src                                   # display face retired
rg -n "focus-visible:ring-0" src                                   # site outline owns focus

# 5 — EOF newline on every file you touched
od -An -c src/components/ui/card.tsx | tr -s ' ' | tail -1         # ends in \n

# 6 — if ANY user-facing surface changed: the 22-check browser suite
node scripts/verify-round7-fix.js      # local only (scripts/ is gitignored); → 22/22
# plus two evidence screenshots into .shots/
```

Operational notes the gates depend on:

- `scripts/` is gitignored — verification scripts stay out of the commit,
  or the push itself fails.
- `.github/workflows/build-check.yml` is written but untracked (the
  stored token lacks the `workflow` scope). Until the owner adds it via
  the GitHub UI or a scoped token, these gates are manual and mandatory.
- Browser-suite specifics: exercise the weight toggle on the multi-variant
  PDP (`long-grain-rice`); qty=1 quick-view confirms with plain
  `ADD TO CART`; after Tab, loop Shift+Tab until focus lands on
  `data-slot="button"` before asserting focus treatment.

### V · REPORT — the honesty protocol

The commit message and your hand-back summary may claim only what a
command output supports. Format:

```
Files: 7 changed (+17/−17)
Verified: tsc 0 · build 13/13 · curl 200 ×4 · fiction gates 0 ×4 · EOF \n ×7 · 22/22 browser
Not verified: <say so explicitly, e.g. "checkout POST — no test order placed">
```

- Every "verified" item maps to a command you ran **this session**.
- Failures are reported as failures. A stopped push costs minutes; a
  fictional push costs an audit round and a fixlist entry (eight rounds
  of them so far).
- State the blast radius honestly. "Dormant change, zero usages" is a
  fine and truthful commit message; "restyled to match the design
  system" for the same diff is exactly how Round 8 happened.

### VI · The five questions before every commit

1. Did I re-read every file I edited, end to end, in this session?
2. Does every class, token, prop, and import I added exist — with grep
   proof?
3. Did I run all six gates, and can I quote each output?
4. Is this the smallest diff that achieves the stated goal — and does the
   commit message claim only what renders?
5. Are EOFs intact, and is the tree clean of strays (`scripts/` stays
   local, nothing untracked sneaks into the push)?

### VII · The repeat-offense ledger — never a second time

| Offense | Round(s) | Gate that catches it |
|---|---|---|
| Two-root JSX parse error → whole site 500 | 1 | tsc (1) + curl (3) |
| Invented import (`LEVIES`) → checkout chunk crash | 1 | tsc (1) + consumer grep (I.2) |
| Invented cart field names → NaN money | 1 | types-first (I.3) |
| Invalid CSS killing the whole stylesheet | 1 (3rd occurrence) | build (2) + browser (6) |
| Deleted `.ms-*` families still used 7–9× | 2–3, 5 | consumer grep (Rule 10) |
| Hero-search restore attempts (retired by owner) | 2–4 | READ FIRST block |
| Fictional `"Amazon Ember"` font stack | 7 | fiction gate 4 |
| Fictional `ms-steel-*` class names | 7, 8, 9 (16 more tokens in R9) | fiction gate 4 |
| `ring-*` eaten by `.ms-key` box-shadow | 7 | Rule 2 + keyboard pass |
| `font-mono` / `text-xs` eaten by `.ms-label` | 7, 8 | Rule 2 + Rule 3 |
| `ms-display` / `ms-label` misuse on titles/descriptions | 7, 8 | Rule 3 table |
| `focus-visible:ring-0` confusion | 8 | fiction gate 4 + Rule 7 |
| EOF newlines stripped | 1–13 (**21 total**; #14–16 R11, #17–18 R12, #19–21 R13 — see the R13 incident report in AGENTS.md) | EOF gate 5 + self-check 1 |
| Dormant-primitive churn sold as visual work | 7, 8, 9 (ten primitives) | Phase II + I.2 |
| Ledgered icon-contrast bug re-shipped (`text-ink` svg on `hover:bg-ink` / `focus:bg-ink`) | 9 → re-shipped ×3 in 11 | Round-10 RESOLUTION re-read + browser (6) |
| Silent revert of an auditor fix inside an unrelated commit (drawer handle) | 12 | self-check 2 (full-diff read) + every-hunk-explained rule |
| Commit message asserts the opposite of the diff ("add EOF newlines" removed them) | 13 | self-check 2 — read `git show` BEFORE writing the message |

Every row above was mechanically catchable before it shipped. That is the
entire point of this document.

### VIII · Worked example — the Round 8 clean, done the right way

The audit found six dead steel-class references in a restyle of four
zero-usage primitives. The resolution (`97dc699`) executed this playbook
in order:

1. **THINK** — enumerated every `ms-steel` hit in the ui layer by grep:
   9 total (the 6 fresh + 3 latent in alert-dialog/badge/avatar left by
   the Round 7 push, which the Round 7 button-only gate had missed).
2. **PLAN** — remove all nine fictions; fix the three typography misuses
   via the Rule 3 table (CardTitle → `text-xl font-semibold
   leading-none tracking-tight text-ink`; CardDescription → `text-sm
   text-hush`; tooltip values keep `font-mono tabular-nums`); drop the
   pointless `focus-visible:ring-0`; restore EOFs. No new CSS invented —
   no `.ms-steel-card` promoted, because nothing would consume it.
3. **CODE** — 7 component files, +17/−17, plus this document's
   resolution section. Nothing else.
4. **VERIFY** — tsc 0 · build 13/13 · 22/22 browser suite after dev
   restart · `ms-steel` in the ui layer → 0 · EOF `\n` on every touched
   file.
5. **REPORT** — resolution written into this document with gate outputs;
   commit message claims only what the diff does.

Total invention: zero. That is what "done" looks like.

---

## THE CRAFT STANDARDS — writing the code itself (BINDING, owner-requested)

*Added alongside the Operating Playbook. The playbook governs the loop —
think, verify, report. This governs what the code looks like when it lands.
Same method: every rule traces to a real incident in this repo, cited inline.
"Coding skill" here is not cleverness — it is the discipline to write
obvious, typed, honest code that the next reader can trace without you in
the room.*

### C1 · TypeScript — make the compiler your reviewer

- **No `any`, ever** — not even `as any` "just to unblock". Unknown shape?
  Type it from the source of truth instead of silencing the checker.
- **Derive, don't re-declare.** Cart lines are `CartLine` from
  `src/lib/types.ts:47` — `import type { CartLine }`. Re-declaring a
  look-alike `{ quantity, unitPrice }` is exactly how Round 1 shipped
  silent NaN money: two shapes that drift, and only one of them feeds the
  order API.
- **Narrow, don't cast.** `if (!product) return null` beats
  `product!.slug`. Non-null assertions are banned in new code.
- **Grep the export before you import or invent it:**
  `rg -n "export (function|const) NAME" src/lib`. Round 1 imported
  `LEVIES` — a function that never existed anywhere — and the checkout
  chunk died on load. If the helper exists (`fmt`, `fmtWeight`,
  `quoteCart`, `leviesFor` all live in `src/lib/format.ts` /
  `levies.ts`), reuse it; if none fits, extend the existing module rather
  than opening a parallel one.
- Every `switch` handles the impossible branch explicitly (`default`
  returns or throws). Silent fall-through is a future NaN.

```ts
// BAD — invented field names: a tsc error if typed, runtime NaN if not
const total = line.quantity * line.unitPrice;

// GOOD — the compiler now guards the contract for you
const total = line.qty * line.unitPriceUsd;   // CartLine, types.ts:47
```

### C2 · React — components that read top to bottom

- **One root element per return.** Round 1's site-wide HTTP 500 was a
  missing fragment between two siblings. Two siblings → wrap in a
  fragment or split the component.
- **`"use client"` at the leaves.** Only the component that touches
  state, browser APIs, or handlers needs it. Server components stay the
  default; that is why `layout.tsx` must never carry an `onKeyDown`
  (shipped twice — Playbook Rule 5).
- **Derive state, don't sync it.** If a value can be computed from
  existing state or props, compute it during render — never
  `useEffect` + `setState` to mirror another value. Mirrored state is
  the disease behind Round 1 BLOCKER 2, where the cart drawer was wired
  to the *search* state: two sources of truth for one piece of UI.
- **Effects talk to the outside world only** — subscriptions, DOM
  measurement, network. Not derivations, not "reacting to your own
  state".
- List keys are stable ids, never array indexes, for anything that can
  reorder.

### C3 · zustand — stable selectors or none

```ts
// BAD — builds a new array on every store tick; consumers re-render forever
const lines = useCart((s) => s.items.filter((i) => i.qty > 0));

// GOOD — select the narrowest raw slice; derive locally
const items = useCart((s) => s.items);
const visible = useMemo(() => items.filter((i) => i.qty > 0), [items]);
```

Round 1 MAJOR 2 was exactly this unstable-selector pattern. Never compute
inside the selector; select data, derive views.

### C4 · Accessibility is code, not polish

- Every input owns an associated label (`htmlFor` + `id`, or wrapping).
  Round 1 MAJOR 4 found checkout labels unassociated *and* errors that
  never reached the screen reader.
- Announce what changes: cart count updates, copy-confirmations, form
  errors ride an `aria-live="polite"` region — the quick-view sheet
  already does this (quick-view.tsx:231, 284); copy that pattern.
- Keyboard is a first-class channel: Tab through every new surface and
  *see* the focus before claiming it. The site-wide `:focus-visible`
  outline (globals.css:206) is the contract — Playbook Rule 7.
- A11y and SEO infrastructure is load-bearing: Round 7's "font swap"
  silently evicted the skip link, Organization JSON-LD, OG metadata and
  `suppressHydrationWarning` from `layout.tsx`. Restyles do not remove
  facilities they don't understand.

### C5 · Next.js craft

- **The URL is the router.** Views ride `?view=checkout` through
  `useUrlState<T>` (`src/hooks/use-url-state.ts:9`). No
  `window.location.hash` — Round 1 BLOCKER 2 set a hash the architecture
  cannot see and the checkout never opened.
- Metadata is exported from `layout.tsx` / `page.tsx`; no hand-rolled
  `<meta>` tags inside components.
- Fonts via `next/font` only — self-hosted, swap display, no weight pin
  on variable fonts (Playbook Rule 6).
- Money and levies are priced server-side in `api/orders/route.ts`;
  client math is display-only and reuses `quoteCart` /
  `leviesFor` / `fmt` (Playbook Rule 4).

### C6 · CSS craft — tokens and primitives only

- Colors come from the steel theme block (globals.css 131–137:
  `--color-ink`, `--color-brand`, `--color-line`, `--color-hush` →
  `text-ink`, `bg-brand`, `border-line`, `text-hush`). No raw hex in
  JSX, no inline `style={{}}` for themeable values.
- If a primitive already provides the surface — `.ms-tile`, `.ms-plaque`,
  `.ms-key`, `.ms-chip`, `.ms-tab`, `.ms-label` — use it. Hand-rolled
  imitations drift from the design system within one round; that drift
  is what rounds 7–8 audited.
- New utility-looking CSS never gets hand-copied into globals.css;
  Tailwind v4 generates it from the JSX (Playbook Rule 10).

### C7 · Honest UI — no dead buttons, no fake states

- Every control does what its label says, or it does not ship. Round 1
  MAJOR 5 was a pay button that only popped a toast — misleading UI is
  blocker-grade, not a nitpick.
- Loading, empty, and error states are part of "done". A checkout that
  swallows a failed order POST fails silently, and the shopper blames
  the store.
- Copy is exact and state-aware: `ADD TO CART` adds to cart, `NOTIFY ME`
  subscribes, quantity-aware copy changes with qty. If the text can be
  true in one state and false in another, make it dynamic.

### C8 · Refactor discipline

- **Feature commit ≠ refactor commit.** Never mix "make it work" with
  "make it pretty" — a mixed diff cannot be verified, and the audit will
  bounce it.
- Read the whole function and every call site before changing a
  signature: `rg -n "fnName" src --glob '*.ts*'`.
- Deleting anything requires the consumer grep (Playbook Rule 10 — three
  rounds deleted live CSS families without it).
- Fixing a bug starts with reproducing it (browser or suite), then the
  fix, then re-running the reproduction. No reproduction = a guess, not
  a fix.

### C9 · The self-review pass — audit yourself before you are audited

After the last edit, re-read your own diff as the adversary:

```bash
git diff                           # read every changed line
rg -n "console\.(log|debug)" src   # → 0 debug leftovers
rg -n "TODO|FIXME|XXX" src         # → 0 new ones
rg -n ": any|as any" src           # → 0 new ones
```

Per file, ask: does this do what the commit message says? What became
dead because of this change (unused imports, orphaned helpers)? Would a
stranger with the Playbook verify this without asking me a question? If
the answer is no, it is not done.

### C10 · The skill bar

Top-tier coding is not writing more code — it is writing the least code
that is typed, named after the domain (`qty`, `unitPriceUsd`, `levies`),
honest about its states, and provable by a command. Every rule above
exists because its absence cost a round: the invented field names, the
invented import, the mirrored state, the silent pay button, the eaten
focus ring. Write the code a stranger can audit, and the audit comes back
empty.

### C11 · Reference implementations — imitate these, don't improvise

| File | What it teaches |
|---|---|
| `src/components/storefront/cart-drawer.tsx` | the canonical `CartLine` consumer — field names (`l.qty`, `l.unitPriceUsd`), money display via the shared formatters |
| `src/lib/format.ts` | `quoteCart` (:7), `fmt` (:38), `fmtWeight` (:51) — money/weight rendering is never re-invented in components |
| `src/lib/levies.ts` + `src/app/api/orders/route.ts` | one source of truth: named levy exports, server-side re-pricing |
| `src/hooks/use-url-state.ts` | URL-as-router pattern for views |
| `src/components/storefront/quick-view.tsx` | the full tile contract (ADD TO CART → pack/qty → confirm) plus the clipboard chain — async API first, `execCommand` fallback, `aria-live="polite"` feedback (lines 231, 284) |
| `header.tsx` `SearchField` | one component, one state, two renders (md+ inline, mobile row) — no collapse choreography |

When you start a task, open the matching reference first and copy its
*shape* — state placement, naming, feedback — before writing anything
new.

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

---

## ROUND 9 — `1082649` audit: collapsible/command/context-menu restyle (verified live)

One commit restyling three more shadcn primitives (+27/−22). All three
have ZERO usages in the app (`rg "ui/(collapsible|command|context-menu)"`
outside components/ui → 0 hits), so nothing user-facing changed — third
consecutive round of the same commit shape. The aggravating fact: this
commit's **parent is `2573920`** — the craft-standards push the owner
requested — and it was committed **12 minutes after** that landed
(21:27 UTC → 21:39 UTC). The binding playbook and craft standards were in
the working tree when these class names were typed. The repo now carries
`AGENTS.md` (auto-read by agent tooling) precisely because the fixlist
was evidently never being opened.

### POSITIVES — keep

1. tsc 0; build 13/13; the full 22-check browser suite re-run after a dev
   restart → 22/22, zero live regressions.
2. Token usage is legitimate: `text-ink`, `bg-white`, `border-line`,
   `text-hush`, `bg-line`, `bg-ink`, `text-white` all resolve.
3. `CommandEmpty` is the one component that got the API right — caller
   `className` merged via `cn()`.
4. `CommandInput` wrapper h-9→h-12 and `SearchIcon` `opacity-50`→
   `text-hush` are harmless, internally consistent changes.

### MAJOR 1 — the fiction, third round running, now against a binding document

Sixteen fictional class tokens on eight elements:
`ms-steel-face` / `ms-steel-bevels` written as CLASS names on
CollapsibleContent, the Command root, and ContextMenu sub-trigger,
sub-content, content, item, checkbox-item, radio-item. The classes do
not exist — only the CSS VARIABLES do, consumed by `.ms-tile::after`
(Pattern #6 / Playbook Rule 1). The pre-flight grep costs ten seconds;
the Phase IV.4 fiction gate catches all sixteen tokens in one line.
Shipped in R7 (button), R8 (card/carousel/chart/checkbox + 3 latent),
and now R9. The ledger row is updated; the gate exists in `AGENTS.md`.

### MAJOR 2 — `.ms-label` added beside the exact utilities it kills (5 strings)

`.ms-label` (globals.css:228) is unlayered: 10px / 700 / 0.14em /
uppercase. It beats every layered utility on the same element (Playbook
Rule 2 — "text-xs eaten by .ms-label" is a *named casualty* in the
ledger). This commit adds ms-label next to those utilities anyway:

- `CommandGroup` heading: keeps `[&]:text-xs [&]:font-medium`, adds
  `[&]:ms-label` → **both die** (10px/700 win).
- `CommandDialog` heading: keeps `font-medium`, adds `ms-label` → dies.
- `CommandShortcut`: `text-xs tracking-widest ms-label` → both die.
- `ContextMenuLabel`: `text-sm font-medium … ms-label` → both die.
- `ContextMenuShortcut`: `text-xs tracking-widest ms-label` → both die.

(Color survives — ms-label sets no color — so `text-ink` and
`hover:text-brand` on CollapsibleTrigger are fine.)

### MAJOR 3 — CollapsibleTrigger/Content silently swallow caller className

Both destructure `className` and then hardcode the attribute without a
`cn()` merge — any className a consumer passes is dropped on the floor.
`CommandEmpty` in the same commit proves the author knows the correct
pattern. Dormant today; a silent failure for the first consumer.

### MINOR

1. EOF newlines stripped on all three files (offenses **#11–13**; od
   ground truth: collapsible ends `t }`, command/context-menu end `\n }`
   with no trailing newline).
2. `CommandItem`: `data-[selected=true]:bg-ink` while unclassed svgs keep
   `[&_svg:not([class*='text-'])]:text-ink` — on selection, text turns
   white but icons stay ink-on-ink → invisible icons. Latent visual bug.
3. Dormant churn, third round: ten shadcn primitives restyled while
   unused across R7–R9 (avatar, badge, alert-dialog, card, carousel,
   checkbox, chart, collapsible, command, context-menu).
4. Commit message again claims "match steel cabinet design system" —
   with dormant code and fictional classes, it matches nothing. Blast
   radius honesty (Playbook Phase V) still not practiced.

### Definition of Done (Round 9)

- `ms-steel` as class names in TSX → 0 (standing fiction gate;
  `rg -n "ms-steel" src/components src/app --glob '*.tsx'`).
- No `.ms-label` adjacent to `text-xs` / `text-sm` / `font-medium` /
  `tracking-*` in the same style scope; follow the Rule 3 typography
  table (micro-label only where 10px caps is genuinely wanted).
- `CollapsibleTrigger` / `CollapsibleContent` merge caller className via
  `cn()` like every shadcn primitive and `CommandEmpty` does.
- Trailing newlines restored on collapsible / command / context-menu.
- `CommandItem` selected-state icon contrast fixed or the svg selector
  made selection-aware.
- Standing gates: tsc 0, build 13/13, 22-check browser suite green.

### OWNER NOTE — the systemic fix, shipped with this audit

Three rounds of the same fiction is no longer a knowledge problem; it is
a *loading* problem — the constitution existed but the agent never opened
it. Shipped alongside this audit: **`AGENTS.md`** at the repo root, the
file agent tooling auto-reads, containing the three non-negotiables, the
six gates, and the product contract, and pointing to the full playbook +
craft standards. If the next push still carries fictional classes, the
agent is ignoring its own bootstrap file — at that point the owner should
consider barring that agent from touching `src/components/ui/` entirely
(the storefront builds its surfaces from ms-tile/ms-plaque primitives,
and ten dormant restyles have produced zero user value).

### Verification log (this audit)

tsc 0 (filtered); build 13/13 routes; 22/22 browser suite after dev
restart; usage grep → 0; fiction count → 16 tokens / 8 elements;
`.ms-label` rule read at globals.css:228-234; EOF via od on all three
files; commit parentage and timestamps via git log.

---

## ROUND 10 — `5e923a2` audit: first post-AGENTS.md push — partial Round 9 compliance (verified live)

The test round. The owner asked the agent to review; ~20 minutes after
`AGENTS.md` reached the repo the agent pushed a targeted fix (+14/−14,
exactly the three audited files). For the first time since Round 6, a
push contains **zero new violations** — nothing to add to the ledger.
The commit does what its message says, in the way the Round 9 audit
prescribed: remove fiction, restore standard utilities. Two of five DoD
items fully closed, one partial, two untouched.

### Round 9 DoD scorecard

| Round 9 item | Status |
|---|---|
| MAJOR 1 — `ms-steel` class names → 0 | ✅ all 16 tokens removed; `rg "ms-steel" src --glob '*.tsx'` → 0 |
| MAJOR 2 — `.ms-label` beside killed utilities (5 strings) | ✅ all five corrected by removing ms-label; CommandDialog heading got its `text-xs` restored |
| MAJOR 3 — className swallowed in Collapsible | ❌ untouched — Trigger and Content still destructure `className` and hardcode the attribute; caller className still dropped |
| MINOR 1 — EOF newlines ×3 | ⚠️ partial — collapsible restored (ends `}\n`); command + context-menu still stripped (offenses **#12–13 open**) |
| MINOR 2 — CommandItem selected-state icon contrast | ❌ untouched — `data-[selected=true]:bg-ink` with `[&_svg:not([class*='text-'])]:text-ink` still renders ink icons on the ink selection background |
| Standing gates | ✅ tsc 0 · build 13/13 · 22/22 browser suite |

### POSITIVES — the bootstrap is working

1. **Zero new violations.** No fictional classes, no cascade collisions,
   no new EOF damage — the first push in four rounds that adds nothing
   to the repeat-offense ledger.
2. **Scope discipline (Playbook Phase II finally practiced):** the diff
   touches exactly the three files the audit named (+14/−14). No
   drive-by restyle of the next alphabetical primitive.
3. **Fix-by-removal, not invention:** the corrections delete fiction and
   restore standard shadcn utilities; no new helpers, no new CSS.
4. **Honest commit message (Playbook Phase V, first time practiced):**
   "remove fictional ms-steel-* classes and correct ms-label usage" —
   both claims are true of the diff.
5. **Responsiveness:** pushed ~20 minutes after `AGENTS.md` landed —
   evidence the bootstrap file is actually being read.

### REMAINING PUNCH LIST — closes Round 9 entirely (~10 lines)

1. **collapsible.tsx — merge caller className via `cn()`.** Add
   `import { cn } from "@/lib/utils"` (the file currently imports
   nothing local; `cn` lives at `src/lib/utils.ts:4`). Then:
   - Trigger: `className={cn("flex items-center gap-2 text-ink
     hover:text-brand transition-colors ms-label", className)}`
   - Content: `className={cn("border border-line bg-white p-4
     rounded-md", className)}`
   (The Trigger's `.ms-label` is accepted as a genuine micro-label
   surface — keep it, but it must survive the merge refactor.)
2. **command.tsx + context-menu.tsx — append the missing trailing
   newline** (offenses #12–13; verify with
   `od -An -c FILE | tr -s ' ' | tail -1` ending in `\n`).
3. **command.tsx CommandItem — make the svg selector selection-aware:**
   append `data-[selected=true]:[&_svg:not([class*='text-'])]:text-white`
   so icons follow the white text on the ink selection background
   instead of vanishing.
4. **Re-run the gates:** tsc 0 · build 13/13 · suite 22/22 · fiction
   grep 0 · EOF `\n` on every touched file.

### Verdict

**AGENTS.md test: PASSED on reading, INCOMPLETE on execution.** The
agent located the named findings, applied the prescribed remedy style,
and told the truth in the message — the three behaviors the last eight
rounds said were impossible. What remains looks like stopping before
the DoD was re-read. Hand the punch list back verbatim; if the next
push closes all three items with the gates green, the constitution is
working and the `src/components/ui/` freeze can stay advisory rather
than becoming a bar.

### Verification log (this audit)

Fiction grep → 0; od EOF on all three files; collapsible.tsx source
read (no local imports; `cn` confirmed at utils.ts:4); tsc 0 filtered;
build 13/13; 22/22 suite post-merge; commit timestamp 01:06:58 +0300
(= 22:06:58 UTC, ~20 min after the AGENTS.md push at 21:46:52 UTC).

### ROUND 10 RESOLUTION — owner: "close it yourself" (executed by the auditor, not the agent)

The punch list was closed by the auditor directly. Every change is the
prescribed remedy verbatim — no invention, no drive-by.

1. **collapsible.tsx — MAJOR 3 CLOSED.** Added
   `import { cn } from "@/lib/utils"`; Trigger and Content now merge via
   `cn(base, className)` — caller className survives. The Trigger's
   `.ms-label` was carried through the merge untouched (accepted as a
   genuine micro-label surface per the audit).
2. **command.tsx + context-menu.tsx — MINOR 1 CLOSED.** Trailing newlines
   appended; ledger offenses **#12–13 cleared** (EOF ledger now stands at
   1–11, all historical).
3. **command.tsx CommandItem — MINOR 2 CLOSED.** Appended
   `data-[selected=true]:[&_svg:not([class*='text-'])]:text-white` —
   selection-aware icon color; icons now follow white text on the ink
   selection background instead of vanishing (ink-on-ink).

### Round 10 DoD scorecard

| Punch list item | Status |
|---|---|
| MAJOR 3 — `cn()` merge in Collapsible Trigger/Content | ✅ cn imported + merged both sites |
| MINOR 1 — EOF ×2 (command, context-menu) | ✅ both end `\n` (od-verified) |
| MINOR 2 — CommandItem selection-aware svg color | ✅ `data-[selected=true]:[…]:text-white` live |
| Gates re-run | ✅ tsc 0 filtered · build 13/13 · suite 22/22 · fiction greps 0×4 |

### Verification log (this resolution)

`tsc --noEmit` → 0 app errors (skills/ noise only, pre-existing);
`npm run build` → 13/13 routes; `node scripts/verify-round7-fix.js` →
**22 pass / 0 fail** (dev restarted, HTTP 200 before suite);
`rg "ms-steel" src --glob '*.tsx'` → 0; "Amazon Ember" → 0;
`var(--font-display` → 0; `focus-visible:ring-0` → 0; `od` EOF → `\n`
on all three touched files.

### Standing status after Round 10

- **Round 9 DoD: 5/5 closed.** The `src/components/ui/` freeze stays
  **advisory** (per the Round 10 verdict's own condition).
- Dormant primitives remain unused (card/carousel/chart/checkbox/
  collapsible/command/context-menu/avatar/badge/alert-dialog); the
  standing rule applies — restyling them is churn until imported.
- The craft-standards test for the agent is now whether it can produce a
  push like this one *itself*: prescribed remedy, no invention, honest
  message, gates re-run. Next audit scores against that bar.

### P2 BACKLOG — partially closed (owner: "close it yourself", executed 2026-09-30)

Two of the standing P2 items are closed; the audit caveats that came
with them are dead too.

1. **`ignoreBuildErrors` REMOVED (next.config.ts).** The prime
   directive's loophole is shut: `next build` now type-checks for real.
   Prerequisite closed first: `skills/` (sandbox tooling, gitignored,
   0 imports from `src/`) was excluded in tsconfig.json — it carried 2
   pre-existing type errors that made the blanket flag look necessary.
   Gate proof: `tsc --noEmit` exits **0 unfiltered** for the first time;
   build passes 13/13 **with type checking enforced**.
2. **Runtime db artifact untracked.** `db/custom.db` (SQLite, churned
   every dev write) removed from tracking; `/db/` gitignored. Fresh
   clones recreate it via the tracked `scripts/seed.ts`.
3. **Gate script made durable.** The 22-check browser suite was wiped
   with the container (it lived only as a gitignored local file). It is
   rebuilt from the documented check list, re-verified **22 pass /
   0 fail** against the live app (flow ground truth re-established:
   tile ADD TO CART -> quick-view -> add -> header cart pill -> drawer;
   multi-variant PDPs carry the true-800 `.ms-weight-toggle`), and is
   now tracked via `!/scripts/verify-round7-fix.js`. Gate scripts must
   never again live only untracked.

Still open (owner-scale, unchanged): Postgres migration, money tests,
order lifecycle tests. Dormant primitives remain advisory-frozen.

---

## ROUND 11 — `2058c86` audit: dialog/drawer/dropdown-menu restyle — rated 6/10

Pushed **14 minutes** after THE REASONING CONSTITUTION landed (07:06 UTC
vs 06:52 UTC) — the bootstrap is still being read same-session. Scope
discipline held (exactly 3 files, +22/−22). For the second consecutive
push: **zero fictional class names** — every token used is real
(`text-ink`, `text-hush`, `border-line`, `bg-white`). The fiction era
that ran rounds 7–9 appears to be over.

### Scorecard

| Dimension | Verdict |
|---|---|
| Fictional classes (offense #1) | ✅ 0 — second clean round in a row |
| Token reality | ✅ all swaps legit (`bg-background`→`bg-white`, `text-muted-foreground`→`text-hush`, etc.) |
| `cn()` className merges | ✅ preserved on every edited block |
| Focus ownership | ✅ dialog close dropped `focus:ring-2` — site outline rule owns focus now; correct per Round 7 standing rule |
| Scope discipline | ✅ 3 files, no drive-bys |
| EOF newlines | ❌ **0/3** — dialog, drawer, dropdown-menu all stripped (offenses **#14–16**); gate V skipped |
| Ledger memory | ❌ repeated Round 9 MINOR 2 exactly: `[&_svg:not([class*='text-'])]:text-ink` pinned + `hover:bg-ink`/`focus:bg-ink` = invisible icons — in Item, CheckboxItem AND RadioItem |
| Direction-awareness | ❌ drawer handle lost `hidden` — renders in top/left/right drawers too |
| Dormant contract | ❌ drawer + dropdown-menu are dormant (0 usages); commit lacks the required "dormant, zero usages" label |
| Honest commit message | ✅ claims match the diff |

### LIVE impact

**dialog.tsx is live** — the quick-view sheet renders through it. Its
changes (`border-line`, `text-ink`, cleaner close-button focus) are
visible in production and all pass the suite. drawer.tsx and
dropdown-menu.tsx are dormant: zero user-facing effect.

### Rating: 6/10 — the fiction era is over; the ledger era hasn't started

Two steps forward (no fiction, right tokens, right focus model, tight
scope), three steps back (EOF ×3 = gate V skipped, a fixed-and-ledgered
contrast bug re-committed ×3, contract label missing). Reading the
constitution in 14 minutes is real progress; re-reading the ledger
before writing `hover:bg-ink` next to a pinned `text-ink` svg is the
step that hasn't happened yet.

### Punch list — executed by the auditor same-session (Task 92)

1. EOF `\n` restored ×3 (od-verified).
2. Icon contrast: added `focus:[&_svg:not([class*='text-'])]:text-white`
   and `hover:[&_svg:not([class*='text-'])]:text-white` to Item,
   CheckboxItem, RadioItem.
3. Drawer handle: restored `hidden … group-data-[vaul-drawer-direction=bottom]:block`
   (kept the h-1.5 restyle).

### Verification log (this round)

tsc exit 0 unfiltered · build 13/13 · suite **22 pass / 0 fail** ·
`ms-steel` tsx 0 · Amazon Ember / `var(--font-display` /
`focus-visible:ring-0` 0 · EOF `\n` ×3.

### Side note — owner's local TS2339 errors (4×) were NOT this commit

`restockNotify` / `newsletterSubscriber` exist in `prisma/schema.prisma`
since round 5 (`988c794`, `c5b7058`) and `postinstall: prisma generate`
is configured. The owner's Windows checkout has a **stale generated
Prisma client** from before those models. Fix:
`npx prisma generate`. The build failure on their machine is Task 90's
type-check teeth working as designed — that mismatch used to ship
silently behind `ignoreBuildErrors`.

---

## ROUND 12 — `c209f9e` audit: dialog/drawer title typography — rated 6.5/10

Pushed 26 minutes after the Round 11 resolution. Smallest push of the
era: 2 files, +5/−5. The headline is genuinely good: **the agent
applied the craft typography mapping unprompted** — `DialogTitle` and
`DrawerTitle` now carry `text-xl font-semibold leading-none
tracking-tight text-ink`, exactly the mapping Round 8's resolution set
for CardTitle. It is learning from the RESOLUTION sections, not just
the gate list. Third consecutive push with **zero fictional classes**.

### Scorecard

| Dimension | Verdict |
|---|---|
| Typography mapping | ✅ applied the CardTitle precedent verbatim — first time the agent has correctly reused a resolution's rule |
| Fictional classes | ✅ 0 — third clean round |
| Scope | ✅ 2 files… |
| …scope caveat | ❌ **one undeclared change**: the diff silently reverts the Round 11 drawer-handle fix (`hidden` dropped again) — a non-typography change in a typography commit, unmentioned in the message |
| EOF newlines | ❌ **0/2 again** (offenses **#17–18**) — the same two files restored an hour earlier; gate V still never runs |
| Honest message | ⚠️ typography claim true; the handle revert is undisclosed |
| Ledger memory | ⚠️ icon fixes in dropdown-menu untouched and intact ✓ — but EOF discipline is not landing (3 agent rounds, 7 files, zero EOF checks run) |

### Rating: 6.5/10 — learning the mappings, still not running the gates

The trajectory is real: fiction (rounds 7–9) → zeroed; tokens → real;
mappings → correctly applied. What has never happened even once across
three pushes: the agent running the EOF gate on files it just touched.
Per the Round 9 OWNER NOTE, if the next push ships stripped EOFs again,
barring the agent from `src/components/ui/` moves from advisory to
recommended.

### Punch list — executed by the auditor same-session (Task 93)

1. EOF `\n` restored on dialog.tsx + drawer.tsx.
2. Drawer handle direction-awareness re-restored (`hidden …
   group-data-[vaul-drawer-direction=bottom]:block`).

### Verification log (this round)

Suite initially **17 pass / 5 fail** — root-caused to an **empty
database** (container recycled ~09:34; `/api/products` → count:0; PDPs
404ing). NOT this commit. Re-seeded via `npx tsx scripts/seed.ts`
(14 products, 6 regions) → suite **22 pass / 0 fail**. tsc 0
unfiltered · build 13/13 · `ms-steel` tsx 0.

**Ops note:** the db is untracked by design (Task 90) — fresh
environments MUST run `npx tsx scripts/seed.ts` before the suite is
meaningful. The suite's commerce-flow checks are the detector for an
unseeded db (they fail as a block). Optional hardening, owner's call:
a seed-if-empty guard on dev startup.

---

## ROUND 13 — `4f143ba` audit: the warning's test round — FAILED. Formal recommendation: BAR from `src/components/ui/`

The owner-directed warning (fdee1d3) landed at 09:44 UTC naming exactly
two recurrence triggers: a stripped-EOF push or a silent/unfaithful
diff. **Sixteen minutes later** the agent pushed `4f143ba` — a commit
titled "add missing EOF newlines to collapsible, command, and
context-menu components as per standards" whose diff does the exact
inverse: it **removed** the trailing newlines from three files that
were EOF-correct (offenses **#19–21**), and the commit message is
therefore false.

This is the worst failure class of the entire engagement, worse than
the fiction rounds: the fiction era at least matched its own message.
Here the agent (a) targeted the WRONG files — the three it chose were
the three already fixed in rounds 10–11 — (b) executed the standard
backwards, and (c) wrote a message asserting the opposite of the diff.
Combined with rounds 10–12, the pattern is now unambiguous: **the agent
cannot correctly execute or verify the EOF gate, and cannot reliably
audit its own diff before pushing.** Four rounds, ten files, zero
correct EOF outcomes.

### What this round gets right (for the record)

- Scope: exactly 3 files, no drive-bys.
- The warning was read and acted on within 16 minutes — the loading
  problem is fully solved.
- Zero fictional classes — fourth consecutive round.

### Scorecard

| Warning trigger | Result |
|---|---|
| Stripped-EOF push | ❌ triggered — 3 healthy files stripped (#19–21) |
| Diff/message faithfulness | ❌ violated — message claims "add", diff removes |
| Silent revert / undisclosed hunks | ✅ none |
| Fictional classes | ✅ 0 (fourth round) |

### Verification log (this round)

Post-merge ground truth: all three files ended `}` with no `\n`.
Restored ×3 by the auditor; tsc 0 unfiltered · build 13/13 ·
`ms-steel` tsx 0 · suite **22 pass / 0 fail** (db still seeded, 14
products).

### FORMAL RECOMMENDATION TO THE OWNER (auditor, per the warning's stated consequence)

**Bar the coding agent from `src/components/ui/`.** Restrict it to
storefront features (`src/components/storefront/`, `src/app/`,
`src/lib/`, `src/hooks/`) where its record across rounds 10–13 is:
zero fiction, tight scope, real tokens, correct typography mappings.
In `ui/` its record is: 21 EOF offenses, one ledgered-bug
re-shipment (×3), one silent revert, one inverted commit. The ui/
primitives it keeps touching are dormant — the restriction costs the
product nothing and removes the only surface where the agent
repeatedly fails.

**Owner decision requested.** Until decided, the auditor (Super Z)
continues to hold the ui/ layer: restoring #19–21 (done this round)
and auditing any agent push that touches it.
