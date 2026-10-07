"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RegionConfig } from "@/lib/types";

/**
 * Header/Footer wiring for the pages that are NOT the storefront itself
 * (privacy, terms, shipping, contact).
 *
 * Those pages used to pass `onNavigate={() => {}}` / `onOpenCart={() => {}}`
 * to the same Header the storefront uses — a header that LOOKS live (search
 * box, cart lamp) while swallowing every interaction, and a Footer whose
 * handler rewrote the current page's query string without navigating anywhere.
 *
 * The storefront is a client component that reads `view` and `q` from the URL
 * on mount, so these handlers simply navigate to the real routes it exposes:
 *   /            → shop
 *   /?q=term     → shop, pre-filtered
 *   /?view=track → order tracking
 *   /?cart=1     → shop with the cart drawer open
 *
 * The regions fetch mirrors the storefront hook so the header ticker shows the
 * same live FX line here as it does on the home page.
 */
export function useStoreChrome() {
  const router = useRouter();
  const [regions, setRegions] = useState<RegionConfig[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/fx", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (alive) setRegions(data?.regions || []);
      })
      .catch(() => {
        // Ticker simply stays without the FX line; never block the page.
      });
    return () => {
      alive = false;
    };
  }, []);

  const goShop = useCallback(
    (q?: string) => {
      router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
    },
    [router]
  );

  const goTrack = useCallback(() => {
    router.push("/?view=track");
  }, [router]);

  const openCart = useCallback(() => {
    router.push("/?cart=1");
  }, [router]);

  const navigate = useCallback(
    (view: "shop" | "track") => {
      if (view === "track") goTrack();
      else goShop();
    },
    [goShop, goTrack]
  );

  const footerNavigate = useCallback(
    (view: "shop" | "track", q?: string) => {
      if (view === "track") goTrack();
      else goShop(q);
    },
    [goShop, goTrack]
  );

  const submitSearch = useCallback(() => {
    goShop(query);
  }, [goShop, query]);

  return {
    regions,
    query,
    setQuery,
    navigate,
    footerNavigate,
    openCart,
    submitSearch,
  };
}
