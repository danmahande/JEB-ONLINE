#!/usr/bin/env node
/**
 * Configuration audit — "what is still unset on this deployment?"
 *
 * check-story.mjs answers "is this a sellable shop?". This answers the question
 * that comes first: which environment variables are still missing, and what does
 * each one break?
 *
 * It works entirely by probing the deployed site, so it needs no credentials and
 * no access to the Vercel dashboard. Every row names the exact variable to set.
 *
 *   node scripts/check-config.mjs https://your-deployment
 *
 * Exit 0 = nothing required is missing. Exit 1 = at least one setting is unset.
 *
 * The probes are chosen because each missing variable produces a DISTINCT,
 * observable response. That mapping is the whole idea:
 *
 *   /api/products        empty list      -> the database has no product rows (seeded?)
 *   /api/products        500             -> DATABASE_URL wrong or unreachable
 *   /api/auth/session    500             -> NEXTAUTH_SECRET missing (NextAuth refuses)
 *   /account/signup      "not available" -> NEXTAUTH_SECRET missing (same gate)
 *   /admin/login         "not configured"-> ADMIN_EMAIL / ADMIN_PASSWORD_HASH / NEXTAUTH_SECRET
 *   /robots.txt          localhost URL   -> NEXT_PUBLIC_SITE_URL missing
 *   contact page         derived address -> NEXT_PUBLIC_CONTACT_EMAIL missing
 */

const base = (process.argv[2] || process.env.BASE_URL || "http://localhost:3000").replace(
  /\/+$/,
  ""
);

/** What the audit found. `ok: null` means "could not tell", never "fine". */
const rows = [];
let hardFailure = false;

function row(setting, status, detail) {
  rows.push({ setting, status, detail });
  if (status === "MISSING" || status === "WRONG") hardFailure = true;
}

async function probe(path, options = {}) {
  try {
    const res = await fetch(`${base}${path}`, {
      redirect: "follow",
      headers: { "user-agent": "jeb-config-audit" },
      ...options,
    });
    return { status: res.status, text: await res.text() };
  } catch (error) {
    return { status: 0, text: "", error: error.message };
  }
}

const host = (() => {
  try {
    return new URL(base).host;
  } catch {
    return "";
  }
})();

// --- the database is reachable and has products ------------------------------
const products = await probe("/api/products");
if (products.status === 0) {
  row("DATABASE_URL", "WRONG", `/api/products unreachable (${products.error})`);
} else if (products.status === 500) {
  row(
    "DATABASE_URL",
    "WRONG",
    "/api/products returned 500 — the database is unreachable or the URL is not a postgresql:// string"
  );
} else {
  let count = null;
  try {
    count = JSON.parse(products.text).count;
  } catch {
    /* fall through to the null branch */
  }
  if (count === null) {
    row("DATABASE_URL", "WRONG", "/api/products did not return JSON");
  } else if (count === 0) {
    row(
      "SEED (not a variable)",
      "MISSING",
      "the catalog is empty — run: npx tsx scripts/seed.ts against the production database"
    );
  } else {
    row("DATABASE_URL", "SET", `/catalog responds with ${count} product(s)`);
  }
}

// --- NEXTAUTH_SECRET --------------------------------------------------------
// NextAuth refuses to serve without a secret in production; the session
// endpoint is the cleanest tell. /account/signup carries the same gate.
//
// NOTE: this must be probed, never inferred from the repo. The first version of
// this audit was written after reading .env.example (an empty template) and the
// local .env (one line), and it reported the secret as missing on a deployment
// where it was in fact set. Local files say nothing about the deployment.
const session = await probe("/api/auth/session");
if (session.status === 500) {
  row(
    "NEXTAUTH_SECRET",
    "MISSING",
    "/api/auth/session returned 500 — sign-in is disabled until this is set (32+ characters)"
  );
} else if (session.status === 200) {
  row("NEXTAUTH_SECRET", "SET", "/api/auth/session responds");
} else {
  row("NEXTAUTH_SECRET", "UNKNOWN", `/api/auth/session returned ${session.status}`);
}

const signup = await probe("/account/signup");
if (signup.text.includes("Customer accounts are not available yet")) {
  // Belt and braces: the page's own gate message.
  row(
    "CUSTOMER ACCOUNTS",
    "MISSING",
    "/account/signup says accounts are unavailable (same NEXTAUTH_SECRET gate)"
  );
}

