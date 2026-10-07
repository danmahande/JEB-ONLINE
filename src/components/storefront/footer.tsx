"use client";

import { useState } from "react";
import Link from "next/link";
import Reveal from "@/components/storefront/reveal";
import { CONTACT_EMAIL } from "@/lib/site-config";

/* Task 58 — the footer joins the design system for real.
   Material: a machined steel head rail (same paint as the shopfront
   frame) landing the page onto the ink back-wall. Type: px-exact
   gauges per the Task 57 regime — Space Grotesk display wordmark,
   ms-label chrome, 13px Inter body — so the 85% html dial can't
   shrink any of it.

   Round 5 corrections (owner decisions): every link and button here
   is REAL — the newsletter posts to /api/subscribe, the SHOP column
   carries only destinations that exist (category queries the catalog
   actually filters), and invented rows (certifications, address,
   phone, hours) are gone until real ones exist. No fake stats, no
   fake reviews, no unheld certificates, no dead buttons. */

type SubStatus =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done" }
  | { kind: "error"; message: string };

/* The newsletter — a real form with a real endpoint. States are
   machine-simple on purpose: idle → sending → done (or error). */
function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubStatus>({ kind: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setStatus({ kind: "error", message: data.error || "Try again." });
        return;
      }
      setStatus({ kind: "done" });
      setEmail("");
    } catch {
      setStatus({ kind: "error", message: "Network error — try again." });
    }
  };

  return (
    <div className="mt-6 max-w-sm">
      <label
        htmlFor="footer-newsletter-email"
        className="ms-label mb-3 block text-white/60"
      >
        GET FIRST-ARRIVAL NOTES
      </label>
      {status.kind === "done" ? (
        <p
          className="ms-label flex items-center gap-2.5 text-white"
          role="status"
        >
          <span className="inline-block h-2 w-2 bg-brand" aria-hidden="true" />
          YOU&apos;RE ON THE LIST — FIRST NOTE LANDS WITH THE NEXT ARRIVAL
        </p>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="footer-newsletter-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="YOUR@EMAIL.COM"
              /* Tailwind-only styling on a bare input — the unlayered
                 .ms-field primitive would beat these utilities and paint
                 the field solid white on the ink wall (round-5 lesson). */
              className="w-full flex-1 rounded-[4px] border border-white/25 bg-white/10 px-3 py-2.5 text-[13px] text-white outline-none transition-colors placeholder:font-medium placeholder:tracking-wide placeholder:text-white/40 focus:border-brand disabled:opacity-50"
              disabled={status.kind === "sending"}
            />
            <button
              type="submit"
              className="ms-key ms-label px-4 py-2.5 whitespace-nowrap disabled:opacity-50"
              disabled={status.kind === "sending"}
            >
              {status.kind === "sending" ? "SENDING…" : "SUBSCRIBE"}
            </button>
          </div>
          {status.kind === "error" && (
            <p className="ms-label mt-2 text-brand" role="alert">
              {status.message}
            </p>
          )}
          <p className="ms-label mt-2 text-[10px] text-white/40">
            FIRST ARRIVALS AND PRICE NOTES. NO SPAM.
          </p>
        </form>
      )}
    </div>
  );
}

