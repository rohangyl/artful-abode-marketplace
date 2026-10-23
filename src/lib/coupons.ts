export const COUPON_DISCOUNTS = {
  ART100: 100,
  ART60: 60,
  ART30: 30,
} as const;

export type CouponCode = keyof typeof COUPON_DISCOUNTS;

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function getCouponDiscountPercent(code: string): number | null {
  const normalized = normalizeCouponCode(code);
  return Object.hasOwn(COUPON_DISCOUNTS, normalized)
    ? COUPON_DISCOUNTS[normalized as CouponCode]
    : null;
}

export function calculateCouponTotals(subtotal: number, shipping: number, discountPercent: number) {
  const discount = Math.round((subtotal * discountPercent) / 100);
  return { subtotal, shipping, discount, total: subtotal - discount + shipping };
}
