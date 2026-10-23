import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { cartTotals, formatINR } from "@/lib/format";
import { productsQuery } from "@/lib/products.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart | Art & Decor" },
      { name: "description", content: "Review the art and décor in your cart." },
      { property: "og:title", content: "Your Cart | Art & Decor" },
      { property: "og:description", content: "Review the art and décor in your cart." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove } = useCart();
  const products = useQuery(productsQuery());
  const availability = items.map((item) => {
    const product = products.data?.find((candidate) => candidate.id === item.productId);
    return {
      item,
      stock: product?.stock ?? 0,
      unavailable: !products.data || !product || product.stock < item.quantity,
    };
  });
  const hasUnavailableItems =
    products.isError || availability.some(({ unavailable }) => unavailable);
  const t = cartTotals(
    items.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
  );
  if (items.length === 0)
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-5xl">Your cart is empty</h1>
        <Button asChild className="mt-8">
          <Link to="/shop">Browse the collection</Link>
        </Button>
      </div>
    );
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 md:grid-cols-[1fr_340px] md:px-8">
      <div>
        <h1 className="text-5xl">Cart</h1>
        <ul className="mt-8 divide-y border-y">
          {availability.map(({ item: i, stock, unavailable }) => (
            <li key={i.productId} className="flex gap-4 py-5">
              <img src={i.image} alt={i.name} className="h-24 w-20 rounded object-cover" />
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex justify-between gap-2">
                  <Link
                    to="/product/$slug"
                    params={{ slug: i.slug }}
                    className="font-display text-xl"
                  >
                    {i.name}
                  </Link>
                  <p>{formatINR(i.price * i.quantity)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={i.quantity}
                    onChange={(e) => setQty(i.productId, Number(e.target.value))}
                    className="rounded border bg-background px-2 py-1 text-sm"
                    aria-label="Quantity"
                  >
                    {Array.from({ length: Math.min(stock, 10) }, (_, n) => n + 1).map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                    {i.quantity > Math.min(stock, 10) && (
                      <option value={i.quantity} disabled>
                        {i.quantity} (unavailable)
                      </option>
                    )}
                  </select>
                  <button
                    onClick={() => remove(i.productId)}
                    aria-label="Remove"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {products.isLoading ? (
                  <p className="mt-2 text-sm text-muted-foreground">Checking availability…</p>
                ) : unavailable ? (
                  <p className="mt-2 text-sm font-medium text-destructive" role="status">
                    {stock === 0
                      ? "Out of stock — remove this item to continue."
                      : `Only ${stock} left — update the quantity to continue.`}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">{stock} in stock</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <aside className="h-fit rounded-md bg-card p-6 shadow-soft">
        <h2 className="text-2xl">Summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatINR(t.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>{t.shipping === 0 ? "Free" : formatINR(t.shipping)}</dd>
          </div>
          <div className="flex justify-between border-t pt-3 text-base font-medium">
            <dt>Total</dt>
            <dd>{formatINR(t.total)}</dd>
          </div>
        </dl>
        {products.isError && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            Could not check stock. Refresh the page before checkout.
          </p>
        )}
        {hasUnavailableItems || products.isLoading ? (
          <Button className="mt-6 w-full" size="lg" disabled>
            Checkout
          </Button>
        ) : (
          <Button asChild className="mt-6 w-full" size="lg">
            <Link to="/checkout">Checkout</Link>
          </Button>
        )}
      </aside>
    </div>
  );
}
