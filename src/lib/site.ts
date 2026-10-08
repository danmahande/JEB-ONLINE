/**
 * Canonical origin of the deployment — used for metadataBase, canonical links,
 * product og:image URLs, sitemap.xml and robots.txt.
 *
 * This value comes from a dashboard field, so it arrives however someone
 * happened to type it. It is read at BUILD time (layout.tsx calls
 * `new URL(SITE_URL)` for metadataBase), which means a malformed value used to
 * break the whole build: a trailing slash, a stray space, or a markdown-styled
 * paste like `[https://example.com](https://example.com)` would throw inside
 * `new URL` and fail the deploy — after the environment variable was "correctly"
 * set. Failing a build over a formatting character is not a useful error.
 *
 * So the value is normalised instead, and anything unusable falls back to the
 * localhost default (loud in development, and harmless in production because
 * `scripts/check-config.mjs` reports the resulting localhost canonicals).
 */

// Exported so the normalisation is covered by tests instead of only by reading.
export function normaliseOrigin(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return "http://localhost:3000";

  // Markdown-style paste: [text](https://host) — keep the URL part.
  const markdown = value.match(/\]\((https?:\/\/[^\s)]+)\)/);
  const candidate = markdown ? markdown[1] : value;

  // Add a missing scheme rather than rejecting the value: "jeb-online.vercel.app"
  // is a reasonable thing to paste, and https is the only sensible reading.
  const withScheme = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;

  try {
    // `new URL` normalises a trailing slash, host casing and default ports, and
    // throws on anything genuinely unusable — which the fallback below catches.
    const url = new URL(withScheme);
    url.hash = "";
    url.search = "";
    return url.origin;
  } catch {
    return "http://localhost:3000";
  }
}

export const SITE_URL = normaliseOrigin(process.env.NEXT_PUBLIC_SITE_URL);

/** True while the canonical origin is still the local development default. */
export const IS_LOCAL_ORIGIN =
  SITE_URL.startsWith("http://localhost") || SITE_URL.startsWith("http://127.");
