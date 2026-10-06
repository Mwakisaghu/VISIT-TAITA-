"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { addLine, cartTotals, removeLine, sanitizeCart, setLineQuantity, type CartLine } from "@/lib/cart";

export type CartItem = CartLine;

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  /** `key` is lineKey(item): a product AND its option (size). */
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "taita-made-cart";

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(sanitizeCart(JSON.parse(raw))); // anything malformed is dropped, never trusted
    } catch {
      // ignore corrupted cart data
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage full or blocked: the cart still works for this visit
    }
  }, [items, hydrated]);

  const { count, subtotal } = cartTotals(items);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem: (item, quantity = 1) => setItems((prev) => addLine(prev, item, quantity)),
        removeItem: (key) => setItems((prev) => removeLine(prev, key)),
        setQuantity: (key, quantity) => setItems((prev) => setLineQuantity(prev, key, quantity)),
        clear: () => setItems([]),
        count,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
