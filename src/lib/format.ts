export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export function priceForSize(basePrice: number, sizeInches: number): number {
  if (!Number.isFinite(basePrice) || basePrice < 0 || !Number.isFinite(sizeInches)) {
    throw new Error("Price and product size must be valid numbers.");
  }
  return Math.round(basePrice + (Math.max(sizeInches, 40) - 40) * (basePrice / 40));
}

export type CartLine = { productId: string; quantity: number; price: number };

/** Free shipping at or above ₹2,999; otherwise flat ₹149. */
export const SHIPPING_FREE_FROM = 2999;
export const SHIPPING_FLAT = 149;

export function cartTotals(lines: CartLine[]) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= SHIPPING_FREE_FROM ? 0 : SHIPPING_FLAT;
  return { subtotal, shipping, total: subtotal + shipping };
}
