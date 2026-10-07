import type { RegionConfig } from "@/lib/types";

/**
 * Transactional email — Round 26.
 *
 * Transport: Resend's HTTP API via plain fetch (no SDK dependency — the
 * whole integration is one POST). Configuration is entirely env-driven:
 *
 *   RESEND_API_KEY  — secret key from the Resend dashboard
 *   MAIL_FROM       — verified sender, e.g. "Meridian Supply <orders@…>"
 *   OWNER_ALERT_EMAIL — where new-order alerts go (defaults to MAIL_FROM)
 *
 * Without RESEND_API_KEY the module runs in LOG-ONLY mode: every send is
 * logged to the server console with full content and reported as
 * { sent: false, reason: "not_configured" }. Nothing throws — email must
 * never break an order, a status change, or a restock notification.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 5000;
const FROM_NAME = "Meridian Supply Co.";

export type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** A rendered email without a recipient — spread it with `to` to send. */
export type EmailTemplate = Omit<OutboundEmail, "to">;

export type SendResult = { sent: boolean; reason?: string };

export function isMailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim()
  );
}

function mailFrom(): string {
  const from = process.env.MAIL_FROM?.trim() || "";
  return from.includes("<") ? from : `${FROM_NAME} <${from}>`;
}

export function ownerAlertAddress(): string {
  return (
    process.env.OWNER_ALERT_EMAIL?.trim() ||
    process.env.MAIL_FROM?.trim() ||
    ""
  );
}

/** Send one email. Never throws — failures resolve to { sent: false }. */
export async function sendEmail(
  to: string,
  template: EmailTemplate
): Promise<SendResult> {
  const mail: OutboundEmail = { to, ...template };
  if (!mail.to) {
    console.warn(`[mail] no recipient for "${mail.subject}" — skipped`);
    return { sent: false, reason: "no_recipient" };
  }
  if (!isMailConfigured()) {
    console.info(
      `[mail:log-only] to=${mail.to} subject="${mail.subject}"\n${mail.text}`
    );
    return { sent: false, reason: "not_configured" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY?.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: mailFrom(),
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[mail] resend responded ${res.status}: ${body.slice(0, 300)}`);
      return { sent: false, reason: `http_${res.status}` };
    }
    return { sent: true };
  } catch (error) {
    console.error("[mail] send failed:", error);
    return { sent: false, reason: "network_error" };
  } finally {
    clearTimeout(timer);
  }
}

/** Fire-and-forget batch: log failures, never propagate them. */
export async function sendAll(
  ...jobs: { to: string; template: EmailTemplate }[]
): Promise<void> {
  const results = await Promise.allSettled(jobs.map((j) => sendEmail(j.to, j.template)));
  for (const r of results) {
    if (r.status === "rejected") console.error("[mail] unexpected rejection:", r.reason);
  }
}

// ---------------------------------------------------------------------------
// Templates — minimal inline-styled HTML. Steel-and-ink palette echoes the
// storefront (#111827 ink, #EA580C brand) but nothing depends on the site CSS.
// ---------------------------------------------------------------------------

function money(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

function shell(title: string, innerRows: [string, string][], body: string): string {
  const rows = innerRows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 0;color:#6B7280;font-size:12px;letter-spacing:.05em;text-transform:uppercase;width:40%">${k}</td><td style="padding:4px 0;color:#111827;font-size:14px;font-weight:600">${v}</td></tr>`
    )
    .join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #E5E7EB">
  <div style="background:#111827;padding:20px 24px">
    <p style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:.02em">MERIDIAN SUPPLY<span style="display:inline-block;width:8px;height:8px;background:#EA580C;margin-left:8px"></span></p>
    <p style="margin:4px 0 0;color:rgba(255,255,255,.55);font-size:11px;letter-spacing:.12em;text-transform:uppercase">${title}</p>
  </div>
  <div style="padding:20px 24px">
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">${rows}</table>
    <div style="color:#374151;font-size:14px;line-height:1.6">${body}</div>
  </div>
  <div style="border-top:1px solid #E5E7EB;padding:14px 24px;color:#9CA3AF;font-size:11px;letter-spacing:.06em;text-transform:uppercase">GRAINS &amp; HARDWARE — SOLD ACROSS BORDERS</div>
</div>`;
}

export type OrderEmailPayload = {
  orderNumber: string;
  trackingNumber: string | null;
  customerName: string;
  totalAmount: number;
  paymentMethod: string;
  destination: string | null;
  etaDays?: string;
  items: { productName: string; variant: string | null; qty: number; lineTotal: number }[];
};

export function orderConfirmationEmail(
  order: OrderEmailPayload,
  region: Pick<RegionConfig, "region" | "currency" | "rateToUsd" | "symbol"> | null
): EmailTemplate {
  const localTotal =
    region && region.currency !== "USD"
      ? ` (≈ ${region.currency} ${Math.round(order.totalAmount * region.rateToUsd).toLocaleString()})`
      : "";
  const itemRows = order.items
    .map(
      (li) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #F3F4F6;font-size:13px;color:#111827">${li.productName}${li.variant ? ` — ${li.variant}` : ""} × ${li.qty}</td><td style="padding:6px 0;border-bottom:1px solid #F3F4F6;font-size:13px;text-align:right;color:#111827">${money(li.lineTotal)}</td></tr>`
    )
    .join("");
  const text = [
    `Order ${order.orderNumber} confirmed`,
    ``,
    `Thank you, ${order.customerName}. Your order is confirmed as NEW ORDER — our warehouse team picks, packs and dispatches from here.`,
    `Payment: no money was charged on the site. Our team will contact you with payment instructions for ${order.paymentMethod}. Use ${order.orderNumber} as your payment reference.`,
    ``,
    ...order.items.map((li) => `- ${li.productName}${li.variant ? ` (${li.variant})` : ""} x${li.qty} = ${money(li.lineTotal)}`),
    `Total: ${money(order.totalAmount)}${localTotal}`,
    `Tracking: ${order.trackingNumber ?? "—"}`,
  ].join("\n");

  return {
    subject: `Order ${order.orderNumber} confirmed — Meridian Supply Co.`,
    html: shell(
      "ORDER CONFIRMED",
      [
        ["Order", order.orderNumber],
        ["Tracking", order.trackingNumber ?? "—"],
        ["Total", `${money(order.totalAmount)}${localTotal}`],
        ["Payment method", order.paymentMethod],
        ["Destination", order.destination ?? "—"],
      ],
      `<p style="margin:0 0 12px">Thank you, ${order.customerName}. Your order is confirmed — our warehouse team picks, packs and dispatches from here.</p>
       <p style="margin:0 0 12px;padding:12px;border:1px solid #FED7AA;background:#FFF7ED;color:#9A3412;font-size:13px"><b>No money was charged on this site.</b> Our team will contact you with payment instructions for ${order.paymentMethod}. Use <b>${order.orderNumber}</b> as your payment reference.</p>
       <table style="width:100%;border-collapse:collapse">${itemRows}</table>`
    ),
    text,
  };
}

