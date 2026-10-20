import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { productsQuery } from "@/lib/products.functions";
import { ProductCard } from "@/components/product-card";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop Art & Home Décor | Art & Decor" },
      { name: "description", content: "Browse handcrafted paintings, folk art, brass, ceramics, textiles and mirrors. Pay securely with UPI or card." },
      { property: "og:title", content: "Shop Art & Home Décor | Art & Decor" },
      { property: "og:description", content: "Handcrafted paintings, folk art, brass, ceramics and more." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery()),
  component: Shop,
});

function Shop() {
  const { data } = useSuspenseQuery(productsQuery());
  const cats = ["All", ...Array.from(new Set(data.map((p) => p.category)))];
  const [cat, setCat] = useState("All");
  const list = cat === "All" ? data : data.filter((p) => p.category === cat);
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 md:px-8">
      <p className="eyebrow">The collection</p>
      <h1 className="mt-2 text-5xl md:text-6xl">Shop all</h1>
      <div className="mt-8 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${cat === c ? "border-foreground bg-foreground text-background" : "hover:border-foreground"}`}>{c}</button>
        ))}
      </div>
      <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3">
        {list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {list.length === 0 && <p className="mt-10 text-muted-foreground">No products yet.</p>}
    </div>
  );
}
