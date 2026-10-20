import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/products.functions";
import { formatINR } from "@/lib/format";

export function ProductCard({ p }: { p: Product }) {
  return (
    <Link to="/product/$slug" params={{ slug: p.slug }} className="group block">
      <div className="aspect-[4/5] overflow-hidden rounded-md bg-muted">
        <img src={p.image_url} alt={p.name} loading="lazy" width={912} height={1104} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{p.category}</p>
          <h3 className="mt-1 text-xl">{p.name}</h3>
        </div>
        <p className="text-sm font-medium">{formatINR(p.price_inr)}</p>
      </div>
    </Link>
  );
}
