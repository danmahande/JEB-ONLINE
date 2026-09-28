import { useState } from "react";
import { Drawer } from "vaul";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useCart, useRegion } from "@/lib/store";
import { fmt } from "@/lib/format";
import { leviesFor } from "@/lib/levies";
import { Button } from "@/components/ui/button";
import type { RegionConfig } from "@/lib/types";

export function CartDrawer({
  open,
  onOpenChange,
  regions,
  region,
  onCheckout,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  regions: RegionConfig[];
  region: string;
  onCheckout: () => void;
}) {
  const lines = useCart((s) => s.lines);
  const removeFromCart = useCart((s) => s.removeLine);
  const setQuantity = useCart((s) => s.setQty);
  const clear = useCart((s) => s.clear);
  const active = regions.find((r) => r.region === region)!;

  const subtotal = lines.reduce(
    (sum, l) => sum + l.qty * l.unitPriceUsd,
    0
  );

  // Calculate levies using the existing function
  const leviesList = leviesFor(region);
  const duty = leviesList.reduce((sum, levy) => {
    if (levy.code === 'DUTY') return sum + (levy.rate * subtotal);
    return sum;
  }, 0);
  const vat = leviesList.reduce((sum, levy) => {
    if (levy.code === 'VAT') return sum + (levy.rate * subtotal);
    return sum;
  }, 0);
  const freight = leviesList.reduce((sum, levy) => {
    if (levy.code === 'FREIGHT') return sum + (levy.rate * subtotal);
    return sum;
  }, 0);
  const total = subtotal + duty + vat + freight;
  
  // Loading state for checkout process
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = () => {
    setIsCheckingOut(true);
    // Simulate a brief loading state before transitioning
    setTimeout(() => {
      onCheckout();
      setIsCheckingOut(false);
    }, 500);
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 max-h-[90vh] overflow-hidden rounded-t-xl bg-white">
          <div className="sticky top-0 z-10 flex w-full items-center justify-center bg-white pb-3 pt-1.5">
            <div className="h-1.5 w-12 rounded-full bg-line" />
          </div>
          <div className="container mx-auto flex max-h-[75vh] flex-col px-4 pb-24 md:px-6">
            <div className="flex items-center justify-between pb-4">
              <Drawer.Title className="ms-display text-2xl">CART</Drawer.Title>
              <div className="flex items-center gap-4">
                <button
                  onClick={clear}
                  className="ms-label text-hush hover:text-ink disabled:opacity-40"
                  disabled={lines.length === 0}
                >
                  CLEAR
                </button>
                <Drawer.Close asChild>
                  <button className="ms-label text-hush hover:text-ink">
                    <Cross2Icon />
                  </button>
                </Drawer.Close>
              </div>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                <p className="ms-display mb-6 text-hush">EMPTY</p>
                <p className="mb-6 text-hush">ADD GRAINS OR HARDWARE TO CONTINUE</p>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="ms-label px-6 py-3"
                >
                  CONTINUE SHOPPING
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto pb-6">
                  <ul className="space-y-4">
                    {lines.map((l, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-4 border-b border-line pb-4"
                      >
                        <div className="relative size-20 flex-shrink-0 overflow-hidden rounded border border-line bg-muted">
                          <img
                            src={l.image || "/products/placeholder.png"}
                            alt={l.productLabel}
                            className="size-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{l.productLabel}</p>
                              <p className="text-sm text-hush">
                                {l.variantLabel}
                              </p>
                            </div>
                            <button
                              onClick={() => removeFromCart(l.productId, l.variantLabel)}
                              className="ms-label text-hush hover:text-ink"
                            >
                              <Cross2Icon />
                            </button>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <button
                              onClick={() =>
                                setQuantity(
                                  l.productId,
                                  l.variantLabel,
                                  Math.max(1, l.qty - 1)
                                )
                              }
                              className="ms-label size-8 flex-shrink-0 rounded border border-line"
                            >
                              −
                            </button>
                            <span className="ms-label w-8 text-center">
                              {l.qty}
                            </span>
                            <button
                              onClick={() =>
                                setQuantity(
                                  l.productId,
                                  l.variantLabel,
                                  l.qty + 1
                                )
                              }
                              className="ms-label size-8 flex-shrink-0 rounded border border-line"
                            >
                              +
                            </button>
                            <span className="ms-label ml-auto">
                              {fmt(l.unitPriceUsd * l.qty, active)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="sticky bottom-0 border-t border-line bg-white p-4">
                  <div className="space-y-3 pb-4">
                    <div className="flex justify-between text-sm">
                      <span>SUBTOTAL</span>
                      <span>{fmt(subtotal, active)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>DUTY ({(duty/subtotal)*100 || active.dutyRate * 100}%)</span>
                      <span>{fmt(duty, active)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>VAT ({(vat/subtotal)*100 || active.vatRate * 100}%)</span>
                      <span>{fmt(vat, active)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>FREIGHT</span>
                      <span>{fmt(freight, active)}</span>
                    </div>
                    <div className="flex justify-between border-t border-line pt-3 font-bold">
                      <span>TOTAL</span>
                      <span className="text-brand">{fmt(total, active)}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      className="ms-label px-4 py-3"
                    >
                      CONTINUE SHOPPING
                    </Button>
                    <Button
                      className="ms-label ms-key bg-primary hover:bg-primary/90 px-4 py-3 flex items-center justify-center gap-2"
                      onClick={handleCheckout}
                      disabled={isCheckingOut}
                    >
                      {isCheckingOut ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          PROCESSING...
                        </>
                      ) : (
                        `CHECKOUT (${fmt(total, active)})`
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}