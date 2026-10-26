import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { filterProducts, type ProductSort } from "@/lib/catalog";
import { productsQuery } from "@/lib/products.functions";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const sortOptions: { value: ProductSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
];

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop Art & Home Décor | Art & Decor" },
      {
        name: "description",
        content:
          "Browse handcrafted paintings, folk art, brass, ceramics, textiles and mirrors. Pay securely with UPI or card.",
      },
      { property: "og:title", content: "Shop Art & Home Décor | Art & Decor" },
      {
        property: "og:description",
        content: "Handcrafted paintings, folk art, brass, ceramics and more.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery()),
  component: Shop,
});

function Shop() {
  const { data } = useSuspenseQuery(productsQuery());
  const cats = ["All", ...Array.from(new Set(data.map((p) => p.category)))];
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<ProductSort>("newest");
  const readPrice = (value: string) => {
    if (!value.trim()) return null;
    const price = Number(value);
    return Number.isFinite(price) && price >= 0 ? price : null;
  };
  const list = filterProducts(data, {
    category: cat,
    search,
    minPrice: readPrice(minPrice),
    maxPrice: readPrice(maxPrice),
    inStockOnly,
    sort,
  });
  const hasFilters =
    cat !== "All" || search !== "" || minPrice !== "" || maxPrice !== "" || inStockOnly;
  const clearFilters = () => {
    setCat("All");
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
  };
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 md:px-8">
      <p className="eyebrow">The collection</p>
      <h1 className="mt-2 text-5xl md:text-6xl">Shop all</h1>
      <div className="mt-8 flex flex-wrap gap-2" aria-label="Filter by category">
        {cats.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={cat === category}
            onClick={() => setCat(category)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${cat === category ? "border-foreground bg-foreground text-background" : "hover:border-foreground"}`}
          >
            {category}
          </button>
        ))}
      </div>

      <section className="mt-8 rounded-md border bg-card p-4 md:p-5" aria-label="Product filters">
        <div className="grid gap-4 md:grid-cols-[minmax(220px,1.5fr)_repeat(2,minmax(140px,1fr))_minmax(180px,1fr)]">
          <div className="space-y-2">
            <Label htmlFor="product-search">Search products</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="product-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, category, or detail"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-price">Min price (₹)</Label>
            <Input
              id="min-price"
              type="number"
              min={0}
              inputMode="numeric"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="Any"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-price">Max price (₹)</Label>
            <Input
              id="max-price"
              type="number"
              min={0}
              inputMode="numeric"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="Any"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sort-products">Sort by</Label>
            <Select
              value={sort}
              onValueChange={(value) => {
                const option = sortOptions.find((candidate) => candidate.value === value);
                if (option) setSort(option.value);
              }}
            >
              <SelectTrigger id="sort-products">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(event) => setInStockOnly(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            In-stock products only
          </label>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {list.length} {list.length === 1 ? "product" : "products"}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
              >
                <X className="h-4 w-4" />
                Clear filters
              </button>
            )}
          </div>
        </div>
      </section>
      <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3">
        {list.map((product) => (
          <ProductCard key={product.id} p={product} />
        ))}
      </div>
      {list.length === 0 && (
        <div className="mt-12 text-center">
          <SlidersHorizontal className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">
            {data.length === 0 ? "No products yet." : "No products match these filters."}
          </p>
          {data.length > 0 && hasFilters && (
            <button type="button" onClick={clearFilters} className="mt-3 text-sm underline">
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
