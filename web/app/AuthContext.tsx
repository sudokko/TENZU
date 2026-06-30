"use client";

/* =========================================================================
   メーカー所有状態（クライアント側・CartContext のパターン踏襲）
   - マウント時に /api/me を叩いて現在の所有メーカー集合を取得（cookie が唯一の源）。
   - owned は MakerKey[]。ready は /api/me 応答済みかどうか（hydration ガード用）。
   - DB なし設計のため状態は cookie が唯一の源。ここはその読み取り役。
   ========================================================================= */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import type { MakerKey } from "./products/capabilities";

type AuthValue = {
  owned: MakerKey[];
  ready: boolean;             // /api/me 応答済みか（hydration ガード用）
  refresh: () => void;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [owned, setOwned] = useState<MakerKey[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => { if (d && Array.isArray(d.owned)) setOwned(d.owned as MakerKey[]); })
      .catch(() => { /* ネットワーク不調は空所有のまま据え置き */ })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = useCallback(async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { setOwned([]); }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ owned, ready, refresh, logout }),
    [owned, ready, refresh, logout],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
