import { describe, expect, it } from "vitest";
import { filterProducts, type ProductFilters } from "@/lib/catalog";
import type { Product } from "@/lib/products.functions";

const filters: ProductFilters = {
  category: "All",
  search: "",
  minPrice: null,
  maxPrice: null,
  inStockOnly: false,
  sort: "newest",
};

const products: Product[] = [
  {
    id: "1",
    name: "Brass Vase",
    slug: "brass-vase",
    description: "Handmade brass decor",
    category: "Decor",
    price_inr: 2500,
    stock: 4,
    active: true,
    featured: false,
    image_url: "",
    image_urls: [],
    created_at: "2026-10-20T00:00:00.000Z",
  },
  {
    id: "2",
    name: "Folk Painting",
    slug: "folk-painting",
    description: "Traditional wall art",
    category: "Art",
    price_inr: 1200,
    stock: 0,
    active: true,
    featured: true,
    image_url: "",
    image_urls: [],
    created_at: "2026-10-21T00:00:00.000Z",
  },
  {
    id: "3",
    name: "Wooden Mirror",
    slug: "wooden-mirror",
    description: "Hand-carved home decor",
    category: "Decor",
    price_inr: 4000,
    stock: 2,
    active: true,
    featured: false,
    image_url: "",
    image_urls: [],
    created_at: "2026-10-19T00:00:00.000Z",
  },
];

describe("shop product filters", () => {
  it("combines category, text, price, and in-stock filters", () => {
    expect(
      filterProducts(products, {
        ...filters,
        category: "Decor",
        search: "home",
        minPrice: 3000,
        maxPrice: 5000,
        inStockOnly: true,
      }).map((product) => product.id),
    ).toEqual(["3"]);
  });

  it("sorts by price and promotes featured products", () => {
    expect(
      filterProducts(products, { ...filters, sort: "price-asc" }).map((product) => product.id),
    ).toEqual(["2", "1", "3"]);
    expect(
      filterProducts(products, { ...filters, sort: "featured" }).map((product) => product.id),
    ).toEqual(["2", "1", "3"]);
  });

  it("searches descriptions case-insensitively and limits the maximum price", () => {
    expect(
      filterProducts(products, {
        ...filters,
        search: "TRADITIONAL",
        maxPrice: 1500,
      }).map((product) => product.id),
    ).toEqual(["2"]);
  });
});
