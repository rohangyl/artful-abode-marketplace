import { describe, it, expect } from "vitest";
import { cartTotals } from "@/lib/format";
import { calculateCouponTotals, getCouponDiscountPercent } from "@/lib/coupons";
import { hmacSha256Hex, verifyRazorpaySignature } from "@/lib/razorpay-signature";

describe("cart totals", () => {
  it("charges ₹149 shipping below ₹2,999", () => {
    expect(cartTotals([{ productId: "a", quantity: 1, price: 1499 }])).toEqual({
      subtotal: 1499,
      shipping: 149,
      total: 1648,
    });
  });
  it("ships free from ₹2,999", () => {
    expect(cartTotals([{ productId: "a", quantity: 1, price: 2999 }]).shipping).toBe(0);
  });
});

describe("checkout coupons", () => {
  it("applies the configured discounts to products and keeps shipping separate", () => {
    expect(getCouponDiscountPercent("art100")).toBe(100);
    expect(getCouponDiscountPercent(" ART60 ")).toBe(60);
    expect(getCouponDiscountPercent("ART30")).toBe(30);
    expect(getCouponDiscountPercent("UNKNOWN")).toBeNull();
    expect(calculateCouponTotals(1000, 149, 60)).toEqual({
      subtotal: 1000,
      shipping: 149,
      discount: 600,
      total: 549,
    });
  });

  it("rounds discounts to whole rupees and allows a zero total for server-side rejection", () => {
    expect(calculateCouponTotals(101, 149, 30).discount).toBe(30);
    expect(calculateCouponTotals(2999, 0, 100).total).toBe(0);
    expect(getCouponDiscountPercent("constructor")).toBeNull();
  });
});

describe("razorpay signature", () => {
  it("accepts a correct signature and rejects a tampered one", async () => {
    const sig = await hmacSha256Hex("secret", "order_1|pay_1");
    expect(await verifyRazorpaySignature("order_1", "pay_1", sig, "secret")).toBe(true);
    expect(await verifyRazorpaySignature("order_1", "pay_2", sig, "secret")).toBe(false);
  });
});
