import type { Product } from "@/lib/products.functions";

export type ProductSort = "featured" | "price-asc" | "price-desc" | "newest" | "name";

export type ProductFilters = {
  category: string;
  search: string;
  minPrice: number | null;
  maxPrice: number | null;
  inStockOnly: boolean;
  sort: ProductSort;
};

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  const search = filters.search.trim().toLowerCase();
  const result = products.filter((product) => {
    if (filters.category !== "All" && product.category !== filters.category) return false;
    if (
      search &&
      !`${product.name} ${product.category} ${product.description}`.toLowerCase().includes(search)
    ) {
      return false;
    }
    if (filters.minPrice !== null && product.price_inr < filters.minPrice) return false;
    if (filters.maxPrice !== null && product.price_inr > filters.maxPrice) return false;
    if (filters.inStockOnly && product.stock <= 0) return false;
    return true;
  });

  return result.sort((first, second) => {
    switch (filters.sort) {
      case "price-asc":
        return first.price_inr - second.price_inr;
      case "price-desc":
        return second.price_inr - first.price_inr;
      case "newest":
        return second.created_at.localeCompare(first.created_at);
      case "name":
        return first.name.localeCompare(second.name);
      case "featured":
        return (
          Number(second.featured) - Number(first.featured) ||
          second.created_at.localeCompare(first.created_at)
        );
    }
  });
}
