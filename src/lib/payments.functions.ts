import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cartTotals } from "@/lib/format";
import {
  calculateCouponTotals,
  getCouponDiscountPercent,
  normalizeCouponCode,
} from "@/lib/coupons";
import { verifyRazorpaySignature } from "@/lib/razorpay-signature";

const checkoutItemsSchema = z
  .array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1).max(20),
    }),
  )
  .min(1)
  .max(50);

const couponCodeSchema = z.string().trim().max(32).optional();

const checkoutSchema = z.object({
  items: checkoutItemsSchema,
  couponCode: couponCodeSchema,
  shipping: z.object({
    name: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
    address: z.string().trim().min(5).max(300),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    pincode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter a 6-digit PIN code"),
  }),
});

const couponQuoteSchema = z.object({
  items: checkoutItemsSchema,
  couponCode: z.string().trim().min(1).max(32),
});

function couponPercent(code: string): number {
  const percent = getCouponDiscountPercent(code);
  if (percent === null) throw new Error("Invalid coupon code.");
  return percent;
}

export const quoteCheckoutCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => couponQuoteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const percent = couponPercent(data.couponCode);
    const ids = data.items.map((item) => item.productId);
    const { data: products, error } = await context.supabase
      .from("products")
      .select("id,name,price_inr,stock,active")
      .in("id", ids);
    if (error) throw new Error(error.message);

    const lines = data.items.map((item) => {
      const product = products?.find((candidate) => candidate.id === item.productId);
      if (!product || !product.active)
        throw new Error("A product in your cart is no longer available.");
      if (product.stock < item.quantity)
        throw new Error(`Only ${product.stock} left of ${product.name}.`);
      return { productId: product.id, quantity: item.quantity, price: product.price_inr };
    });
    const totals = cartTotals(lines);
    const quote = calculateCouponTotals(totals.subtotal, totals.shipping, percent);
    if (quote.total <= 0) {
      throw new Error(
        "This coupon makes the order free, which cannot be paid through checkout. Please use a smaller discount coupon.",
      );
    }
    return { ...quote, couponCode: normalizeCouponCode(data.couponCode), discountPercent: percent };
  });

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => checkoutSchema.parse(d))
  .handler(async ({ data, context }) => {
    const keyId = process.env["RAZORPAY_KEY_ID"];
    const keySecret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keyId || !keySecret) throw new Error("Online payments are not configured yet.");

    const ids = data.items.map((i) => i.productId);
    const { data: products, error } = await context.supabase
      .from("products")
      .select("id,name,price_inr,stock,active")
      .in("id", ids);
    if (error) throw new Error(error.message);

    const lines = data.items.map((i) => {
      const p = products?.find((x) => x.id === i.productId);
      if (!p || !p.active) throw new Error("A product in your cart is no longer available.");
      if (p.stock < i.quantity) throw new Error(`Only ${p.stock} left of ${p.name}.`);
      return { productId: p.id, name: p.name, price: p.price_inr, quantity: i.quantity };
    });
    const baseTotals = cartTotals(lines);
    const percent = data.couponCode ? couponPercent(data.couponCode) : 0;
    const totals = calculateCouponTotals(baseTotals.subtotal, baseTotals.shipping, percent);
    const total = totals.total;
    if (total <= 0) {
      throw new Error(
        "This coupon makes the order free, which cannot be paid through checkout. Please use a smaller discount coupon.",
      );
    }

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
      },
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
        user_id: context.userId,
        total_inr: total,
        razorpay_order_id: rzp.id,
        shipping_name: s.name,
        shipping_phone: s.phone,
        shipping_address: s.address,
        shipping_city: s.city,
        shipping_state: s.state,
        shipping_pincode: s.pincode,
      })
      .select("id")
      .single();
    if (oErr) throw new Error(oErr.message);
    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
      lines.map((l) => ({
        order_id: order.id,
        product_id: l.productId,
        product_name: l.name,
        unit_price_inr: l.price,
        quantity: l.quantity,
      })),
    );
    if (itemsError) throw new Error("Could not save order items: " + itemsError.message);

    return { orderId: order.id, razorpayOrderId: rzp.id, amount: total * 100, keyId };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        razorpay_order_id: z.string().max(100),
        razorpay_payment_id: z.string().max(100),
        razorpay_signature: z.string().max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const secret = process.env["RAZORPAY_KEY_SECRET"];
    if (!secret) throw new Error("Payments not configured.");
    const ok = await verifyRazorpaySignature(
      data.razorpay_order_id,
      data.razorpay_payment_id,
      data.razorpay_signature,
      secret,
    );
    if (!ok) throw new Error("Payment verification failed.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(
        "id,status,user_id,total_inr,shipping_name,shipping_phone,shipping_address,shipping_city,shipping_state,shipping_pincode",
      )
      .eq("razorpay_order_id", data.razorpay_order_id)
      .eq("user_id", context.userId)
      .single();
    if (!order) throw new Error("Order not found.");
    let paymentConfirmed = order.status === "paid";
    if (order.status === "pending") {
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "paid", razorpay_payment_id: data.razorpay_payment_id })
        .eq("id", order.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (updateError) throw new Error(updateError.message);

      if (updatedOrder) {
        paymentConfirmed = true;
        const { data: items, error: itemsError } = await supabaseAdmin
          .from("order_items")
          .select("product_id,quantity")
          .eq("order_id", order.id);
        if (itemsError) throw new Error(itemsError.message);
        for (const item of items ?? []) {
          if (!item.product_id) continue;
          const { data: product, error: productError } = await supabaseAdmin
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .single();
          if (productError) throw new Error(productError.message);
          const { error: stockError } = await supabaseAdmin
            .from("products")
            .update({ stock: Math.max(0, product.stock - item.quantity) })
            .eq("id", item.product_id);
          if (stockError) throw new Error(stockError.message);
        }
      } else {
        const { data: latestOrder, error: latestOrderError } = await supabaseAdmin
          .from("orders")
          .select("status")
          .eq("id", order.id)
          .single();
        if (latestOrderError) throw new Error(latestOrderError.message);
        paymentConfirmed = latestOrder.status === "paid";
      }
    }

    let emailSent = false;
    let emailSandbox = false;
    if (paymentConfirmed) {
      const [{ data: userResult }, { data: items, error: itemsError }] = await Promise.all([
        context.supabase.auth.getUser(),
        supabaseAdmin
          .from("order_items")
          .select("product_name,quantity,unit_price_inr")
          .eq("order_id", order.id),
      ]);
      if (itemsError) throw new Error(itemsError.message);
      if (userResult.user?.email && userResult.user.email_confirmed_at) {
        try {
          const { sendOrderConfirmationEmail } = await import("@/lib/email.server");
          await sendOrderConfirmationEmail(
            supabaseAdmin,
            userResult.user.email,
            order,
            items ?? [],
          );
          emailSent = true;
          emailSandbox =
            process.env["MAILTRAP_MODE"] === "sandbox" && !process.env["RESEND_API_KEY"];
        } catch (error) {
          console.error("Order confirmation email could not be sent", { orderId: order.id, error });
        }
      }
    }
    return { orderId: order.id, emailSent, emailSandbox };
  });