export default function Footer({
  onNavigate,
}: {
  onNavigate: (v: "shop" | "track", q?: string) => void;
}) {
  return (
    <footer className="mt-auto bg-ink text-white" aria-label="Footer">
      {/* the back wall's steel head — bolted on with the shopfront's
          own frame steel so the dark block reads as store hardware,
          not an unstyled end-cap */}
      <div className="ms-footer-rail" aria-hidden="true" />

      <div className="px-4 md:px-8 py-12 md:py-16">
        <Reveal className="grid gap-10 md:grid-cols-2">
          {/* brand plate */}
          <div>
            <p className="ms-display mb-1 text-[36px] md:text-[48px]">
              MERIDIAN
              <br />
              SUPPLY<span className="ml-2 inline-block h-2.5 w-2.5 bg-brand align-middle" aria-hidden="true" />
            </p>
            <p className="ms-label mb-5 text-white/40">GRAINS &amp; HARDWARE — EST. KAMPALA</p>
            <p className="max-w-sm text-[13px] leading-[21px] text-white/65">
              East African grains and hardware equipment, sold across borders.
              Orders are picked and dispatched from our Kampala warehouse with
              full cross-border documentation — from customs paperwork to
              last-mile delivery.
            </p>
            <NewsletterSignup />
          </div>

          {/* Shop — every destination is real: the category queries drive
              the same ?q= filter the search bar uses, so GRAINS lands on
              the grains rack, not a lie. */}
          <nav aria-label="Shop">
            <p className="ms-label mb-4 text-white/40">SHOP</p>
            <ul className="space-y-2.5">
              {(
                [
                  ["ALL PRODUCTS", "shop", ""],
                  ["GRAINS", "shop", "grains"],
                  ["HARDWARE", "shop", "hardware"],
                  ["TRACK ORDER", "track", ""],
                ] as const
              ).map(([label, target, q]) => (
                <li key={label}>
                  <button
                    onClick={() => onNavigate(target, q || undefined)}
                    className="group ms-label flex items-center gap-2.5 text-white/80 transition-colors hover:text-brand"
                  >
                    <span
                      className="inline-block h-1 w-1 bg-white/30 transition-colors group-hover:bg-brand"
                      aria-hidden="true"
                    />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </Reveal>

        {/* Divider */}
        <div className="my-10 border-t border-white/10"></div>

        {/* The two spec sheets — only rows the store can stand behind
            today. No certifications (none held), no street address or
            phone (none published yet), no invented hours. */}
        <Reveal delay={100}>
          <div className="md:grid md:grid-cols-3 gap-10">
            <div>
              <p className="ms-label mb-4 text-white/40">TRADE SPECIFICATIONS</p>
              <ul className="space-y-3">
                {(
                  [
                    ["ORIGIN", "KAMPALA, UGANDA"],
                    ["MARKETS", "UG · KE · TZ · RW · DRC · GLOBAL"],
                    ["INCOTERMS", "DAP / FOB KAMPALA"],
                    [
                      "PAYMENT",
                      "MTN MOMO · M-PESA · AIRTEL MONEY · BANK TRANSFER",
                    ],
                    ["SUPPORT", CONTACT_EMAIL.toUpperCase()],
                  ] as const
                ).map(([k, v]) => (
                  <li key={k} className="ms-label flex gap-3 leading-[1.7]">
                    <span className="w-[110px] shrink-0 text-white/35">{k}</span>
                    <span className="text-white/75">{v}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="ms-label mb-4 text-white/40">CONTACT</p>
              <ul className="space-y-3">
                {(
                  [
                    ["EMAIL", CONTACT_EMAIL.toUpperCase()],
                    ["ORDERS", "PLACED AND TRACKED ON THIS SITE"],
                  ] as const
                ).map(([k, v]) => (
                  <li key={k} className="ms-label flex gap-3 leading-[1.7]">
                    <span className="w-[110px] shrink-0 text-white/35">{k}</span>
                    <span className="text-white/75">{v}</span>
                  </li>
                ))}
                <li className="ms-label flex gap-3 leading-[1.7]">
                  <span className="w-[110px] shrink-0 text-white/35">MORE</span>
                  <Link
                    className="text-white/75 underline decoration-white/20 underline-offset-4 transition-colors hover:text-brand"
                    href="/contact"
                  >
                    CONTACT PAGE
                  </Link>
                </li>
              </ul>
              <button
                onClick={() => onNavigate("track")}
                className="ms-key ms-label mt-6 px-5 py-2.5"
              >
                TRACK AN ORDER
              </button>
            </div>

            <div>
              <p className="ms-label mb-4 text-white/40">LEGAL</p>
              <ul className="space-y-3">
                {(
                  [
                    ["PRIVACY POLICY", "/privacy"],
                    ["TERMS OF SERVICE", "/terms"],
                    ["SHIPPING POLICY", "/shipping"],
                  ] as const
                ).map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="ms-label flex gap-3 leading-[1.7] text-white/75 transition-colors hover:text-brand"
                    >
                      <span className="w-[110px] shrink-0 text-white/35">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-4 md:px-8">
        <p className="ms-label text-white/50">
          © {new Date().getFullYear()} MERIDIAN SUPPLY CO.
        </p>
        <p className="ms-label text-white/50">
          GRAINS &amp; HARDWARE — SOLD ACROSS BORDERS
        </p>
      </div>
    </footer>
  );
}
