import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cartTotals } from "@/lib/format";
import { verifyRazorpaySignature } from "@/lib/razorpay-signature";

const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(50),
  shipping: z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
    address: z.string().trim().min(5).max(300),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    pincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit PIN code"),
  }),
});

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => checkoutSchema.parse(d))
  .handler(async ({ data, context }) => {
    const keyId = process.env["RAZORPAY_KEY_ID"];
    const keySecret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keyId || !keySecret) throw new Error("Online payments are not configured yet.");

    const ids = data.items.map((i) => i.productId);
    const { data: products, error } = await context.supabase.from("products").select("id,name,price_inr,stock,active").in("id", ids);
    if (error) throw new Error(error.message);

    const lines = data.items.map((i) => {
      const p = products?.find((x) => x.id === i.productId);
      if (!p || !p.active) throw new Error("A product in your cart is no longer available.");
      if (p.stock < i.quantity) throw new Error(`Only ${p.stock} left of ${p.name}.`);
      return { productId: p.id, name: p.name, price: p.price_inr, quantity: i.quantity };
    });
    const { total } = cartTotals(lines);

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${keyId}:${keySecret}`) },
      body: JSON.stringify({ amount: total * 100, currency: "INR", receipt: `rcpt_${Date.now()}` }),
    });
    if (!res.ok) {
      console.error("Razorpay order failed", res.status, await res.text());
      throw new Error("Could not start payment. Please try again.");
    }
    const rzp = (await res.json()) as { id: string };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = data.shipping;
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: context.userId, total_inr: total, razorpay_order_id: rzp.id,
        shipping_name: s.name, shipping_phone: s.phone, shipping_address: s.address,
        shipping_city: s.city, shipping_state: s.state, shipping_pincode: s.pincode,
      })
      .select("id")
      .single();
    if (oErr) throw new Error(oErr.message);
    await supabaseAdmin.from("order_items").insert(
      lines.map((l) => ({ order_id: order.id, product_id: l.productId, product_name: l.name, unit_price_inr: l.price, quantity: l.quantity })),
    );

    return { orderId: order.id, razorpayOrderId: rzp.id, amount: total * 100, keyId };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ razorpay_order_id: z.string().max(100), razorpay_payment_id: z.string().max(100), razorpay_signature: z.string().max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const secret = process.env["RAZORPAY_KEY_SECRET"];
    if (!secret) throw new Error("Payments not configured.");
    const ok = await verifyRazorpaySignature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature, secret);
    if (!ok) throw new Error("Payment verification failed.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders").select("id,status,user_id").eq("razorpay_order_id", data.razorpay_order_id).eq("user_id", context.userId).single();
    if (!order) throw new Error("Order not found.");
    if (order.status === "pending") {
      await supabaseAdmin.from("orders").update({ status: "paid", razorpay_payment_id: data.razorpay_payment_id }).eq("id", order.id);
      const { data: items } = await supabaseAdmin.from("order_items").select("product_id,quantity").eq("order_id", order.id);
      for (const it of items ?? []) {
        if (!it.product_id) continue;
        const { data: p } = await supabaseAdmin.from("products").select("stock").eq("id", it.product_id).single();
        if (p) await supabaseAdmin.from("products").update({ stock: Math.max(0, p.stock - it.quantity) }).eq("id", it.product_id);
      }
    }
    return { orderId: order.id };
  });
