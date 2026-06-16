"use client";

/* =========================================================================
   カート状態（複数巻まとめ買い・全 SKU ¥200 一律）
   - item = SKU 文字列のみ（価格・タイトルは data.ts の volBySku で解決）
   - 同一 SKU の重複追加は無視（デジタル商材は 1 部で足りる）
   - localStorage 永続化（SSR 不一致回避のため初期は空 → mount 後に復元）
   ========================================================================= */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";

const STORAGE_KEY = "tenzu_cart";

type CartValue = {
  items: string[];                 // SKU の配列
  add: (sku: string) => void;
  remove: (sku: string) => void;
  clear: () => void;
  has: (sku: string) => boolean;
  count: number;
  ready: boolean;                  // localStorage 復元済みか（hydration ガード用）
};

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  // mount 後に localStorage から復元（SSR と初期描画を空に揃える）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter((x) => typeof x === "string"));
      }
    } catch { /* 壊れた値は無視 */ }
    setReady(true);
  }, []);

  // 変更を localStorage に反映（復元前は書かない）
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* quota 等は無視 */ }
  }, [items, ready]);

  const add = useCallback((sku: string) => {
    setItems((prev) => (prev.includes(sku) ? prev : [...prev, sku]));
  }, []);
  const remove = useCallback((sku: string) => {
    setItems((prev) => prev.filter((x) => x !== sku));
  }, []);
  const clear = useCallback(() => setItems([]), []);
  const has = useCallback((sku: string) => items.includes(sku), [items]);

  const value = useMemo<CartValue>(
    () => ({ items, add, remove, clear, has, count: items.length, ready }),
    [items, add, remove, clear, has, ready],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
