"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductVariant } from "@/lib/types";
import { ProductImageField } from "./product-image-field";

type ManagedProduct = {
  id: string;
  productId: string;
  productLabel: string;
  description: string | null;
  brand: string | null;
  variant: string | null;
  category: "GRAINS" | "HARDWARE" | string;
  unit: string;
  weight: string | null;
  minStock: number;
  unitCost: number;
  unitSellingPrice: number;
  currentStock: number;
  isActive: boolean;
  slug: string;
  image: string | null;
  hsCode: string | null;
  originCountry: string;
  variants: ProductVariant[];
};

type VariantDraft = {
  label: string;
  priceDelta: string;
  weightKg: string;
};

type StockMovementRow = {
  id: string;
  productId: string;
  delta: number;
  resultingStock: number;
  reason: string;
  note: string | null;
  createdBy: string;
  createdAt: string;
};

type ProductDraft = {
  productId: string;
  productLabel: string;
  description: string;
  brand: string;
  variant: string;
  category: "GRAINS" | "HARDWARE";
  unit: string;
  weight: string;
  minStock: string;
  unitCost: string;
  unitSellingPrice: string;
  openingStock: string;
  image: string;
  hsCode: string;
  originCountry: string;
  variants: VariantDraft[];
};

type ProductResponse = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  products?: ManagedProduct[];
  product?: ManagedProduct;
};

function responseError(result: ProductResponse, fallback: string): string {
  const fieldError = Object.values(result.fieldErrors ?? {})
    .flat()
    .find((message): message is string => Boolean(message));
  return fieldError
    ? `${result.error ?? fallback} ${fieldError}`
    : result.error ?? fallback;
}