export const sendPaidOrderDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: userResult, error: userError } = await context.supabase.auth.getUser();
    if (userError) throw new Error("Could not verify current user: " + userError.message);
    const recipient = userResult.user?.email;
    if (!recipient || !userResult.user.email_confirmed_at) {
      throw new Error("Verify your account email before sending order details.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        "id,status,user_id,total_inr,shipping_name,shipping_phone,shipping_address,shipping_city,shipping_state,shipping_pincode",
      )
      .eq("id", data.orderId)
      .eq("user_id", context.userId)
      .in("status", ["paid", "shipped", "delivered"])
      .single();
    if (orderError || !order) throw new Error("Paid order not found.");

    const { data: items, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .select("product_name,quantity,unit_price_inr")
      .eq("order_id", order.id);
    if (itemsError) throw new Error(itemsError.message);

    const { sendOrderConfirmationEmail } = await import("@/lib/email.server");
    const emailSent = await sendOrderConfirmationEmail(
      supabaseAdmin,
      recipient,
      order,
      items ?? [],
      `order-${order.id}-resend-${crypto.randomUUID()}`,
    );

    return {
      emailSent,
      emailSandbox:
        emailSent && process.env["MAILTRAP_MODE"] === "sandbox" && !process.env["RESEND_API_KEY"],
    };
  });
