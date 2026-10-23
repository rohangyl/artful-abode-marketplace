import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { cartTotals, formatINR } from "@/lib/format";
import { createCheckout, quoteCheckoutCoupon, verifyPayment } from "@/lib/payments.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout | Art & Decor" },
      { name: "description", content: "Secure checkout with Razorpay." },
      { property: "og:title", content: "Checkout | Art & Decor" },
      { property: "og:description", content: "Secure checkout with Razorpay." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => {
      open: () => void;
      on: (e: string, cb: (r: unknown) => void) => void;
    };
  }
}

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const fields = [
  ["name", "Full name"],
  ["phone", "Mobile number"],
  ["address", "Address"],
  ["city", "City"],
  ["state", "State"],
  ["pincode", "PIN code"],
] as const;

function Checkout() {
  const { items, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const start = useServerFn(createCheckout);
  const quoteCoupon = useServerFn(quoteCheckoutCoupon);
  const verify = useServerFn(verifyPayment);
  const [busy, setBusy] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    couponCode: string;
    discountPercent: number;
    subtotal: number;
    shipping: number;
    discount: number;
    total: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [ship, setShip] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const t = cartTotals(
    items.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
  );
  const displayedTotals = appliedCoupon ?? t;

  const applyCoupon = async () => {
    setApplyingCoupon(true);
    setCouponError("");
    try {
      const quote = await quoteCoupon({
        data: {
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          couponCode: couponInput,
        },
      });
      setAppliedCoupon(quote);
      setCouponInput(quote.couponCode);
    } catch (error) {
      setAppliedCoupon(null);
      setCouponError(error instanceof Error ? error.message : "Could not apply this coupon.");
    } finally {
      setApplyingCoupon(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data)
          setShip((s) => ({
            name: data.full_name ?? s.name,
            phone: data.phone ?? "",
            address: data.address ?? "",
            city: data.city ?? "",
            state: data.state ?? "",
            pincode: data.pincode ?? "",
          }));
      });
  }, [user]);

  if (items.length === 0)
    return (
      <div className="py-24 text-center">
        <h1 className="text-4xl">Nothing to check out</h1>
        <Button asChild className="mt-6">
          <Link to="/shop">Shop now</Link>
        </Button>
      </div>
    );

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (!(await loadRazorpay()) || !window.Razorpay) throw new Error("Could not load Razorpay.");
      const res = await start({
        data: {
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          couponCode: appliedCoupon?.couponCode,
          shipping: ship,
        },
      });
      const rzp = new window.Razorpay({
        key: res.keyId,
        amount: res.amount,
        currency: "INR",
        order_id: res.razorpayOrderId,
        name: "Art & Decor",
        description: "Order payment",
        prefill: { name: ship.name, email: user?.email, contact: ship.phone },
        theme: { color: "#c4654a" },
        handler: async (r: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const result = await verify({ data: r });
            clear();
            if (result.emailSent) {
              toast.success(
                result.emailSandbox
                  ? "Payment successful! Order details are in the Mailtrap test inbox."
                  : "Payment successful! Order details have been emailed to you.",
              );
              navigate({ to: "/account" });
            } else {
              toast.success("Payment successful!");
              navigate({
                to: "/account",
                search: {
                  orderEmailOrderId: result.orderId,
                  paymentEmailSent: false,
                  paymentEmailSandbox: false,
                },
              });
            }
          } catch (err) {
            toast.error((err as Error).message);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on("payment.failed", () => toast.error("Payment failed. You can try again."));
      rzp.open();
    } catch (err) {
      const msg = (err as Error).message;
      toast.error(msg.startsWith("[") ? "Please check your shipping details." : msg);
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={pay}
      className="mx-auto grid max-w-6xl gap-12 px-4 py-14 md:grid-cols-[1fr_340px] md:px-8"
    >
      <div>
        <h1 className="text-5xl">Checkout</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {fields.map(([k, l]) => (
            <div key={k} className={k === "address" ? "sm:col-span-2" : ""}>
              <Label htmlFor={k}>{l}</Label>
              <Input
                id={k}
                required
                value={ship[k]}
                onChange={(e) => setShip({ ...ship, [k]: e.target.value })}
                maxLength={k === "address" ? 300 : 100}
              />
            </div>
          ))}
        </div>
      </div>
      <aside className="h-fit rounded-md bg-card p-6 shadow-soft">
        <h2 className="text-2xl">Order</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {items.map((i) => (
            <li key={i.productId} className="flex justify-between">
              <span>
                {i.name} × {i.quantity}
              </span>
              <span>{formatINR(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 space-y-2 border-t pt-4">
          <Label htmlFor="coupon-code">Coupon code</Label>
          <div className="flex gap-2">
            <Input
              id="coupon-code"
              value={couponInput}
              onChange={(event) => {
                setCouponInput(event.target.value);
                setAppliedCoupon(null);
                setCouponError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void applyCoupon();
                }
              }}
              placeholder="Enter coupon code"
              maxLength={32}
              disabled={applyingCoupon || busy}
            />
            <Button
              type="button"
              variant="outline"
              onClick={applyCoupon}
              disabled={applyingCoupon || busy || !couponInput.trim()}
            >
              {applyingCoupon ? "Applying…" : appliedCoupon ? "Applied" : "Apply"}
            </Button>
          </div>
          {couponError && (
            <p className="text-sm text-destructive" role="alert">
              {couponError}
            </p>
          )}
          {appliedCoupon && (
            <p className="text-sm text-muted-foreground" role="status">
              {appliedCoupon.couponCode} applied ({appliedCoupon.discountPercent}% off products).
            </p>
          )}
        </div>
        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatINR(displayedTotals.subtotal)}</span>
          </div>
          {appliedCoupon && (
            <div className="flex justify-between text-primary">
              <span>Coupon discount</span>
              <span>−{formatINR(appliedCoupon.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{displayedTotals.shipping ? formatINR(displayedTotals.shipping) : "Free"}</span>
          </div>
          <div className="flex justify-between text-base font-medium">
            <span>Total</span>
            <span>{formatINR(displayedTotals.total)}</span>
          </div>
        </div>
        <Button type="submit" className="mt-6 w-full" size="lg" disabled={busy || applyingCoupon}>
          {busy ? "Processing…" : `Pay ${formatINR(displayedTotals.total)}`}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          UPI, cards & netbanking via Razorpay
        </p>
      </aside>
    </form>
  );
}
