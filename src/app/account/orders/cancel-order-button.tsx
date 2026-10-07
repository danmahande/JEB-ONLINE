"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Customer self-service cancel (Round 26) — offered only while an order is
 * NEW. The API enforces ownership + the new_order rule; this button just
 * keeps the honest ask in front of the confirm dialog.
 */
export function CancelOrderButton({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    if (
      !window.confirm(
        `Cancel order ${orderNumber}? The items go back on the shelf and this can't be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error ?? "Could not cancel the order — try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-800 transition-colors hover:bg-red-50 disabled:opacity-50"
        disabled={busy}
        onClick={() => void cancel()}
        type="button"
      >
        {busy ? "Cancelling…" : "Cancel this order"}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
