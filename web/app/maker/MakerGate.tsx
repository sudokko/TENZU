"use client";

/* =========================================================================
   MakerGate — メーカーごとの文脈バー（9 メーカー共通）
   page.tsx（server）が readOwned した initialOwned を渡し、children に実エディタを渡す。
     <MakerGate makerKey="mirror" initialOwned={owned}><MakerMirrorApp/></MakerGate>
   useAuth で /api/me 確定値に置換（楽観初期値→確定）。
   買い切りモデル（decisions §4.6/§4.7）: 入室はゲートしない＝全メーカー触れる・プレビュー可。
   有料ゲート（PDF 書き出し）は各 MakerApp 側。ここは introbar に所有状態と購入導線を出すだけ。
   ========================================================================= */

import { useState } from "react";
import { useAuth } from "../AuthContext";
import {
  ownsMaker, MAKER_PRICE, FREE_MAKER, type MakerKey,
} from "../products/capabilities";
import { makerByKey } from "../products/makers";
import { buyMaker } from "./buyMaker";
import "./maker-gate.css";

export default function MakerGate({
  makerKey, initialOwned = [], children,
}: {
  makerKey: MakerKey;
  initialOwned?: MakerKey[];
  children: React.ReactNode;
}) {
  const { owned: liveOwned, ready } = useAuth();
  const owned = ready ? liveOwned : initialOwned;
  const meta = makerByKey(makerKey);
  const isOwned = makerKey === FREE_MAKER || ownsMaker(owned, makerKey);
  const [busy, setBusy] = useState(false);

  const onBuy = async () => {
    setBusy(true);
    try { await buyMaker(makerKey); }
    catch (e) { alert(e instanceof Error ? e.message : "購入に進めませんでした"); setBusy(false); }
  };

  return (
    <>
      <div className="maker-introbar">
        <a className="mib-back" href="/makers">← メーカー一覧</a>
        {meta && (
          <span className="mib-ctx">
            <b className="mib-name">{meta.name}</b>
            <span className="mib-desc">{meta.desc}</span>
          </span>
        )}
        <span className="mib-auth">
          {isOwned ? (
            <>
              <span className="mib-badge">{makerKey === FREE_MAKER ? "無料" : "購入済み"}</span>
              <a href="/account">マイページ</a>
            </>
          ) : (
            <>
              <button className="mib-buy" onClick={onBuy} disabled={busy}>
                {busy ? "…" : `¥${MAKER_PRICE} で書き出し解放`}
              </button>
              {/* 既購入者が別ブラウザで来たときの復元導線（ログインは無い＝メール復元のみ） */}
              <a className="mib-restore" href="/login">購入済みの方は復元</a>
            </>
          )}
        </span>
      </div>
      {children}
    </>
  );
}
