import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { productQuery } from "@/lib/products.functions";
import { formatINR } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} | Art & Decor` },
          { name: "description", content: loaderData.description.slice(0, 155) },
          { property: "og:title", content: `${loaderData.name} | Art & Decor` },
          { property: "og:description", content: loaderData.description.slice(0, 155) },
          { property: "og:type", content: "product" },
        ]
      : [{ title: "Product unavailable | Art & Decor" }, { name: "robots", content: "noindex" }],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: p } = useSuspenseQuery(productQuery(slug));
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  if (!p) return null;
  const out = p.stock <= 0;
  return (
    <div className="mx-auto grid max-w-7xl gap-12 px-4 py-12 md:grid-cols-2 md:px-8">
      <div className="aspect-[4/5] overflow-hidden rounded-md bg-muted">
        <img src={p.image_url} alt={p.name} width={912} height={1104} className="h-full w-full object-cover" />
      </div>
      <div className="md:py-8">
        <Link to="/shop" className="eyebrow hover:text-foreground">← {p.category}</Link>
        <h1 className="mt-3 text-5xl">{p.name}</h1>
        <p className="mt-4 text-2xl">{formatINR(p.price_inr)}</p>
        <p className="mt-1 text-xs text-muted-foreground">Inclusive of all taxes</p>
        <p className="mt-8 leading-relaxed text-muted-foreground">{p.description}</p>
        <div className="mt-10 flex items-center gap-4">
          <div className="flex items-center rounded-md border">
            <button className="p-3" aria-label="Decrease" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></button>
            <span className="w-8 text-center">{qty}</span>
            <button className="p-3" aria-label="Increase" disabled={out || qty >= p.stock} onClick={() => setQty(Math.min(p.stock, qty + 1))}><Plus className="h-4 w-4" /></button>
          </div>
          <Button size="lg" className="flex-1" disabled={out} onClick={() => { add({ productId: p.id, slug: p.slug, name: p.name, price: p.price_inr, image: p.image_url }, qty); toast.success("Added to cart"); }}>
            {out ? "Sold out" : "Add to cart"}
          </Button>
        </div>
        {out ? (
          <p className="mt-3 text-sm font-medium text-destructive" role="status">
            Out of stock
          </p>
        ) : (
          <p className="mt-3 text-sm text-primary">
            {p.stock < 5 ? `Only ${p.stock} left` : `${p.stock} in stock`}
          </p>
        )}
      </div>
    </div>
  );
}
