"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Settings } from "@/lib/types";

export type CartItem = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  size: string;
  color: string;
  price: number;
  quantity: number;
  maxStock: number;
};

type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  count: number;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  settings: Settings;
  add: (item: CartItem) => void;
  setQuantity: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "qw-cart-v1";

export function CartProvider({
  settings,
  children,
}: {
  settings: Settings;
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // storage unavailable
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage unavailable
    }
  }, [items, ready]);

  const add = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === item.variantId
            ? { ...i, quantity: Math.min(i.quantity + item.quantity, item.maxStock), maxStock: item.maxStock }
            : i
        );
      }
      return [...prev, { ...item, quantity: Math.min(item.quantity, item.maxStock) }];
    });
  }, []);

  const setQuantity = useCallback((variantId: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.variantId === variantId ? { ...i, quantity: Math.max(1, Math.min(qty, i.maxStock)) } : i
      )
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const freeAbove = settings.free_delivery_above != null ? Number(settings.free_delivery_above) : null;
    const deliveryCharge =
      items.length === 0 || (freeAbove != null && subtotal >= freeAbove)
        ? 0
        : Number(settings.delivery_charge);
    return {
      items,
      ready,
      count,
      subtotal,
      deliveryCharge,
      total: subtotal + deliveryCharge,
      settings,
      add,
      setQuantity,
      remove,
      clear,
    };
  }, [items, ready, settings, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
