import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminProductCreateSchema,
  adminProductPatchSchema,
} from "./admin-products-schema";

const validProduct = {
  productId: "grn-maize-25",
  productLabel: "White maize flour",
  description: "",
  brand: "Meridian Mills",
  variant: "25KG BAG",
  category: "GRAINS",
  unit: "bag",
  weight: "25KG",
  minStock: 10,
  unitCost: 18.5,
  unitSellingPrice: 22,
  openingStock: 120,
  image: "",
  hsCode: "",
  originCountry: "ug",
  variants: [{ label: "25KG BAG", priceDelta: 0, weightKg: 25 }],
};

describe("admin product validation", () => {
  it("normalizes product identifiers and accepts a valid opening product", () => {
    const result = adminProductCreateSchema.safeParse(validProduct);

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.productId, "GRN-MAIZE-25");
    assert.equal(result.data.unit, "BAG");
    assert.equal(result.data.originCountry, "UG");
    assert.equal(result.data.openingStock, 120);
  });

  it("rejects negative stock, invalid origin codes, and non-local image paths", () => {
    assert.equal(
      adminProductCreateSchema.safeParse({ ...validProduct, openingStock: -1 }).success,
      false
    );
    assert.equal(
      adminProductCreateSchema.safeParse({ ...validProduct, originCountry: "UGA" }).success,
      false
    );
    assert.equal(
      adminProductCreateSchema.safeParse({
        ...validProduct,
        image: "https://images.example.com/product.png",
      }).success,
      false
    );
    assert.equal(
      adminProductCreateSchema.safeParse({
        ...validProduct,
        image: "/products/white-maize.png",
      }).success,
      true
    );
  });

  it("rejects duplicate variant labels and negative effective prices", () => {
    const duplicates = adminProductCreateSchema.safeParse({
      ...validProduct,
      variants: [
        { label: "25KG BAG", priceDelta: 0, weightKg: 25 },
        { label: "25kg bag", priceDelta: 1, weightKg: 25 },
      ],
    });
    const negativePrice = adminProductCreateSchema.safeParse({
      ...validProduct,
      unitSellingPrice: 2,
      variants: [{ label: "discount", priceDelta: -3, weightKg: 1 }],
    });

    assert.equal(duplicates.success, false);
    assert.equal(negativePrice.success, false);
  });

  it("does not permit product edits to change stock directly", () => {
    assert.equal(
      adminProductPatchSchema.safeParse({ currentStock: 5 }).success,
      false
    );
    assert.equal(adminProductPatchSchema.safeParse({ isActive: false }).success, true);
  });
});
