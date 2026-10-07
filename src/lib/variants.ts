import type { ProductVariant } from "./types";

/**
 * `Product.variants` is stored as a JSON string (prisma/schema.prisma). Every
 * reader used to call `JSON.parse(...)` inline; a single malformed row could
 * therefore throw inside a `.map()` and turn the whole catalog feed into a 500
 * for every buyer — while the PDP's own `parseVariants` already guarded the
 * same value. This module is the single guarded reader for that column.
 *
 * Two entry points, because reads and admin writes want different failure
 * behaviour:
 *
 *   parseProductVariants   — tolerant. Read paths (storefront feed, PDP,
 *                            admin list, order pricing) must never fail
 *                            because one row is damaged; a bad row degrades
 *                            to "no variants" instead of taking the page down.
 *   readStoredVariants     — reports `malformed` so the admin PATCH can still
 *                            refuse to save over a damaged row (its previous
 *                            behaviour) instead of silently normalising it to [].
 */

function isProductVariant(value: unknown): value is ProductVariant {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.label === "string" &&
    typeof candidate.priceDelta === "number" &&
    Number.isFinite(candidate.priceDelta) &&
    typeof candidate.weightKg === "number" &&
    Number.isFinite(candidate.weightKg)
  );
}

/** Tolerant reader — never throws, never returns non-variant shapes. */
export function parseProductVariants(
  raw: string | null | undefined
): ProductVariant[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isProductVariant);
  } catch {
    return [];
  }
}

/** Strict-aware reader — tells the caller whether the stored string was usable. */
export function readStoredVariants(raw: string | null | undefined): {
  variants: ProductVariant[];
  malformed: boolean;
} {
  if (!raw) return { variants: [], malformed: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { variants: [], malformed: true };
    const variants = parsed.filter(isProductVariant);
    // Entries that existed but did not survive validation are damage too —
    // reporting them as "fine, no variants" is how a bad row gets overwritten.
    return { variants, malformed: parsed.length !== variants.length };
  } catch {
    return { variants: [], malformed: true };
  }
}
