import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatINR } from "@/lib/format";

type AdminClient = SupabaseClient<Database>;

type OrderEmail = {
  id: string;
  total_inr: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;
};

type OrderEmailItem = {
  product_name: string;
  quantity: number;
  unit_price_inr: number;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character]!;
  });
}

function emailLayout(title: string, content: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f6f3ee;font-family:Arial,sans-serif;color:#26352d">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:36px 12px;background:#f6f3ee">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden">
          <tr><td style="padding:30px 36px;background:#26352d;color:#fff">
            <p style="margin:0 0 8px;color:#e6b49c;letter-spacing:2px;font-size:12px;text-transform:uppercase">Art &amp; Decor</p>
            <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:400">${title}</h1>
          </td></tr>
          <tr><td style="padding:32px 36px;line-height:1.6">${content}</td></tr>
          <tr><td style="padding:20px 36px;background:#f6f3ee;color:#66736b;font-size:12px">
            Thoughtfully made, warmly lived in.<br />Art &amp; Decor
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

async function sendEmailOnce(
  admin: AdminClient,
  eventKey: string,
  recipient: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["RESEND_FROM_EMAIL"];
  if (!apiKey || !from) {
    throw new Error("Email notifications require RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }

  const { error: reserveError } = await admin
    .from("email_notifications")
    .upsert(
      { event_key: eventKey, recipient_email: recipient },
      { onConflict: "event_key", ignoreDuplicates: true },
    );
  if (reserveError) throw new Error(`Could not reserve email notification: ${reserveError.message}`);

  const { data: existing, error: lookupError } = await admin
    .from("email_notifications")
    .select("sent_at")
    .eq("event_key", eventKey)
    .single();
  if (lookupError) throw new Error(`Could not check email notification: ${lookupError.message}`);
  if (existing.sent_at) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": eventKey,
    },
    body: JSON.stringify({ from, to: [recipient], subject, html }),
  });
  if (!response.ok) {
    console.error("Email provider request failed", { status: response.status, eventKey });
    throw new Error(`Email provider request failed with status ${response.status}.`);
  }

  const { error: updateError } = await admin
    .from("email_notifications")
    .update({ sent_at: new Date().toISOString() })
    .eq("event_key", eventKey);
  if (updateError) throw new Error(`Could not record sent email: ${updateError.message}`);
  return true;
}

export async function sendWelcomeEmail(
  admin: AdminClient,
  userId: string,
  recipient: string,
  name: string,
): Promise<boolean> {
  const safeName = escapeHtml(name || "there");
  const html = emailLayout(
    "Welcome to Art & Decor",
    `<p>Dear ${safeName},</p>
     <p>We’re delighted to welcome you. Discover handcrafted art and thoughtful decor, made to bring warmth and character to your home.</p>
     <p>Whenever you find a piece you love, we’ll be here to help make it yours.</p>
     <p style="margin-top:28px">Warmly,<br /><strong>The Art &amp; Decor team</strong></p>`,
  );
  return sendEmailOnce(admin, `welcome-${userId}`, recipient, "Welcome to Art & Decor", html);
}

export async function sendOrderConfirmationEmail(
  admin: AdminClient,
  recipient: string,
  order: OrderEmail,
  items: OrderEmailItem[],
): Promise<boolean> {
  const rows = items
    .map(
      (item) => `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e8e5df">${escapeHtml(item.product_name)} × ${item.quantity}</td>
        <td align="right" style="padding:10px 8px;border-bottom:1px solid #e8e5df">${formatINR(item.unit_price_inr * item.quantity)}</td>
      </tr>`,
    )
    .join("");
  const address = [
    order.shipping_address,
    `${order.shipping_city}, ${order.shipping_state} ${order.shipping_pincode}`,
  ]
    .map(escapeHtml)
    .join("<br />");
  const html = emailLayout(
    "Your order is confirmed",
    `<p>Dear ${escapeHtml(order.shipping_name)},</p>
     <p>Thank you for your purchase. Your payment is confirmed, and we’re preparing your order.</p>
     <p style="padding:14px;background:#f6f3ee;border-radius:8px"><strong>Order ID:</strong> ${escapeHtml(order.id)}</p>
     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
       <thead><tr><th align="left" style="padding:10px 8px;border-bottom:2px solid #26352d">Item</th><th align="right" style="padding:10px 8px;border-bottom:2px solid #26352d">Amount</th></tr></thead>
       <tbody>${rows}</tbody>
       <tfoot><tr><td style="padding:14px 8px"><strong>Total paid</strong></td><td align="right" style="padding:14px 8px"><strong>${formatINR(order.total_inr)}</strong></td></tr></tfoot>
     </table>
     <h2 style="margin:26px 0 8px;font-size:16px">Delivery details</h2>
     <p style="margin:0">${address}<br />Phone: ${escapeHtml(order.shipping_phone)}</p>
     <p style="margin-top:28px">We’ll keep you updated as your order makes its way to you.</p>`,
  );
  return sendEmailOnce(
    admin,
    `order-${order.id}`,
    recipient,
    `Order confirmed - ${order.id}`,
    html,
  );
}
