import { describe, it, expect } from "vitest";
import { cartTotals } from "@/lib/format";
import { hmacSha256Hex, verifyRazorpaySignature } from "@/lib/razorpay-signature";

describe("cart totals", () => {
  it("charges ₹149 shipping below ₹2,999", () => {
    expect(cartTotals([{ productId: "a", quantity: 1, price: 1499 }])).toEqual({ subtotal: 1499, shipping: 149, total: 1648 });
  });
  it("ships free from ₹2,999", () => {
    expect(cartTotals([{ productId: "a", quantity: 1, price: 2999 }]).shipping).toBe(0);
  });
});

describe("razorpay signature", () => {
  it("accepts a correct signature and rejects a tampered one", async () => {
    const sig = await hmacSha256Hex("secret", "order_1|pay_1");
    expect(await verifyRazorpaySignature("order_1", "pay_1", sig, "secret")).toBe(true);
    expect(await verifyRazorpaySignature("order_1", "pay_2", sig, "secret")).toBe(false);
  });
});
