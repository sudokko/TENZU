"use client";

/* =========================================================================
   会員認証状態（クライアント側・CartContext のパターン踏襲）
   - マウント時に /api/me を叩いて現 tier を取得（cookie の二層 exp 再検証もここで走る）。
   - tier は guest / entry / full。ready は /api/me 応答済みかどうか。
   - DB なし設計のため状態は cookie が唯一の源。ここはその読み取り役。
   ========================================================================= */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import type { Tier } from "./products/capabilities";

type AuthValue = {
  tier: Tier;
  ready: boolean;             // /api/me 応答済みか（hydration ガード用）
  refresh: () => void;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTier] = useState<Tier>("guest");
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => { if (d && typeof d.tier === "string") setTier(d.tier as Tier); })
      .catch(() => { /* ネットワーク不調は guest 据え置き */ })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = useCallback(async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { setTier("guest"); }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ tier, ready, refresh, logout }),
    [tier, ready, refresh, logout],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