export function newOrderAlertEmail(order: OrderEmailPayload): EmailTemplate {
  const text = [
    `New storefront order ${order.orderNumber}`,
    ``,
    `${order.customerName} — ${money(order.totalAmount)} via ${order.paymentMethod} — destination ${order.destination ?? "—"}`,
    ...order.items.map((li) => `- ${li.productName}${li.variant ? ` (${li.variant})` : ""} x${li.qty}`),
    ``,
    `Open the admin orders dashboard to accept and process it: /admin/orders/${order.orderNumber}`,
  ].join("\n");

  return {
    subject: `NEW ORDER ${order.orderNumber} — ${money(order.totalAmount)} — ${order.paymentMethod}`,
    html: shell(
      "NEW STOREFRONT ORDER",
      [
        ["Order", order.orderNumber],
        ["Customer", order.customerName],
        ["Total", money(order.totalAmount)],
        ["Payment", order.paymentMethod],
        ["Destination", order.destination ?? "—"],
      ],
      `<p style="margin:0 0 12px">A new order was placed on the storefront and is waiting in <b>/admin/orders</b>.</p>
       <p style="margin:0;color:#6B7280;font-size:13px">Items: ${order.items
         .map((li) => `${li.productName} ×${li.qty}`)
         .join(" · ")}</p>`
    ),
    text,
  };
}

export function orderStatusUpdateEmail(
  orderNumber: string,
  toStatus: string,
  note: string | null
): EmailTemplate {
  const label = toStatus.replaceAll("_", " ").toUpperCase();
  const text = [
    `Order ${orderNumber} update — status is now ${label}`,
    note ? `Note from our team: ${note}` : "",
    ``,
    `Track it any time with order number ${orderNumber} on the storefront.`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Order ${orderNumber} — ${label}`,
    html: shell(
      "ORDER UPDATE",
      [
        ["Order", orderNumber],
        ["Status", label],
      ],
      `<p style="margin:0 0 12px">Your order <b>${orderNumber}</b> is now <b>${label}</b>.</p>${
        note ? `<p style="margin:0;color:#6B7280;font-size:13px">Note from our team: ${note}</p>` : ""
      }`
    ),
    text,
  };
}

export function restockAlertEmail(
  productLabel: string,
  slug: string
): EmailTemplate {
  return {
    subject: `Back in stock: ${productLabel} — Meridian Supply Co.`,
    html: shell(
      "RESTOCK ALERT",
      [["Product", productLabel]],
      `<p style="margin:0 0 12px">Good news — <b>${productLabel}</b> is back in stock.</p>
       <p style="margin:0"><a href="/p/${slug}" style="color:#EA580C;font-weight:600">Open it in the storefront →</a></p>`
    ),
    text: `Back in stock: ${productLabel}. Open it in the storefront: /p/${slug}`,
  };
}
