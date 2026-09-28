import { useState } from "react";
import { useCart, useRegion } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { fmt } from "@/lib/format";
import { leviesFor } from "@/lib/levies";
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
  const lines = useCart((s) => s.lines);
  const region = useRegion((s) => s.region);
  const { toast } = useToast();
  const active = regions.find((r) => r.region === region);

  // Check if active region exists, if not use the first available region
  const displayRegion = active || regions[0];

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
    country: "", // Will be derived from active region
  });

  const subtotal = lines.reduce(
    (sum, l) => sum + l.qty * l.unitPriceUsd,
    0
  );

  // Calculate levies using the existing function
  const leviesList = leviesFor(region);
  const duty = leviesList.reduce((sum, levy) => {
    return sum + (levy.rate * subtotal);
  }, 0);
  const vat = leviesList.reduce((sum, levy) => {
    // If levy is part of VAT base, add to VAT calculation
    const levyAmount = levy.inVatBase ? subtotal + duty : subtotal;
    return sum + (levy.rate * levyAmount);
  }, 0);
  const freight = displayRegion ? displayRegion.shippingBase + (lines.reduce((sum, l) => sum + l.weightKg * l.qty, 0) * displayRegion.shippingPerKg) : 0;
  const total = subtotal + duty + vat + freight;

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
    // Making postal code optional as per issue description
    
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
          customer: {
            ...customer,
            country: active?.countryName || regions[0].countryName // Use the current region's country name
          },
          lines: lines,
          region,
          // Only send essential data, let server calculate totals
          subtotal,
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
      if (!customer.address.trim()) newErrors.address = "Required";
      if (!customer.city.trim()) newErrors.city = "Required";
      
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
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="customer-name" className="ms-label mb-2 block text-hush">FULL NAME *</label>
                <input
                  id="customer-name"
                  type="text"
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer({ ...customer, name: e.target.value })
                  }
                  className={`ms-field w-full ${errors.name ? "border-red-500" : ""}`}
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500" role="alert">{errors.name}</p>
                )}
              </div>
              <div>
                <label htmlFor="customer-email" className="ms-label mb-2 block text-hush">EMAIL *</label>
                <input
                  id="customer-email"
                  type="email"
                  value={customer.email}
                  onChange={(e) =>
                    setCustomer({ ...customer, email: e.target.value })
                  }
                  className={`ms-field w-full ${errors.email ? "border-red-500" : ""}`}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500" role="alert">{errors.email}</p>
                )}
              </div>
              <div>
                <label htmlFor="customer-phone" className="ms-label mb-2 block text-hush">PHONE *</label>
                <input
                  id="customer-phone"
                  type="tel"
                  value={customer.phone}
                  onChange={(e) =>
                    setCustomer({ ...customer, phone: e.target.value })
                  }
                  className={`ms-field w-full ${errors.phone ? "border-red-500" : ""}`}
                  placeholder="+256..."
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500" role="alert">{errors.phone}</p>
                )}
              </div>
              <div>
                <label htmlFor="customer-company" className="ms-label mb-2 block text-hush">COMPANY</label>
                <input
                  id="customer-company"
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
                <label htmlFor="customer-address" className="ms-label mb-2 block text-hush">ADDRESS *</label>
                <input
                  id="customer-address"
                  type="text"
                  value={customer.address}
                  onChange={(e) =>
                    setCustomer({ ...customer, address: e.target.value })
                  }
                  className={`ms-field w-full ${errors.address ? "border-red-500" : ""}`}
                  placeholder="Street address"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-500" role="alert">{errors.address}</p>
                )}
              </div>
              <div>
                <label htmlFor="customer-city" className="ms-label mb-2 block text-hush">CITY *</label>
                <input
                  id="customer-city"
                  type="text"
                  value={customer.city}
                  onChange={(e) =>
                    setCustomer({ ...customer, city: e.target.value })
                  }
                  className={`ms-field w-full ${errors.city ? "border-red-500" : ""}`}
                  placeholder="Kampala"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-500" role="alert">{errors.city}</p>
                )}
              </div>
              <div>
                <label htmlFor="customer-postal" className="ms-label mb-2 block text-hush">POSTAL CODE</label>
                <input
                  id="customer-postal"
                  type="text"
                  value={customer.postalCode}
                  onChange={(e) =>
                    setCustomer({ ...customer, postalCode: e.target.value })
                  }
                  className="ms-field w-full"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="ms-label mb-2 block text-hush">COUNTRY</label>
                <input
                  type="text"
                  value={active?.countryName || regions[0].countryName}
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
            
            <div className="mb-8">
              <h3 className="ms-label mb-4 text-hush">DELIVERY ADDRESS</h3>
              <div className="rounded-lg border border-line bg-mist p-4">
                <p className="font-medium">{customer.name}</p>
                <p>{customer.company || "Individual"}</p>
                <p>{customer.address}</p>
                <p>{customer.city}, {customer.postalCode || 'N/A'}</p>
                <p>{active?.countryName || regions[0].countryName}</p>
                <p className="mt-2">{customer.email} · {customer.phone}</p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="ms-label mb-4 text-hush">ORDER ITEMS</h3>
              <div className="rounded-lg border border-line divide-y">
                {lines.map((l, i) => (
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
                          {l.variantLabel} · Qty: {l.qty}
                        </p>
                      </div>
                    </div>
                    <p className="font-medium">{displayRegion ? fmt(l.unitPriceUsd, displayRegion) : `$${l.unitPriceUsd.toFixed(2)}`}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-line bg-mist p-4 md:p-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>SUBTOTAL</span>
                  <span>{displayRegion ? fmt(subtotal, displayRegion) : `$${subtotal.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between">
                  <span>DUTY ({(duty/subtotal)*100 || (displayRegion ? displayRegion.dutyRate * 100 : 0)}%)</span>
                  <span>{displayRegion ? fmt(duty, displayRegion) : `$${duty.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT ({(vat/subtotal)*100 || (displayRegion ? displayRegion.vatRate * 100 : 0)}%)</span>
                  <span>{displayRegion ? fmt(vat, displayRegion) : `$${vat.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between">
                  <span>FREIGHT</span>
                  <span>{displayRegion ? fmt(freight, displayRegion) : `$${freight.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between border-t border-line pt-3 font-bold">
                  <span>TOTAL</span>
                  <span className="text-brand">{displayRegion ? fmt(total, displayRegion) : `$${total.toFixed(2)}`}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Pay */}
        {step === 3 && (
          <div className="rounded-lg border border-line bg-white p-6 md:p-8">
            <h2 className="ms-display mb-6 text-2xl">COMPLETE PAYMENT</h2>
            
            <div className="rounded-lg border border-line bg-mist p-6 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-ink text-white">
                {displayRegion?.currency || 'USD'}
              </div>
              <h3 className="mb-2 font-bold">Payment Processing</h3>
              <p className="text-sm text-hush mb-6">
                Your payment will be processed securely through our partner gateway.
              </p>
              
              <div className="space-y-4">
                <div className="flex justify-between text-left border-b pb-2">
                  <span>Amount to pay:</span>
                  <span className="font-bold text-brand">{displayRegion ? fmt(total, displayRegion) : `$${total.toFixed(2)}`}</span>
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
                      `PAY ${displayRegion ? fmt(total, displayRegion) : `$${total.toFixed(2)}`}`
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