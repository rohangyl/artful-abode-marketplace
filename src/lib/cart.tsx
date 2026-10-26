import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  sizeInches: number;
  isCustomSize: boolean;
};

type StoredCartItem = Omit<CartItem, "sizeInches" | "isCustomSize"> & {
  sizeInches?: number;
  isCustomSize?: boolean;
};

function isStoredCartItem(value: unknown): value is StoredCartItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item["productId"] === "string" &&
    typeof item["slug"] === "string" &&
    typeof item["name"] === "string" &&
    typeof item["price"] === "number" &&
    typeof item["image"] === "string" &&
    typeof item["quantity"] === "number" &&
    (item["sizeInches"] === undefined || typeof item["sizeInches"] === "number") &&
    (item["isCustomSize"] === undefined || typeof item["isCustomSize"] === "boolean")
  );
}

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  setSize: (productId: string, sizeInches: number) => void;
  setSizeMode: (productId: string, isCustomSize: boolean) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "artdecor-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const storageKey = `${KEY}:${user?.id ?? "guest"}`;
  const [items, setItems] = useState<CartItem[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    setLoadedKey(null);
    setItems([]);
    try {
      const raw = localStorage.getItem(storageKey);
      if (storageKey === `${KEY}:guest` && raw === null) {
        const legacyCart = localStorage.getItem(KEY);
        if (legacyCart !== null) {
          localStorage.setItem(storageKey, legacyCart);
          localStorage.removeItem(KEY);
        }
      }
      const savedCart = raw ?? localStorage.getItem(storageKey);
      if (savedCart) {
        const saved: unknown = JSON.parse(savedCart);
        if (!Array.isArray(saved)) throw new Error("Saved cart data is not a list.");
        setItems(
          saved.filter(isStoredCartItem).map((item) => ({
            ...item,
            sizeInches: item.sizeInches ?? 40,
            isCustomSize:
              item.isCustomSize ?? (item.sizeInches !== undefined && item.sizeInches !== 40),
          })),
        );
      }
    } catch (error) {
      console.error("Could not restore saved cart", error);
      setItems([]);
    }
    setLoadedKey(storageKey);
  }, [authLoading, storageKey]);

  useEffect(() => {
    if (authLoading || loadedKey !== storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
      console.error("Could not save cart", error);
    }
  }, [authLoading, items, loadedKey, storageKey]);

  const value: CartCtx = {
    items: loadedKey === storageKey ? items : [],
    count: loadedKey === storageKey ? items.reduce((s, i) => s + i.quantity, 0) : 0,
    add: (item, qty = 1) =>
      setItems((prev) => {
        const ex = prev.find((p) => p.productId === item.productId);
        if (ex)
          return prev.map((p) =>
            p.productId === item.productId
              ? {
                  ...p,
                  quantity: Math.min(p.quantity + qty, 20),
                  sizeInches: item.sizeInches,
                  isCustomSize: item.isCustomSize,
                }
              : p,
          );
        return [...prev, { ...item, quantity: qty }];
      }),
    setQty: (id, qty) =>
      setItems((prev) =>
        qty <= 0
          ? prev.filter((p) => p.productId !== id)
          : prev.map((p) => (p.productId === id ? { ...p, quantity: Math.min(qty, 20) } : p)),
      ),
    setSize: (id, sizeInches) =>
      setItems((prev) =>
        prev.map((item) => (item.productId === id ? { ...item, sizeInches } : item)),
      ),
    setSizeMode: (id, isCustomSize) =>
      setItems((prev) =>
        prev.map((item) =>
          item.productId === id
            ? { ...item, isCustomSize, ...(isCustomSize ? {} : { sizeInches: 40 }) }
            : item,
        ),
      ),
    remove: (id) => setItems((prev) => prev.filter((p) => p.productId !== id)),
    clear: () => setItems([]),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
