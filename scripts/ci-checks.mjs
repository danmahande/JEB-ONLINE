#!/usr/bin/env node
/**
 * Mechanical gates for JEB-ONLINE.
 *
 * These are the rules this repo keeps failing by hand, four rounds deep in
 * AGENT-FIXLIST.md: stripped trailing newlines, class names that are used in
 * JSX but never defined in CSS, and pages that read a session but got statically
 * prerendered. Prose has not stopped them. A machine does.
 *
 * Deliberately dependency-free and read-only. Run it locally, or let
 * .github/workflows/ci.yml run it on every push.
 *
 *   node scripts/ci-checks.mjs
 *
 * Exit 0 = all gates pass. Exit 1 = at least one failure, printed with paths.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const failures = [];
const notes = [];

function fail(gate, message) {
  failures.push({ gate, message });
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Strip comments so a rule name mentioned in prose is never counted as a use. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

// ---------------------------------------------------------------------------
// Gate 1 — every tracked source file ends with exactly one newline.
// The single most-repeated offense in this repo (35 recorded instances).
// ---------------------------------------------------------------------------
{
  const targets = [
    ...walk(join(ROOT, "src")),
    ...["README.md", "AGENTS.md", "AGENT-FIXLIST.md", ".gitignore", ".env.example", "package.json"]
      .map((f) => join(ROOT, f))
      .filter(existsSync),
    ...walk(join(ROOT, "scripts")),
  ];

  let checked = 0;
  for (const file of targets) {
    const buf = readFileSync(file);
    if (buf.length === 0) {
      fail("eof", `${relative(ROOT, file)} — empty file (0 bytes)`);
      continue;
    }
    if (buf[buf.length - 1] !== 0x0a) {
      fail("eof", `${relative(ROOT, file)} — does not end with a newline`);
      continue;
    }
    if (buf.length > 1 && buf[buf.length - 2] === 0x0a) {
      fail("eof", `${relative(ROOT, file)} — ends with more than one blank line`);
      continue;
    }
    checked += 1;
  }
  notes.push(`eof: ${checked}/${targets.length} files end with exactly one newline`);
}

// ---------------------------------------------------------------------------
// Gate 2 — every `ms-*` token used as a class in TSX is defined in globals.css.
// Rounds 7-9 shipped 16+ invented class names; the class renders nothing.
// ---------------------------------------------------------------------------
{
  const cssPath = join(ROOT, "src", "app", "globals.css");
  const css = stripComments(readFileSync(cssPath, "utf8"));

  const defined = new Set();
  for (const m of css.matchAll(/\.(ms-[a-z0-9-]+)/g)) defined.add(m[1]);
  // Class names built from a variable inside CSS are not covered; collect the
  // @keyframes names too so a keyframe is never mistaken for a missing class.
  for (const m of css.matchAll(/@keyframes\s+(ms-[a-z0-9-]+)/g)) defined.add(m[1]);

  const tsxFiles = walk(join(ROOT, "src")).filter(
    (f) => f.endsWith(".tsx") || f.endsWith(".ts")
  );

  const used = new Map();
  for (const file of tsxFiles) {
    const src = stripComments(readFileSync(file, "utf8"));
    for (const m of src.matchAll(/(?<![\w-])(ms-[a-z0-9-]+)/g)) {
      const cls = m[1];
      if (!used.has(cls)) used.set(cls, new Set());
      used.get(cls).add(relative(ROOT, file).split(sep).join("/"));
    }
  }

  // A token defined as a CSS custom property (--ms-*) is a variable, not a
  // class. Those are excluded from the definition set above but appear in JSX
  // only via var() — never as className — so they should not show up here.
  let orphanCount = 0;
  for (const [cls, files] of used) {
    if (defined.has(cls)) continue;
    orphanCount += 1;
    fail(
      "classes",
      `${cls} — used in ${[...files].join(", ")} but never defined in globals.css`
    );
  }
  notes.push(`classes: ${defined.size} ms-* classes defined, ${orphanCount} used-but-undefined`);
}

// ---------------------------------------------------------------------------
// Gate 3 — a page/layout that reads a session must not be statically rendered.
// Offense #43 (round 23) and its unrecorded recurrence on /account/signup.
// ---------------------------------------------------------------------------
{
  const srcRoot = join(ROOT, "src", "app");
  const files = walk(srcRoot).filter((f) => /\.(tsx|ts)$/.test(f));
  const SESSION = /getServerSession|getAdminSession|getCustomerSession/;
  const OPT_OUT = /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/;

  // A page inherits `dynamic` from its nearest ancestor layout, so the admin
  // pages are covered by admin/layout.tsx and must not be reported as missing
  // it. Collect every directory whose layout opts out, then treat any file
  // beneath it as covered.
  const optedOutDirs = [];
  for (const file of files) {
    if (!file.endsWith("layout.tsx")) continue;
    if (OPT_OUT.test(stripComments(readFileSync(file, "utf8")))) {
      optedOutDirs.push(file.slice(0, file.length - "layout.tsx".length));
    }
  }

  let consumers = 0;
  for (const file of files) {
    const src = stripComments(readFileSync(file, "utf8"));
    if (!SESSION.test(src)) continue;
    // Route handlers are always dynamic; only pages/layouts can be prerendered.
    if (/export\s+async\s+function\s+(GET|POST|PATCH|PUT|DELETE)/.test(src)) continue;
    if (/\.(test|spec)\./.test(file)) continue;
    consumers += 1;
    const coveredByLayout = optedOutDirs.some((dir) => file.startsWith(dir));
    if (!OPT_OUT.test(src) && !coveredByLayout) {
      fail(
        "session",
        `${relative(ROOT, file)} — reads a session but exports no dynamic = "force-dynamic"`
      );
    }
  }
  notes.push(
    `session: ${consumers} page/layout session consumers checked (${optedOutDirs.length} layout(s) opt out for their subtree)`
  );
}

// ---------------------------------------------------------------------------
// Gate 4 — no fictional `ms-steel-*` class usage (they are CSS variables).
// The specific three-round repeat from rounds 7-9, kept as its own loud check.
// ---------------------------------------------------------------------------
{
  const tsxFiles = walk(join(ROOT, "src")).filter((f) => f.endsWith(".tsx"));
  let hits = 0;
  for (const file of tsxFiles) {
    const src = stripComments(readFileSync(file, "utf8"));
    if (/ms-steel-(face|bevels|grain)/.test(src)) {
      hits += 1;
      fail(
        "ms-steel",
        `${relative(ROOT, file)} — ms-steel-* are CSS variables, not classes`
      );
    }
  }
  notes.push(`ms-steel: ${hits} files referencing the variables as classes`);
}

// ---------------------------------------------------------------------------
// Gate 5 — no brand domain hardcoded in source.
// The storefront once shipped `meridiansupply.co` in its footer, contact page
// and all three legal pages — a domain it does not own — while its own
// canonicals pointed at localhost. Identity belongs in src/lib/site-config.ts,
// fed by NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_CONTACT_EMAIL.
// ---------------------------------------------------------------------------
{
  // Full hostname literals. Group 1 alone is wrong here: with a repeated
  // capture only the last iteration is returned, which is how an earlier
  // version of this gate reported "er-api." instead of "er-api.com".
  // The TLD list must include a PLAIN `co` — an earlier version only had
  // `co\.[a-z]{2}` (for co.uk), which meant `.co` domains slipped through and
  // the gate passed while a deliberate probe was still in the tree. `.info`
  // was then dropped again: `console.info` is not a domain, and a gate that
  // cries wolf is a gate people learn to bypass.
  const DOMAIN_LITERAL =
    /\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|app|dev|store|shop|africa|uk|us|ug|ke|tz|rw|cd)\b/gi;
  // Domains that are legitimately literals in source. Extend this list only
  // when the domain is an external service or a documented placeholder — never
  // to silence the store's own identity, which belongs in site-config.ts.
  const ALLOW = [
    "example.com", // form placeholder (john@example.com)
    "company.com", // form placeholder (you@company.com)
    "email.com", // form placeholder (YOUR@EMAIL.COM)
    "w3.org", // sitemap/structured-data vocabulary
    "schema.org", // JSON-LD vocabulary
    "er-api.com", // live FX rate source (src/lib/fx.ts)
    "resend.com", // order email provider (src/lib/mail.ts)
    "blob.vercel-storage.com", // product image host (next.config.ts)
    "localhost",
  ];
  const files = walk(join(ROOT, "src"))
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .filter((f) => !/\.(test|spec)\./.test(f));

  let hits = 0;
  for (const file of files) {
    const rel = relative(ROOT, file).split(sep).join("/");
    if (rel === "src/lib/site-config.ts") continue; // owns the fallback logic
    const src = stripComments(readFileSync(file, "utf8"));
    for (const m of src.matchAll(DOMAIN_LITERAL)) {
      const domain = m[0].toLowerCase();
      if (ALLOW.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`))) {
        continue;
      }
      hits += 1;
      fail(
        "domain",
        `${rel} hardcodes the domain \`${domain}\` — read brand identity from @/lib/site-config`
      );
    }
  }
  notes.push(
    `domain: ${files.length} source files checked, ${hits} hardcoded domains outside the allow-list`
  );
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log("JEB-ONLINE mechanical gates\n");
for (const note of notes) console.log(`  PASS  ${note}`);

if (failures.length === 0) {
  console.log("\nAll gates passed.");
  process.exit(0);
}

console.log(`\n${failures.length} FAILURE(S):\n`);
for (const { gate, message } of failures) console.log(`  [${gate}] ${message}`);
console.log("\nFix these, then re-run: node scripts/ci-checks.mjs");
process.exit(1);
