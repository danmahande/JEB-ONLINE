import { z } from "zod";

const productVariantSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    priceDelta: z.number().finite().min(-1_000_000).max(1_000_000),
    weightKg: z.number().finite().min(0).max(1_000_000),
  })
  .strict();

const nullableText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .nullable() // stored rows carry real NULLs (e.g. the legacy `variant` column) — R21 auditor fix
    .transform((value) => value || null);

function isAllowedProductImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(url.hostname) &&
      !url.port &&
      !url.search &&
      !url.hash &&
      /^\/product-images\/[0-9a-f-]{36}\.webp$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

const productImagePath = z
  .string()
  .trim()
  .max(240)
  .nullable() // R21 auditor fix — same NULL-from-stored-row case as nullableText
  .transform((value) => value || null)
  .refine(
    (value) =>
      value === null ||
      /^\/products\/(?:[a-z0-9][a-z0-9._-]*\/)*[a-z0-9][a-z0-9._-]*\.(?:png|jpe?g|webp|avif)$/i.test(
        value
      ) ||
      isAllowedProductImageUrl(value),
    "Use an image in public/products or an uploaded Vercel product image."
  );

const productFieldsSchema = z
  .object({
    productId: z
      .string()
      .trim()
      .toUpperCase()
      .min(2)
      .max(40)
      .regex(/^[A-Z0-9][A-Z0-9._-]+$/),
    productLabel: z.string().trim().min(1).max(120),
    description: nullableText(4000),
    brand: nullableText(120),
    variant: nullableText(120),
    category: z.enum(["GRAINS", "HARDWARE"]),
    unit: z.string().trim().toUpperCase().min(1).max(40),
    weight: nullableText(80),
    minStock: z.number().int().min(0).max(2_147_483_647),
    unitCost: z.number().finite().min(0).max(1_000_000_000),
    unitSellingPrice: z.number().finite().min(0).max(1_000_000_000),
    image: productImagePath,
    hsCode: nullableText(40),
    originCountry: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Use a two-letter country code."),
    variants: z.array(productVariantSchema).max(30),
    isActive: z.boolean().default(true),
  })
  .strict();

function validateVariants(
  product: { unitSellingPrice: number; variants: { label: string; priceDelta: number }[] },
  context: z.RefinementCtx
) {
  const labels = new Set<string>();

  product.variants.forEach((variant, index) => {
    const normalizedLabel = variant.label.toLocaleLowerCase();
    if (labels.has(normalizedLabel)) {
      context.addIssue({
        code: "custom",
        path: ["variants", index, "label"],
        message: "Variant labels must be unique.",
      });
    }
    labels.add(normalizedLabel);

    if (product.unitSellingPrice + variant.priceDelta < 0) {
      context.addIssue({
        code: "custom",
        path: ["variants", index, "priceDelta"],
        message: "A variant price cannot reduce the selling price below zero.",
      });
    }
  });
}

export const adminProductCreateSchema = productFieldsSchema
  .extend({
    openingStock: z.number().int().min(0).max(2_147_483_647),
  })
  .superRefine(validateVariants);

export const adminProductPatchSchema = productFieldsSchema
  .omit({ isActive: true })
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .strict();

export const adminProductSnapshotSchema = productFieldsSchema.superRefine(
  validateVariants
);

export type AdminProductCreateInput = z.infer<typeof adminProductCreateSchema>;
export type AdminProductPatchInput = z.infer<typeof adminProductPatchSchema>;