const emptyDraft: ProductDraft = {
  productId: "",
  productLabel: "",
  description: "",
  brand: "",
  variant: "",
  category: "GRAINS",
  unit: "BAG",
  weight: "",
  minStock: "10",
  unitCost: "0",
  unitSellingPrice: "0",
  openingStock: "0",
  image: "",
  hsCode: "",
  originCountry: "UG",
  variants: [],
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function draftFromProduct(product: ManagedProduct): ProductDraft {
  return {
    productId: product.productId,
    productLabel: product.productLabel,
    description: product.description ?? "",
    brand: product.brand ?? "",
    variant: product.variant ?? "",
    category: product.category === "HARDWARE" ? "HARDWARE" : "GRAINS",
    unit: product.unit,
    weight: product.weight ?? "",
    minStock: String(product.minStock),
    unitCost: String(product.unitCost),
    unitSellingPrice: String(product.unitSellingPrice),
    openingStock: String(product.currentStock),
    image: product.image ?? "",
    hsCode: product.hsCode ?? "",
    originCountry: product.originCountry,
    variants: product.variants.map((variant) => ({
      label: variant.label,
      priceDelta: String(variant.priceDelta),
      weightKg: String(variant.weightKg),
    })),
  };
}

function fieldValue(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

export function AdminProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  // Snapshot of what the form was opened with, so the dirty check can tell
  // "untouched" from "the owner typed something" without recomputing the
  // product-to-draft mapping on every render.
  const draftBaselineRef = useRef<string>(JSON.stringify(emptyDraft));
  /// Products with an isActive PATCH in flight, so that row's button can be
  /// disabled without freezing the rest of the list.
  const [togglingIds, setTogglingIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  // the form starts COLLAPSED — the inventory list is the daily surface;
  // a ~700px always-open form pushed it below the fold
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // ---- stock adjustment (Round 26) ----
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("receipt");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [adjustError, setAdjustError] = useState("");
  const [movements, setMovements] = useState<StockMovementRow[]>([]);

  const loadProducts = useCallback(async (signal?: AbortSignal): Promise<boolean> => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/products", {
        cache: "no-store",
        signal,
      });
      const result = (await response.json()) as ProductResponse;

      if (response.status === 401) {
        router.replace("/admin/login");
        return false;
      }
      if (!response.ok || !result.success || !Array.isArray(result.products)) {
        setError(result.error ?? "Products could not be loaded.");
        return false;
      }

      setProducts(result.products);
      return true;
    } catch {
      if (!signal?.aborted) {
        setError("Products could not be loaded. Check your connection and retry.");
      }
      return false;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void loadProducts(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadProducts]);

  const visibleProducts = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery =
        !query ||
        product.productLabel.toLowerCase().includes(query) ||
        product.productId.toLowerCase().includes(query) ||
        (product.brand ?? "").toLowerCase().includes(query);
      const matchesCategory =
        categoryFilter === "ALL" || product.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [categoryFilter, filter, products]);

  const activeCount = products.filter((product) => product.isActive).length;
  const lowStockCount = products.filter(
    (product) => product.isActive && product.currentStock <= product.minStock
  ).length;

  function updateDraft<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  /**
   * True when the form holds anything the owner typed. Compared against the
   * baseline this form was opened with (an existing product, or empty for a new
   * one), so an untouched edit form is not treated as dirty.
   *
   * draftBaselineRef rather than a computed default because draftFromProduct is
   * not pure-on-call: recomputing it here would fight the controlled inputs.
   */
  function isDraftDirty(): boolean {
    return JSON.stringify(draft) !== draftBaselineRef.current;
  }

  function beginEdit(product: ManagedProduct) {
    if (imageUploading) return;
    const next = draftFromProduct(product);
    setEditingId(product.id);
    setDraft(next);
    draftBaselineRef.current = JSON.stringify(next);
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function cancelEdit() {
    if (imageUploading) return;
    // A 15-field draft used to be discarded by a button sitting directly under
    // the header the owner just clicked. Ask only when there is something to
    // lose, so the common open-then-close path stays one click.
    if (isDraftDirty() && !window.confirm("Discard the unsaved product details?")) {
      return;
    }
    setEditingId(null);
    setDraft(emptyDraft);
    draftBaselineRef.current = JSON.stringify(emptyDraft);
    setFormOpen(false);
    setError("");
    setNotice("");
  }

  /* scroll/focus moved here from beginEdit: the heading only exists once the
     collapsed form has rendered, so the imperative same-tick DOM lookup would
     miss. The effect fires after render on every open or edit-target change. */
  useEffect(() => {
    if (!formOpen) return;
    const heading = document.getElementById("product-form-heading");
    heading?.scrollIntoView({ behavior: "smooth", block: "start" });
    heading?.focus();
  }, [formOpen, editingId]);

  function updateVariant(index: number, field: keyof VariantDraft, value: string) {
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant
      ),
    }));
  }

  function addVariant() {
    setDraft((current) => ({
      ...current,
      variants: [...current.variants, { label: "", priceDelta: "0", weightKg: "0" }],
    }));
  }

  function removeVariant(index: number) {
    setDraft((current) => ({
      ...current,
      variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (imageUploading) return;
    setError("");
    setNotice("");
    setSaving(true);

    const payload = {
      productId: draft.productId,
      productLabel: draft.productLabel,
      description: draft.description,
      brand: draft.brand,
      variant: draft.variant,
      category: draft.category,
      unit: draft.unit,
      weight: draft.weight,
      minStock: fieldValue(draft.minStock),
      unitCost: fieldValue(draft.unitCost),
      unitSellingPrice: fieldValue(draft.unitSellingPrice),
      image: draft.image,
      hsCode: draft.hsCode,
      originCountry: draft.originCountry,
      variants: draft.variants
        .filter((variant) => variant.label.trim())
        .map((variant) => ({
          label: variant.label,
          priceDelta: fieldValue(variant.priceDelta),
          weightKg: fieldValue(variant.weightKg),
        })),
    };

    try {
      const response = await fetch(
        editingId
          ? `/api/admin/products/${encodeURIComponent(editingId)}`
          : "/api/admin/products",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingId ? payload : { ...payload, openingStock: fieldValue(draft.openingStock) }
          ),
        }
      );
      const result = (await response.json()) as ProductResponse;

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok || !result.success) {
        setError(
          responseError(result, "Product could not be saved. Check the details and retry.")
        );
        return;
      }

      const refreshed = await loadProducts();
      setEditingId(null);
      setDraft(emptyDraft);
      setFormOpen(false);
      setNotice(
        refreshed
          ? editingId
            ? "Product details saved."
            : "Product added to the catalog."
          : "Product saved, but the product list could not refresh."
      );
    } catch {
      setError("Product could not be saved. Check your connection and retry.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product: ManagedProduct) {
    setError("");
    setNotice("");
    // A double-click during the PATCH + full list reload (~1-2s) used to fire a
    // second toggle and could land the product in the opposite state from the
    // label the owner read. Per-item flag, not a global one, so other rows stay
    // usable while this one settles.
    setTogglingIds((current) => [...current, product.id]);

    try {
      const response = await fetch(
        `/api/admin/products/${encodeURIComponent(product.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !product.isActive }),
        }
      );
      const result = (await response.json()) as ProductResponse;

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok || !result.success) {
        setError(responseError(result, "Product status could not be changed."));
        return;
      }

      await loadProducts();
      setNotice(product.isActive ? "Product hidden from the storefront." : "Product is live again.");
    } catch {
      setError("Product status could not be changed. Check your connection and retry.");
    } finally {
      setTogglingIds((current) => current.filter((id) => id !== product.id));
    }
  }

  /* ---- stock adjustment (Round 26) ------------------------------------
     Stock used to be display-only here BY DESIGN — there was no audited
     place for corrections to land. The StockMovement ledger is that place:
     every change is a signed delta with a reason, so warehouse stock and
     DB stock can be reconciled without touching order history. */
  function openAdjust(product: ManagedProduct) {
    setAdjustingId(product.id);
    setAdjustDelta("");
    setAdjustReason("receipt");
    setAdjustNote("");
    setAdjustError("");
    setMovements([]);
    void fetch(`/api/admin/stock?productId=${encodeURIComponent(product.productId)}&take=8`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : { success: false }))
      .then((d: { success: boolean; movements?: StockMovementRow[] }) => {
        if (d.success && Array.isArray(d.movements)) setMovements(d.movements);
      })
      .catch(() => undefined);
  }

  async function submitAdjustment(product: ManagedProduct) {
    const delta = Number(adjustDelta);
    if (!Number.isInteger(delta) || delta === 0) {
      setAdjustError("Enter a non-zero whole number (+ receipts, − shrinkage).");
      return;
    }
    setAdjustBusy(true);
    setAdjustError("");
    try {
      const response = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.productId,
          delta,
          reason: adjustReason,
          note: adjustNote.trim() || undefined,
        }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok || !result.success) {
        setAdjustError(result.error ?? "The adjustment failed. Try again.");
        return;
      }
      setNotice(
        `Stock adjusted for ${product.productLabel} (${delta > 0 ? "+" : ""}${delta}).`
      );
      setAdjustingId(null);
      await loadProducts();
    } catch {
      setAdjustError("The adjustment failed. Check your connection and retry.");
    } finally {
      setAdjustBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-line pb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Product catalog
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-hush">
            Add and update the products customers can buy. Hiding a product keeps its record
            and order history intact.
          </p>
        </div>
      </header>

      <section
        aria-label="Catalog overview"
        className="mt-6 grid gap-3 sm:grid-cols-3"
      >
        <div className="rounded-md border border-line bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-hush">Products</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{products.length}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-hush">Live in store</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{activeCount}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-hush">At/below minimum stock</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{lowStockCount}</p>
        </div>
      </section>

      <section
        aria-label="Product form"
        className="mt-8 rounded-md border border-line bg-white p-5 sm:p-7"
      >
        {formOpen ? (
        <div className="flex flex-col gap-2 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-hush">
              Catalog details
            </p>
            <h2
              className="mt-1 text-xl font-semibold leading-none tracking-tight text-ink"
              id="product-form-heading"
              tabIndex={-1}
            >
              {editingId ? "Edit product" : "Add a product"}
            </h2>
          </div>
          {editingId ? (
            <Button disabled={imageUploading} onClick={cancelEdit} type="button" variant="secondary">
              Cancel edit
            </Button>
          ) : (
            <Button disabled={imageUploading} onClick={() => setFormOpen(false)} type="button" variant="outline">
              Close
            </Button>
          )}
        </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-hush">
                Catalog details
              </p>
              <p className="mt-1 text-sm text-hush">
                Add a product when the range grows — the form stays out of the way
                until then.
              </p>
            </div>
            <Button
              aria-expanded={formOpen}
              onClick={() => setFormOpen(true)}
              type="button"
              className="sm:shrink-0"
            >
              + Add a product
            </Button>
          </div>
        )}

        {formOpen && (
        <form className="mt-6 space-y-7" onSubmit={handleSubmit}>
          <fieldset className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <legend className="sr-only">Product details</legend>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink" htmlFor="product-id">
                Product ID
              </label>
              <Input
                autoComplete="off"
                id="product-id"
                maxLength={40}
                onChange={(event) => updateDraft("productId", event.target.value)}
                pattern="[A-Za-z0-9][A-Za-z0-9._-]+"
                placeholder="GRN-MAIZE-25"
                required
                value={draft.productId}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="block text-sm font-medium text-ink" htmlFor="product-name">
                Product name
              </label>
              <Input
                id="product-name"
                maxLength={120}
                onChange={(event) => updateDraft("productLabel", event.target.value)}
                placeholder="White maize flour"
                required
                value={draft.productLabel}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink" htmlFor="product-category">
                Category
              </label>
              <select
                className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink focus-visible:border-brand"
                id="product-category"
                onChange={(event) =>
                  updateDraft(
                    "category",
                    event.target.value === "HARDWARE" ? "HARDWARE" : "GRAINS"
                  )
                }
                value={draft.category}
              >
                <option value="GRAINS">Grains</option>
                <option value="HARDWARE">Hardware</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink" htmlFor="product-brand">
                Brand
              </label>
              <Input
                id="product-brand"
                maxLength={120}
                onChange={(event) => updateDraft("brand", event.target.value)}
                value={draft.brand}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink" htmlFor="product-unit">
                Selling unit
              </label>
              <Input
                id="product-unit"
                maxLength={40}
                onChange={(event) => updateDraft("unit", event.target.value)}
                placeholder="BAG, PIECE, CARTON"
                required
                value={draft.unit}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink" htmlFor="product-variant">
                Default variant
              </label>
              <Input
                id="product-variant"
                maxLength={120}
                onChange={(event) => updateDraft("variant", event.target.value)}
                placeholder="25KG BAG"
                value={draft.variant}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink" htmlFor="product-weight">
                Weight / pack size
              </label>
              <Input
                id="product-weight"
                maxLength={80}
                onChange={(event) => updateDraft("weight", event.target.value)}
                placeholder="25KG"
                value={draft.weight}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink" htmlFor="product-origin">
                Country of origin (ISO code)
              </label>
              <Input
                autoCapitalize="characters"
                id="product-origin"
                maxLength={2}
                minLength={2}
                onChange={(event) => updateDraft("originCountry", event.target.value)}
                placeholder="UG"
                required
                value={draft.originCountry}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink" htmlFor="product-hs-code">
                HS customs code
              </label>
              <Input
                id="product-hs-code"
                maxLength={40}
                onChange={(event) => updateDraft("hsCode", event.target.value)}
                value={draft.hsCode}
              />
            </div>
          </fieldset>

          <fieldset className="grid gap-5 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <legend className="sr-only">Pricing and stock</legend>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink" htmlFor="product-cost">
                Unit cost (USD)
              </label>
              <Input
                id="product-cost"
                min="0"
                onChange={(event) => updateDraft("unitCost", event.target.value)}
                required
                step="0.01"
                type="number"
                value={draft.unitCost}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink" htmlFor="product-price">
                Selling price (USD)
              </label>
              <Input
                id="product-price"
                min="0"
                onChange={(event) => updateDraft("unitSellingPrice", event.target.value)}
                required
                step="0.01"
                type="number"
                value={draft.unitSellingPrice}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink" htmlFor="product-min-stock">
                Low-stock threshold
              </label>
              <Input
                id="product-min-stock"
                min="0"
                onChange={(event) => updateDraft("minStock", event.target.value)}
                required
                step="1"
                type="number"
                value={draft.minStock}
              />
            </div>
            <div className="space-y-2">
              {editingId ? (
                <>
                  <label className="block text-sm font-medium text-ink" htmlFor="product-current-stock">
                    Current stock
                  </label>
                  <Input
                    id="product-current-stock"
                    readOnly
                    type="number"
                    value={draft.openingStock}
                  />
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium text-ink" htmlFor="product-opening-stock">
                    Opening stock
                  </label>
                  <Input
                    id="product-opening-stock"
                    min="0"
                    onChange={(event) => updateDraft("openingStock", event.target.value)}
                    required
                    step="1"
                    type="number"
                    value={draft.openingStock}
                  />
                </>
              )}
            </div>
          </fieldset>

          <fieldset className="space-y-4 border-t border-line pt-6">
            <legend className="text-sm font-semibold text-ink">
              Sellable pack variants
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mt-1 text-sm text-hush">
                  Add a label, extra price in USD, and weight in kilograms for each pack.
                </p>
              </div>
              <Button onClick={addVariant} type="button" variant="secondary">
                Add variant
              </Button>
            </div>
            {draft.variants.length ? (
              <div className="space-y-3">
                {draft.variants.map((variant, index) => (
                  <div
                    className="grid gap-3 rounded-md border border-line bg-mist p-3 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]"
                    key={`variant-${index}`}
                  >
                    <div className="space-y-1">
                      <label
                        className="block text-xs font-medium text-hush"
                        htmlFor={`variant-label-${index}`}
                      >
                        Pack label
                      </label>
                      <Input
                        id={`variant-label-${index}`}
                        maxLength={80}
                        onChange={(event) => updateVariant(index, "label", event.target.value)}
                        placeholder="25KG BAG"
                        value={variant.label}
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        className="block text-xs font-medium text-hush"
                        htmlFor={`variant-price-${index}`}
                      >
                        Price difference (USD)
                      </label>
                      <Input
                        id={`variant-price-${index}`}
                        onChange={(event) =>
                          updateVariant(index, "priceDelta", event.target.value)
                        }
                        step="0.01"
                        type="number"
                        value={variant.priceDelta}
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        className="block text-xs font-medium text-hush"
                        htmlFor={`variant-weight-${index}`}
                      >
                        Weight (kg)
                      </label>
                      <Input
                        id={`variant-weight-${index}`}
                        min="0"
                        onChange={(event) =>
                          updateVariant(index, "weightKg", event.target.value)
                        }
                        step="0.01"
                        type="number"
                        value={variant.weightKg}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        aria-label={`Remove variant ${index + 1}`}
                        className="w-full sm:w-auto"
                        onClick={() => removeVariant(index)}
                        type="button"
                        variant="outline"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-line px-4 py-3 text-sm text-hush">
                No pack variants. The product will use its default unit and price.
              </p>
            )}
          </fieldset>

          <fieldset className="grid gap-5 border-t border-line pt-6 sm:grid-cols-2">
            <legend className="sr-only">Product description and image</legend>
            <ProductImageField
              onChange={(image) => updateDraft("image", image)}
              onUploadingChange={setImageUploading}
              value={draft.image}
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink" htmlFor="product-description">
                Product description
              </label>
              <textarea
                className="min-h-24 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:border-brand"
                id="product-description"
                maxLength={4000}
                onChange={(event) => updateDraft("description", event.target.value)}
                value={draft.description}
              />
            </div>
          </fieldset>

          <div className="border-t border-line pt-5">
            <p className="text-xs leading-5 text-hush">
              Opening stock is set only when a product is created. Later stock adjustments
              need a movement-history workflow; editing product details will not change stock.
            </p>
            {error ? (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button className="mt-5" disabled={saving || imageUploading} type="submit">
              {saving ? "Saving..." : imageUploading ? "Uploading image..." : editingId ? "Save product" : "Add product"}
            </Button>
          </div>
        </form>
        )}
      </section>

      <section aria-labelledby="product-list-heading" className="mt-9">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-hush">
              Inventory catalog
            </p>
            <h2
              className="mt-1 text-xl font-semibold leading-none tracking-tight text-ink"
              id="product-list-heading"
            >
              Products
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(14rem,1fr)_12rem]">
            <label className="sr-only" htmlFor="product-search">
              Search by product, ID, or brand
            </label>
            <Input
              id="product-search"
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search products..."
              type="search"
              value={filter}
            />
            <label className="sr-only" htmlFor="category-filter">
              Filter by category
            </label>
            <select
              className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink focus-visible:border-brand"
              id="category-filter"
              onChange={(event) => setCategoryFilter(event.target.value)}
              value={categoryFilter}
            >
              <option value="ALL">All categories</option>
              <option value="GRAINS">Grains</option>
              <option value="HARDWARE">Hardware</option>
            </select>
          </div>
        </div>

        {notice ? (
          <p
            className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
            role="status"
          >
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-5 rounded-md border border-line bg-white p-5 text-sm text-hush" role="status">
            Loading products...
          </p>
        ) : visibleProducts.length ? (
          <ul className="mt-5 grid gap-3 lg:grid-cols-2">
            {visibleProducts.map((product) => {
              const lowStock = product.currentStock <= product.minStock;
              return (
                <li
                  className="rounded-md border border-line bg-white p-5"
                  key={product.id}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      {/* catalog thumbnail — the same image the storefront tile
                          shows (local /products path or a Vercel Blob URL; the
                          blob host is allowlisted in next.config remotePatterns) */}
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-line bg-mist">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-[9px] font-semibold uppercase tracking-wide text-hush">
                            No image
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ink">
                            {product.productLabel}
                          </h3>
                          <span
                            className={`rounded-sm px-2 py-1 text-xs font-semibold ${
                              product.isActive
                                ? "bg-green-50 text-green-800"
                                : "bg-secondary text-hush"
                            }`}
                          >
                            {product.isActive ? "LIVE" : "HIDDEN"}
                          </span>
                          {product.isActive && product.currentStock === 0 ? (
                            <span className="rounded-sm bg-red-50 px-2 py-1 text-xs font-semibold text-red-800">
                              SOLD OUT
                            </span>
                          ) : product.isActive && lowStock ? (
                            <span className="rounded-sm bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-800">
                              LOW STOCK
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs font-medium tracking-wide text-hush">
                          {product.productId} · {product.category} · {product.unit}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={imageUploading}
                        onClick={() => beginEdit(product)}
                        type="button"
                        variant="secondary"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() =>
                          adjustingId === product.id ? setAdjustingId(null) : openAdjust(product)
                        }
                        type="button"
                        variant="secondary"
                      >
                        {adjustingId === product.id ? "Close stock" : "Stock"}
                      </Button>
                      <Button
                        disabled={togglingIds.includes(product.id)}
                        onClick={() => void toggleActive(product)}
                        type="button"
                        variant="outline"
                      >
                        {togglingIds.includes(product.id)
                          ? "Working…"
                          : product.isActive
                            ? "Hide"
                            : "Publish"}
                      </Button>
                    </div>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-hush">Selling price</dt>
                      <dd className="mt-1 text-sm font-semibold text-ink">
                        {currency.format(product.unitSellingPrice)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-hush">Unit cost</dt>
                      <dd className="mt-1 text-sm font-semibold text-ink">
                        {currency.format(product.unitCost)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-hush">Current stock</dt>
                      <dd
                        className={`mt-1 text-sm font-semibold ${
                          lowStock ? "text-destructive" : "text-ink"
                        }`}
                      >
                        {product.currentStock} {product.unit}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-hush">Low-stock threshold</dt>
                      <dd className="mt-1 text-sm font-semibold text-ink">
                        {product.minStock} {product.unit}
                      </dd>
                    </div>
                  </dl>

                  {product.variants.length ? (
                    <p className="mt-4 text-xs leading-5 text-hush">
                      Packs:{" "}
                      {product.variants
                        .map((variant) => `${variant.label} (${variant.weightKg} kg)`)
                        .join(", ")}
                    </p>
                  ) : null}

                  {adjustingId === product.id ? (
                    <div className="mt-5 rounded-md border border-line bg-mist p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-hush">
                        Adjust stock — current {product.currentStock} {product.unit}, threshold{" "}
                        {product.minStock}
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <label
                            className="block text-sm font-medium text-ink"
                            htmlFor={`adjust-delta-${product.id}`}
                          >
                            Change (+ receipt / − shrink)
                          </label>
                          <Input
                            autoComplete="off"
                            id={`adjust-delta-${product.id}`}
                            inputMode="numeric"
                            onChange={(event) => setAdjustDelta(event.target.value)}
                            placeholder="e.g. 40 or -2"
                            value={adjustDelta}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label
                            className="block text-sm font-medium text-ink"
                            htmlFor={`adjust-reason-${product.id}`}
                          >
                            Reason
                          </label>
                          <select
                            className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink focus-visible:border-brand"
                            id={`adjust-reason-${product.id}`}
                            onChange={(event) => setAdjustReason(event.target.value)}
                            value={adjustReason}
                          >
                            <option value="receipt">Stock received</option>
                            <option value="count_correction">Count correction</option>
                            <option value="damage">Damage / loss</option>
                            <option value="adjustment">Other adjustment</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label
                            className="block text-sm font-medium text-ink"
                            htmlFor={`adjust-note-${product.id}`}
                          >
                            Note (optional)
                          </label>
                          <Input
                            autoComplete="off"
                            id={`adjust-note-${product.id}`}
                            maxLength={500}
                            onChange={(event) => setAdjustNote(event.target.value)}
                            placeholder="e.g. GRN #2241 from Kasese mill"
                            value={adjustNote}
                          />
                        </div>
                      </div>
                      {adjustError ? (
                        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                          {adjustError}
                        </p>
                      ) : null}
                      <div className="mt-3">
                        <Button
                          disabled={adjustBusy}
                          onClick={() => void submitAdjustment(product)}
                          type="button"
                        >
                          {adjustBusy ? "Applying..." : "Apply adjustment"}
                        </Button>
                      </div>
                      {movements.length ? (
                        <ul className="mt-4 divide-y divide-line border-t border-line pt-2">
                          {movements.map((m) => (
                            <li key={m.id} className="flex flex-wrap justify-between gap-2 py-1.5 text-xs text-hush">
                              <span className="text-ink">
                                {m.delta > 0 ? `+${m.delta}` : m.delta} · {m.reason.replaceAll("_", " ")} →{" "}
                                {m.resultingStock} on shelf
                                {m.note ? ` · ${m.note}` : ""}
                              </span>
                              <span>
                                {new Date(m.createdAt).toLocaleString("en", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-xs text-hush">
                          No movements recorded for this product yet.
                        </p>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-5 rounded-md border border-dashed border-line bg-white p-6 text-sm text-hush">
            {products.length
              ? "No products match these filters."
              : "No products yet. Add the first product using the form above."}
          </p>
        )}
      </section>
    </main>
  );
}
