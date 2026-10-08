"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Operator = {
  id: string;
  regionCode: string;
  name: string;
  cargoRatePerKg: number;
  minCharge: number;
  transitDaysMin: number;
  transitDaysMax: number;
  bookingNote: string;
  isActive: boolean;
  sortOrder: number;
};

type RegionRow = { region: string; countryName: string };

type Draft = {
  name: string;
  cargoRatePerKg: string;
  minCharge: string;
  transitDaysMin: string;
  transitDaysMax: string;
  bookingNote: string;
};

const emptyDraft: Draft = {
  name: "",
  cargoRatePerKg: "",
  minCharge: "",
  transitDaysMin: "",
  transitDaysMax: "",
  bookingNote: "",
};

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export function AdminOperators() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // trade-config fetch state — an empty Corridor picker must SAY WHY: either
  // /api/fx failed (error) or the RegionConfig table has no rows (unseeded).
  // The first cut swallowed both silently and the picker just looked broken.
  const [fxError, setFxError] = useState("");

  // create form
  const [createRegion, setCreateRegion] = useState("");
  const [createDraft, setCreateDraft] = useState<Draft>(emptyDraft);
  const [createBusy, setCreateBusy] = useState(false);

  // edit state: the one operator currently expanded
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [editBusy, setEditBusy] = useState(false);
  /// Single notice timer, cleared before reuse so overlapping actions cannot
  /// cancel each other's dismissal.
  const noticeTimerRef = useRef<number | null>(null);
  /// Operator ids with an isActive PATCH in flight (per-row, not global).
  const [togglingIds, setTogglingIds] = useState<string[]>([]);

  const load = useCallback(async (signal?: AbortSignal): Promise<boolean> => {
    setLoading(true);
    setError("");
    setFxError("");
    try {
      const [opsRes, fxRes] = await Promise.all([
        fetch("/api/admin/operators", { cache: "no-store", signal }),
        fetch("/api/fx", { cache: "no-store", signal }),
      ]);
      if (opsRes.status === 401) {
        window.location.href = "/admin/login";
        return false;
      }
      const ops = await opsRes.json();
      if (!opsRes.ok || !ops.success) {
        setError(ops.error ?? "Operators could not be loaded.");
        return false;
      }
      setOperators(ops.operators as Operator[]);
      if (fxRes.ok) {
        const fx = await fxRes.json();
        if (fx.success) {
          setRegions(fx.regions as RegionRow[]);
        } else {
          setFxError("Trade configuration could not be loaded — the Corridor picker stays empty. Reload the page to retry.");
        }
      } else {
        setFxError("Trade configuration could not be loaded — the Corridor picker stays empty. Reload the page to retry.");
      }
      return true;
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setError("Operators could not be loaded. Check your connection and retry.");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const flash = (message: string) => {
    setNotice(message);
    setError("");
    // A single shared timer meant an overlapping action cancelled the previous
    // notice's timer, so a second message could vanish early. Clear first.
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(""), 4000);
  };

  const byRegion = useMemo(() => {
    const map = new Map<string, Operator[]>();
    for (const o of operators) {
      const list = map.get(o.regionCode) ?? [];
      list.push(o);
      map.set(o.regionCode, list);
    }
    return map;
  }, [operators]);

  const regionCountries = useMemo(
    () => new Map(regions.map((r) => [r.region, r.countryName])),
    [regions]
  );

  const countryFor = (code: string) =>
    regionCountries.get(code) ?? code;

  const draftFrom = (o: Operator): Draft => ({
    name: o.name,
    cargoRatePerKg: String(o.cargoRatePerKg),
    minCharge: String(o.minCharge),
    transitDaysMin: String(o.transitDaysMin),
    transitDaysMax: String(o.transitDaysMax),
    bookingNote: o.bookingNote,
  });

  function parseDraft(draft: Draft): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
    const rate = Number(draft.cargoRatePerKg);
    const min = Number(draft.minCharge);
    const tmin = Number(draft.transitDaysMin);
    const tmax = Number(draft.transitDaysMax);
    if (!draft.name.trim()) return { ok: false, error: "Operator name is required." };
    if (!Number.isFinite(rate) || rate <= 0) return { ok: false, error: "Cargo rate must be a number above zero." };
    if (!Number.isFinite(min) || min < 0) return { ok: false, error: "Minimum charge cannot be negative." };
    if (!Number.isInteger(tmin) || tmin < 1) return { ok: false, error: "Transit minimum must be a whole day count." };
    if (!Number.isInteger(tmax) || tmax < tmin) return { ok: false, error: "Transit maximum must be at least the minimum." };
    if (draft.bookingNote.trim().length < 5) return { ok: false, error: "A practical booking note is required." };
    return {
      ok: true,
      data: {
        name: draft.name.trim(),
        cargoRatePerKg: rate,
        minCharge: min,
        transitDaysMin: tmin,
        transitDaysMax: tmax,
        bookingNote: draft.bookingNote.trim(),
      },
    };
  }

  async function createOperator() {
    if (!createRegion) {
      setError("Choose the corridor the operator serves.");
      return;
    }
    const parsed = parseDraft(createDraft);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setCreateBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regionCode: createRegion, ...parsed.data }),
      });
      const result = await res.json();
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok || !result.success) {
        setError(result.error ?? "The operator could not be created.");
        return;
      }
      setOperators((prev) => [...prev, result.operator as Operator]);
      setCreateDraft(emptyDraft);
      flash(`${result.operator.name} added to ${result.operator.regionCode}.`);
    } catch {
      setError("The operator could not be created. Check your connection and retry.");
    } finally {
      setCreateBusy(false);
    }
  }

  async function patchOperator(id: string, body: Record<string, unknown>, successMessage: string) {
    setEditBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/operators/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return false;
      }
      if (!res.ok || !result.success) {
        setError(result.error ?? "The update did not save.");
        return false;
      }
      setOperators((prev) => prev.map((o) => (o.id === id ? (result.operator as Operator) : o)));
      flash(successMessage);
      return true;
    } catch {
      setError("The update did not save. Check your connection and retry.");
      return false;
    } finally {
      setEditBusy(false);
    }
  }

  async function saveEdit() {
    if (!editingId) return;
    const parsed = parseDraft(editDraft);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const done = await patchOperator(editingId, parsed.data, "Operator updated — future checkouts quote the new tariff.");
    if (done) {
      setEditingId(null);
      setEditDraft(emptyDraft);
    }
  }

  async function toggleActive(o: Operator) {
    // Per-row flag: the hide/activate PATCH triggers a full reload, and the
    // button used to stay live through it (~1-2s), so a double-click could land
    // the operator in the state opposite to the label the owner just read.
    setTogglingIds((current) => [...current, o.id]);
    try {
      await patchOperator(
        o.id,
        { isActive: !o.isActive },
        `${o.name} ${o.isActive ? "hidden from checkout" : "re-activated"}.`
      );
    } finally {
      setTogglingIds((current) => current.filter((id) => id !== o.id));
    }
  }

  const regionHeader = (code: string, list: Operator[]) => (
    <section key={code} className="mt-8">
      <div className="flex items-baseline justify-between border-b border-line pb-2">
        <h2 className="text-lg font-semibold text-ink">
          {code} <span className="text-sm font-normal text-hush">· {countryFor(code)}</span>
        </h2>
        <span className="text-xs text-hush">
          {list.filter((o) => o.isActive).length} of {list.length} active
        </span>
      </div>
      <ul className="divide-y divide-line">
        {list.map((o) => (
          <li key={o.id} className="py-4">
            {editingId === o.id ? (
              <form
                className="rounded-lg border border-brand/40 bg-white p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveEdit();
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-hush">Name</span>
                    <input
                      className="w-full rounded-md border border-line px-3 py-2"
                      value={editDraft.name}
                      onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-hush">Cargo rate (USD/kg)</span>
                    <input
                      className="w-full rounded-md border border-line px-3 py-2"
                      inputMode="decimal"
                      value={editDraft.cargoRatePerKg}
                      onChange={(e) => setEditDraft({ ...editDraft, cargoRatePerKg: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-hush">Minimum charge (USD)</span>
                    <input
                      className="w-full rounded-md border border-line px-3 py-2"
                      inputMode="decimal"
                      value={editDraft.minCharge}
                      onChange={(e) => setEditDraft({ ...editDraft, minCharge: e.target.value })}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-hush">Transit min (days)</span>
                      <input
                        className="w-full rounded-md border border-line px-3 py-2"
                        inputMode="numeric"
                        value={editDraft.transitDaysMin}
                        onChange={(e) => setEditDraft({ ...editDraft, transitDaysMin: e.target.value })}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-hush">Transit max (days)</span>
                      <input
                        className="w-full rounded-md border border-line px-3 py-2"
                        inputMode="numeric"
                        value={editDraft.transitDaysMax}
                        onChange={(e) => setEditDraft({ ...editDraft, transitDaysMax: e.target.value })}
                      />
                    </label>
                  </div>
                  <label className="text-sm sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-hush">Booking note (shown at checkout)</span>
                    <textarea
                      className="w-full rounded-md border border-line px-3 py-2"
                      rows={2}
                      value={editDraft.bookingNote}
                      onChange={(e) => setEditDraft({ ...editDraft, bookingNote: e.target.value })}
                    />
                  </label>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Button size="sm" type="submit" disabled={editBusy}>
                    {editBusy ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setEditDraft(emptyDraft);
                    }}
                    disabled={editBusy}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">
                    {o.name}
                    {!o.isActive && (
                      <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs font-semibold uppercase text-hush">
                        Hidden
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-hush">
                    {usd(o.cargoRatePerKg)}/kg · min {usd(o.minCharge)} · {o.transitDaysMin}–{o.transitDaysMax} day
                    {o.transitDaysMax === 1 ? "" : "s"}
                  </p>
                  <p className="mt-1 max-w-xl text-sm text-hush">{o.bookingNote}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(o.id);
                      setEditDraft(draftFrom(o));
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={togglingIds.includes(o.id)}
                    onClick={() => void toggleActive(o)}
                  >
                    {togglingIds.includes(o.id)
                      ? "Working…"
                      : o.isActive
                        ? "Hide"
                        : "Activate"}
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-line pb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Bus cargo operators
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-hush">
            The tariffs checkout quotes freight from on each corridor. Orders
            snapshot the tariff at checkout, so edits change future quotes only —
            historical order money is never rewritten. Hide an operator to pull
            it from checkout without deleting it.
          </p>
        </div>
      </header>

      {loading ? (
        <p className="mt-8 text-sm text-hush">Loading operators…</p>
      ) : (
        <>
          {notice && (
            <p role="status" className="mt-6 rounded-md border border-line bg-muted px-4 py-3 text-sm text-ink">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {[...byRegion.entries()].map(([code, list]) => regionHeader(code, list))}

          {fxError && (
            <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {fxError}
            </p>
          )}
          {!fxError && regions.length === 0 && (
            <p role="status" className="mt-6 rounded-md border border-line bg-muted px-4 py-3 text-sm text-ink">
              No corridors are configured in this environment&apos;s database — the
              region table has no rows. Seed the catalog and regions
              (&quot;db:seed&quot; against this database) and reload; the
              storefront&apos;s region selector and ticker read the same table.
            </p>
          )}

          <form
            className="mt-10 rounded-lg border border-line bg-white p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void createOperator();
            }}
          >
            <h2 className="text-lg font-semibold text-ink">Add an operator</h2>
            <p className="mt-1 text-sm text-hush">
              New corridor or operator. The (corridor, name) pair must be unique.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-hush">Corridor</span>
                <select
                  className="w-full rounded-md border border-line px-3 py-2"
                  value={createRegion}
                  onChange={(e) => setCreateRegion(e.target.value)}
                >
                  <option value="">Choose…</option>
                  {regions.map((r) => (
                    <option key={r.region} value={r.region}>
                      {r.region} · {r.countryName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-hush">Name</span>
                <input
                  className="w-full rounded-md border border-line px-3 py-2"
                  value={createDraft.name}
                  onChange={(e) => setCreateDraft({ ...createDraft, name: e.target.value })}
                  placeholder="e.g. Kampala Coach"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-hush">Cargo rate (USD/kg)</span>
                <input
                  className="w-full rounded-md border border-line px-3 py-2"
                  inputMode="decimal"
                  value={createDraft.cargoRatePerKg}
                  onChange={(e) => setCreateDraft({ ...createDraft, cargoRatePerKg: e.target.value })}
                  placeholder="1.00"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-hush">Minimum charge (USD)</span>
                <input
                  className="w-full rounded-md border border-line px-3 py-2"
                  inputMode="decimal"
                  value={createDraft.minCharge}
                  onChange={(e) => setCreateDraft({ ...createDraft, minCharge: e.target.value })}
                  placeholder="10"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-hush">Transit min</span>
                  <input
                    className="w-full rounded-md border border-line px-3 py-2"
                    inputMode="numeric"
                    value={createDraft.transitDaysMin}
                    onChange={(e) => setCreateDraft({ ...createDraft, transitDaysMin: e.target.value })}
                    placeholder="1"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-hush">Transit max</span>
                  <input
                    className="w-full rounded-md border border-line px-3 py-2"
                    inputMode="numeric"
                    value={createDraft.transitDaysMax}
                    onChange={(e) => setCreateDraft({ ...createDraft, transitDaysMax: e.target.value })}
                    placeholder="2"
                  />
                </label>
              </div>
              <label className="text-sm lg:col-span-3">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-hush">Booking note</span>
                <textarea
                  className="w-full rounded-md border border-line px-3 py-2"
                  rows={2}
                  value={createDraft.bookingNote}
                  onChange={(e) => setCreateDraft({ ...createDraft, bookingNote: e.target.value })}
                  placeholder="Where the parcel is booked and how the receiver collects it"
                />
              </label>
            </div>
            <Button className="mt-4" type="submit" disabled={createBusy}>
              {createBusy ? "Creating…" : "Create operator"}
            </Button>
          </form>
        </>
      )}
    </main>
  );
}
