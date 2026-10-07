import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Public brand identity, in one place.
 *
 * These values used to be hardcoded across the footer, the contact page and all
 * three legal pages as `meridiansupply.co` / `sales@meridiansupply.co`. That
 * domain is published and is not owned by this store, so the live site was
 * advertising a third party as its legal contact and brand address while its
 * own canonicals pointed at localhost.
 *
 * Everything storefront-visible now comes from here:
 *
 *   NEXT_PUBLIC_SITE_URL      — the canonical origin (see src/lib/site.ts)
 *   NEXT_PUBLIC_CONTACT_EMAIL — the address shown to customers
 *
 * Neither is required to build: with no environment set the site renders the
 * deployment's own origin and derives an address from it, which cannot point at
 * a domain the owner does not control.
 */

/** Registrable host of the live deployment, e.g. "jeb-online.vercel.app". */
export const SITE_HOST = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return SITE_URL.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }
})();

/** True while the origin is still the local development default. */
const IS_LOCAL_ORIGIN =
  SITE_HOST.startsWith("localhost") || SITE_HOST.startsWith("127.");

export const SITE_NAME = "Meridian Supply Co.";

/**
 * Where customer email goes.
 *
 * Precedence: NEXT_PUBLIC_CONTACT_EMAIL, then an address on the deployment's
 * own host. A localhost origin would produce `sales@localhost:3000`, which is
 * worse than useless in a legal page, so it falls back to a clearly-fake
 * address instead of something that looks real.
 */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim().toLowerCase() ||
  (IS_LOCAL_ORIGIN ? "sales@example.com" : `sales@${SITE_HOST}`);

/**
 * The host to print as the site's own name in prose. A `*.vercel.app` preview
 * host is still a real, controlled address, so this is honest while a custom
 * domain is being arranged — and it changes automatically once
 * NEXT_PUBLIC_SITE_URL points at one.
 */
export const SITE_DISPLAY_DOMAIN = SITE_HOST;

export const contactMailto = `mailto:${CONTACT_EMAIL}`;

/**
 * Metadata shared by the pages that opt out of the storefront chrome choices.
 * Kept tiny on purpose: only the canonical origin matters for the legal pages.
 */
export function legalPageMetadata(title: string): Metadata {
  return { title, metadataBase: new URL(SITE_URL) };
}
