import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = { productId: string; slug: string; name: string; price: number; image: string; quantity: number };

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "artdecor-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, loaded]);

  const value: CartCtx = {
    items,
    count: items.reduce((s, i) => s + i.quantity, 0),
    add: (item, qty = 1) =>
      setItems((prev) => {
        const ex = prev.find((p) => p.productId === item.productId);
        if (ex) return prev.map((p) => (p.productId === item.productId ? { ...p, quantity: Math.min(p.quantity + qty, 20) } : p));
        return [...prev, { ...item, quantity: qty }];
      }),
    setQty: (id, qty) =>
      setItems((prev) => (qty <= 0 ? prev.filter((p) => p.productId !== id) : prev.map((p) => (p.productId === id ? { ...p, quantity: Math.min(qty, 20) } : p)))),
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