// --- the owner's own login --------------------------------------------------
const adminLogin = await probe("/admin/login");
if (adminLogin.text.includes("Admin sign-in is not configured yet")) {
  row(
    "ADMIN_EMAIL / ADMIN_PASSWORD_HASH / NEXTAUTH_SECRET",
    "MISSING",
    "/admin/login says sign-in is not configured — you cannot reach your own dashboard yet"
  );
} else if (adminLogin.text.includes("Store administration")) {
  row("ADMIN LOGIN", "SET", "the sign-in form renders");
}

// --- canonical origin -------------------------------------------------------
const robots = await probe("/robots.txt");
if (/Sitemap:\s*http:\/\/localhost/i.test(robots.text)) {
  row(
    "NEXT_PUBLIC_SITE_URL",
    "MISSING",
    "robots.txt advertises http://localhost:3000/sitemap.xml — canonical links and sitemap are wrong"
  );
} else if (robots.status === 200) {
  row("NEXT_PUBLIC_SITE_URL", "SET", "robots.txt advertises a real origin");
}

// --- contact address --------------------------------------------------------
// Inference, labelled as such. Three cases produce a non-real address, and the
// first version of this script only checked one of them:
//
//   NEXT_PUBLIC_CONTACT_EMAIL set   -> that address (real)
//   ...unset, real SITE_URL         -> sales@<deployment host> (derived, not a mailbox)
//   ...unset, localhost SITE_URL    -> sales@example.com (visible placeholder)
//
// The live deployment showed the third, so checking only for the second reported
// a false OK. All three are now treated as unconfigured.
const contact = await probe("/contact");
if (contact.status === 200) {
  const lower = contact.text.toLowerCase();
  const addresses = [...new Set(lower.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) ?? [])];
  const realAddresses = addresses.filter(
    (a) =>
      !a.endsWith("@example.com") &&
      !a.includes("localhost") &&
      // Form placeholders, not contact identity: the footer's newsletter field
      // renders placeholder="YOUR@EMAIL.COM" and the checkout uses
      // john@example.com. A first version of this check reported "SET, shows
      // your@email.com" — a placeholder read as a configured address.
      !["your@email.com", "john@example.com", "you@company.com", "john@doe.com"].includes(a) &&
      !(host && a === `sales@${host.toLowerCase()}`)
  );
  if (addresses.length === 0) {
    row("NEXT_PUBLIC_CONTACT_EMAIL", "UNKNOWN", "/contact shows no email address at all");
  } else if (realAddresses.length === 0) {
    row(
      "NEXT_PUBLIC_CONTACT_EMAIL",
      "MISSING",
      `the contact page shows a placeholder (${addresses.join(", ")}) — set a real address before launch`
    );
  } else {
    row(
      "NEXT_PUBLIC_CONTACT_EMAIL",
      "SET",
      `the contact page shows ${realAddresses.join(", ")}`
    );
  }
  // Limitation, stated rather than hidden: this reads the rendered HTML, so it
  // cannot distinguish a real mailbox from a plausible-looking address that
  // nothing receives at. Only you can confirm the address actually works.
  if (realAddresses.length > 0) {
    row(
      "CONTACT ADDRESS REACHABLE",
      "UNKNOWN",
      "the address renders, but only a real send confirms a mailbox receives it"
    );
  }
}

// --- order email ------------------------------------------------------------
// Cannot read env from outside; the honest answer is "only you can confirm this".
row(
  "RESEND_API_KEY / MAIL_FROM / OWNER_ALERT_EMAIL",
  "UNKNOWN",
  "not externally observable — confirm by placing a test order and checking BOTH emails arrive (customer + owner alert)"
);

// --- report -----------------------------------------------------------------
console.log(`Configuration audit — ${base}\n`);
const width = Math.max(...rows.map((r) => r.setting.length));
for (const { setting, status, detail } of rows) {
  const mark = status === "SET" ? "OK     " : status === "UNKNOWN" ? "CHECK  " : "MISSING";
  console.log(`  ${mark} ${setting.padEnd(width)}  ${detail}`);
}

const missing = rows.filter((r) => r.status === "MISSING" || r.status === "WRONG");
console.log(
  missing.length === 0
    ? "\nNothing required is missing. Place one real order to confirm the last two rows."
    : `\n${missing.length} setting(s) outstanding. Each row names the variable to set.`
);
process.exit(missing.length === 0 ? 0 : 1);
