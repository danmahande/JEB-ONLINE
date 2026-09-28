import { useState } from "react";
import { useCart, useRegion } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { fmt } from "@/lib/format";
import { LEVIES } from "@/lib/levies";
import type { RegionConfig, PlacedOrder } from "@/lib/types";

export default function Checkout({
  regions,
  onPlaced,
  onBack,
}: {
  regions: RegionConfig[];
  onPlaced: (o: PlacedOrder) => void;
  onBack: () => void;
}) {
  const cart = useCart((s) => ({ ...s }));
  const region = useRegion((s) => s.region);
  const { toast } = useToast();
  const active = regions.find((r) => r.region === region)!;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [placing, setPlacing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    postalCode: "",
    country: active.country,
  });

  const subtotal = cart.lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPrice,
    0
  );

  const { duty, vat, freight, total } = LEVIES(subtotal, active);

  async function placeOrder() {
    setPlacing(true);
    setErrors({});
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!customer.name.trim()) newErrors.name = "Required";
    if (!customer.email.trim()) newErrors.email = "Required";
    else if (!/\S+@\S+\.\S+/.test(customer.email)) newErrors.email = "Invalid email";
    if (!customer.phone.trim()) newErrors.phone = "Required";
    if (!customer.address.trim()) newErrors.address = "Required";
    if (!customer.city.trim()) newErrors.city = "Required";
    if (!customer.postalCode.trim()) newErrors.postalCode = "Required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setPlacing(false);
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          lines: cart.lines,
          region,
          subtotal,
          duty,
          vat,
          freight,
          total,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to place order");
      }

      const placed = await res.json();
      onPlaced(placed);
    } catch (err) {
      toast({
        title: "ORDER FAILED",
        description: err instanceof Error ? err.message : "Could not place the order — try again.",
        variant: "destructive",
      });
    } finally {
      setPlacing(false);
    }
  }

  function goNext() {
    if (step === 1) {
      // Validate customer details
      const newErrors: Record<string, string> = {};
      if (!customer.name.trim()) newErrors.name = "Required";
      if (!customer.email.trim()) newErrors.email = "Required";
      else if (!/\S+@\S+\.\S+/.test(customer.email)) newErrors.email = "Invalid email";
      if (!customer.phone.trim()) newErrors.phone = "Required";
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }
    setStep(step === 1 ? 2 : 3);
  }

  function goBack() {
    if (step === 1) {
      onBack();
    } else {
      setStep(step === 3 ? 2 : 1);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <div className="mx-auto max-w-4xl">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <div
                  className={`flex size-8 items-center justify-center rounded-full ${
                    step >= s
                      ? "bg-ink text-white"
                      : "border border-line bg-white text-ink"
                  }`}
                >
                  {s}
                </div>
                <span className="ms-label text-xs">
                  {s === 1 ? "CUSTOMER" : s === 2 ? "REVIEW" : "PAY"}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex h-1 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-ink transition-all duration-300 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Customer details */}
        {step === 1 && (
          <div className="rounded-lg border border-line bg-white p-6 md:p-8">
            <h2 className="ms-display mb-6 text-2xl">DELIVERY DETAILS</h2>
            
            {placing && (
              <div className="mb-6 p-4 bg-muted rounded-md flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                <span>Processing your order...</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="ms-label mb-2 block text-hush">FULL NAME *</label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer({ ...customer, name: e.target.value })
                  }
                  className={`ms-field w-full ${errors.name ? "border-red-500" : ""}`}
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>
              <div>
                <label className="ms-label mb-2 block text-hush">EMAIL *</label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) =>
                    setCustomer({ ...customer, email: e.target.value })
                  }
                  className={`ms-field w-full ${errors.email ? "border-red-500" : ""}`}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>
              <div>
                <label className="ms-label mb-2 block text-hush">PHONE *</label>
                <input
                  type="tel"
                  value={customer.phone}
                  onChange={(e) =>
                    setCustomer({ ...customer, phone: e.target.value })
                  }
                  className={`ms-field w-full ${errors.phone ? "border-red-500" : ""}`}
                  placeholder="+256..."
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                )}
              </div>
              <div>
                <label className="ms-label mb-2 block text-hush">COMPANY</label>
                <input
                  type="text"
                  value={customer.company}
                  onChange={(e) =>
                    setCustomer({ ...customer, company: e.target.value })
                  }
                  className="ms-field w-full"
                  placeholder="Acme Ltd"
                />
              </div>
              <div className="md:col-span-2">
                <label className="ms-label mb-2 block text-hush">ADDRESS *</label>
                <input
                  type="text"
                  value={customer.address}
                  onChange={(e) =>
                    setCustomer({ ...customer, address: e.target.value })
                  }
                  className={`ms-field w-full ${errors.address ? "border-red-500" : ""}`}
                  placeholder="Street address"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-500">{errors.address}</p>
                )}
              </div>
              <div>
                <label className="ms-label mb-2 block text-hush">CITY *</label>
                <input
                  type="text"
                  value={customer.city}
                  onChange={(e) =>
                    setCustomer({ ...customer, city: e.target.value })
                  }
                  className={`ms-field w-full ${errors.city ? "border-red-500" : ""}`}
                  placeholder="Kampala"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-500">{errors.city}</p>
                )}
              </div>
              <div>
                <label className="ms-label mb-2 block text-hush">POSTAL CODE *</label>
                <input
                  type="text"
                  value={customer.postalCode}
                  onChange={(e) =>
                    setCustomer({ ...customer, postalCode: e.target.value })
                  }
                  className={`ms-field w-full ${errors.postalCode ? "border-red-500" : ""}`}
                  placeholder="12345"
                />
                {errors.postalCode && (
                  <p className="mt-1 text-sm text-red-500">{errors.postalCode}</p>
                )}
              </div>
              <div>
                <label className="ms-label mb-2 block text-hush">COUNTRY</label>
                <input
                  type="text"
                  value={customer.country}
                  readOnly
                  className="ms-field w-full bg-muted"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <div className="rounded-lg border border-line bg-white p-6 md:p-8">
            <h2 className="ms-display mb-6 text-2xl">REVIEW ORDER</h2>
            
            {placing && (
              <div className="mb-6 p-4 bg-muted rounded-md flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                <span>Confirming your order details...</span>
              </div>
            )}
            
            <div className="mb-8">
              <h3 className="ms-label mb-4 text-hush">DELIVERY ADDRESS</h3>
              <div className="rounded-lg border border-line bg-mist p-4">
                <p className="font-medium">{customer.name}</p>
                <p>{customer.company || "Individual"}</p>
                <p>{customer.address}</p>
                <p>{customer.city}, {customer.postalCode}</p>
                <p>{customer.country}</p>
                <p className="mt-2">{customer.email} · {customer.phone}</p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="ms-label mb-4 text-hush">ORDER ITEMS</h3>
              <div className="rounded-lg border border-line divide-y">
                {cart.lines.map((l, i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative size-16 overflow-hidden rounded bg-muted">
                        <img
                          src={l.image || "/products/placeholder.png"}
                          alt={l.productLabel}
                          className="size-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium">{l.productLabel}</p>
                        <p className="text-sm text-hush">
                          {l.variantLabel} · Qty: {l.quantity}
                        </p>
                      </div>
                    </div>
                    <p className="font-medium">{fmt(l.unitPrice, active)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-line bg-mist p-4 md:p-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>SUBTOTAL</span>
                  <span>{fmt(subtotal, active)}</span>
                </div>
                <div className="flex justify-between">
                  <span>DUTY ({active.dutyRate * 100}%)</span>
                  <span>{fmt(duty, active)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT ({active.vatRate * 100}%)</span>
                  <span>{fmt(vat, active)}</span>
                </div>
                <div className="flex justify-between">
                  <span>FREIGHT</span>
                  <span>{fmt(freight, active)}</span>
                </div>
                <div className="flex justify-between border-t border-line pt-3 font-bold">
                  <span>TOTAL</span>
                  <span className="text-brand">{fmt(total, active)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Pay */}
        {step === 3 && (
          <div className="rounded-lg border border-line bg-white p-6 md:p-8">
            <h2 className="ms-display mb-6 text-2xl">COMPLETE PAYMENT</h2>
            
            {placing && (
              <div className="mb-6 p-4 bg-muted rounded-md flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                <span>Processing payment...</span>
              </div>
            )}
            
            <div className="rounded-lg border border-line bg-mist p-6 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-ink text-white">
                $
              </div>
              <h3 className="mb-2 font-bold">Payment Processing</h3>
              <p className="text-sm text-hush mb-6">
                Your payment will be processed securely through our partner gateway.
              </p>
              
              <div className="space-y-4">
                <div className="flex justify-between text-left border-b pb-2">
                  <span>Amount to pay:</span>
                  <span className="font-bold text-brand">{fmt(total, active)}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <button
                    onClick={goBack}
                    className="ms-label ms-key ms-key-ink px-4 py-3"
                    disabled={placing}
                  >
                    BACK
                  </button>
                  <button
                    onClick={placeOrder}
                    disabled={placing}
                    className="ms-label ms-key px-4 py-3 flex items-center justify-center gap-2"
                  >
                    {placing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        PROCESSING...
                      </>
                    ) : (
                      `PAY ${fmt(total, active)}`
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={goBack}
            className="ms-label ms-key ms-key-ink px-6 py-3"
            disabled={placing}
          >
            {step === 1 ? "← CANCEL" : "← BACK"}
          </button>
          {step < 3 && (
            <button
              onClick={goNext}
              className="ms-label ms-key px-6 py-3"
              disabled={placing}
            >
              {step === 2 ? "CONTINUE TO PAY →" : "CONTINUE →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}