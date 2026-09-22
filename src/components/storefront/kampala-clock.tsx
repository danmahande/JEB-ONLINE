"use client";

import { useEffect, useState } from "react";

const clockFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Kampala",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Live clock pinned to HQ time (Africa/Kampala, EAT).
 * SSR + first client render agree on the placeholder; the real time lands
 * one frame after mount (rAF keeps react-hooks/set-state-in-effect clean).
 */
export default function KampalaClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setTime(clockFmt.format(new Date()));
    const raf = requestAnimationFrame(tick);
    const iv = setInterval(tick, 30_000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(iv);
    };
  }, []);

  return (
    <span className="ms-label whitespace-nowrap" aria-label="Current time at Kampala headquarters">
      KAMPALA {time ?? "--:--"} EAT
    </span>
  );
}
