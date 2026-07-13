"use client";

/* =========================================================================
   オンサイトメッセージ（自前 Web 接客）
   - 設計 SSOT: acquisition/onsite-messaging.md（G1-G7 が機能要件より上位）
   - キャンペーン定義は DynamoDB（配信 API /api/onsite/campaigns から取得）。
     取得失敗・未設定時は「出さない側」に倒す（§5 と同方向）
   - 生涯 1 回: 表示した時点で localStorage `tenzu_om_{id}` に既読を焼く（G2）
   - 同時 1 件・1 ページビュー 1 件（G3）。localStorage 不可環境では出さない側に倒す
   - dev 検証: `?om_preview={id}` で既読・active を無視して強制表示（既読は焼かず、
     first-party カウンタにも数えない）
   ========================================================================= */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useCart } from "../../cart/CartContext";
import { trackOnsiteMsg } from "../../analytics";
import { type Campaign } from "./campaigns";
import "./onsite.css";

const READ_PREFIX = "tenzu_om_";

function storageOk(): boolean {
  try {
    const k = "__tenzu_om_probe__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function isRead(id: string): boolean {
  try {
    return window.localStorage.getItem(READ_PREFIX + id) != null;
  } catch {
    return true; // 読めない環境は既読扱い＝出さない
  }
}

function markRead(id: string): void {
  try {
    window.localStorage.setItem(READ_PREFIX + id, new Date().toISOString());
  } catch {
    /* 書けなくても表示自体は成立している（次回また出るのは G2 違反だが、
       storageOk() が先に弾くためここへは通常来ない） */
  }
}

/* pages は前方一致（"/" のみ完全一致・"" は全ページ）。excludePages が優先 */
function pageMatches(c: Campaign, path: string): boolean {
  if (c.excludePages?.some((p) => path.startsWith(p))) return false;
  return c.pages.some((p) => (p === "/" ? path === "/" : path.startsWith(p)));
}

type Shown = { c: Campaign; preview: boolean };

export default function OnsiteMessenger() {
  const pathname = usePathname() ?? "/";
  const cart = useCart();
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const shownThisPv = useRef(false); // 1PV 1 件（G3）
  const cardRef = useRef<HTMLDivElement | null>(null);

  // カート数はイベントリスナー内から最新値を読みたいので ref に写す
  const cartRef = useRef({ ready: cart.ready, count: cart.count });
  cartRef.current = { ready: cart.ready, count: cart.count };

  /* 管理・検品画面ではオンサイトメッセージを動かさない */
  const suppressed = pathname.startsWith("/admin") || pathname.startsWith("/atelier");

  /* キャンペーン定義の取得（フルページロード毎に 1 回・SPA 遷移では再取得しない）。
     preview 指定時は該当 1 件を active 無視で取る */
  useEffect(() => {
    const previewId = new URLSearchParams(window.location.search).get("om_preview");
    const url = previewId
      ? `/api/onsite/campaigns?id=${encodeURIComponent(previewId)}`
      : "/api/onsite/campaigns";
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<{ campaigns?: Campaign[] }>) : null))
      .then((j) => {
        if (!cancelled) setCampaigns(j?.campaigns ?? []);
      })
      .catch(() => {
        if (!cancelled) setCampaigns([]); // 失敗＝出さない側に倒す
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ページ遷移＝新しい PV。表示中カードは畳み、PV フラグをリセット */
  useEffect(() => {
    shownThisPv.current = false;
    setShown(null);
  }, [pathname]);

  /* プレビューモード: ?om_preview={id}（既読は焼かない・active も無視・計測に数えない） */
  useEffect(() => {
    if (suppressed || !campaigns) return;
    const id = new URLSearchParams(window.location.search).get("om_preview");
    if (!id) return;
    const c = campaigns.find((x) => x.id === id);
    if (!c) return;
    shownThisPv.current = true;
    setShown({ c, preview: true });
    trackOnsiteMsg("show", c.id, c.trigger, { preview: true });
  }, [pathname, campaigns, suppressed]);

  /* 本番トリガー評価 */
  useEffect(() => {
    if (suppressed || !campaigns) return;
    if (shownThisPv.current) return;
    if (!storageOk()) return; // 出し過ぎより出ない方がブランド整合（§5）
    if (new URLSearchParams(window.location.search).has("om_preview")) return;

    const candidates = campaigns
      .filter((c) => c.active && pageMatches(c, pathname) && !isRead(c.id))
      .sort((a, b) => a.priority - b.priority);
    if (candidates.length === 0) return;

    const cleanups: (() => void)[] = [];

    const fire = (c: Campaign) => {
      if (shownThisPv.current) return; // priority 上位が先に出ていたら譲る（G3）
      shownThisPv.current = true;
      markRead(c.id); // 表示した時点で既読（閉じる操作を待たない・G2）
      setShown({ c, preview: false });
      trackOnsiteMsg("show", c.id, c.trigger);
    };

    for (const c of candidates) {
      if (c.trigger === "first_visit") {
        // 即時に出さない — 読み始めを邪魔しない（G4・最低 3 秒）
        const t = window.setTimeout(() => fire(c), Math.max(c.delaySec ?? 3, 3) * 1000);
        cleanups.push(() => window.clearTimeout(t));
      } else if (c.trigger === "idle") {
        // idleSec 間 scroll/click/keydown/touch がなければ発火。非表示中はタイマー停止
        let t: number | undefined;
        const stop = () => { if (t !== undefined) window.clearTimeout(t); };
        const start = () => {
          stop();
          t = window.setTimeout(() => fire(c), (c.idleSec ?? 60) * 1000);
        };
        const onActivity = () => { if (!document.hidden) start(); };
        const onVis = () => { if (document.hidden) stop(); else start(); };
        const evs = ["scroll", "click", "keydown", "touchstart"] as const;
        evs.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
        document.addEventListener("visibilitychange", onVis);
        start();
        cleanups.push(() => {
          stop();
          evs.forEach((e) => window.removeEventListener(e, onActivity));
          document.removeEventListener("visibilitychange", onVis);
        });
      } else if (c.trigger === "cart_abandon") {
        // カートに入っている時だけ武装。PC=カーソルが上端へ抜けた時／
        // モバイル=タブ離脱→復帰時（exit intent が物理的に無いための代替・§3 S2）
        const armed = () => cartRef.current.ready && cartRef.current.count > 0;
        const onMouseLeave = (e: MouseEvent) => {
          if (armed() && e.clientY <= 0) fire(c);
        };
        let wasHidden = false;
        const onVis = () => {
          if (document.hidden) { wasHidden = true; return; }
          if (wasHidden && armed()) fire(c);
        };
        document.addEventListener("mouseleave", onMouseLeave);
        document.addEventListener("visibilitychange", onVis);
        cleanups.push(() => {
          document.removeEventListener("mouseleave", onMouseLeave);
          document.removeEventListener("visibilitychange", onVis);
        });
      }
    }

    return () => cleanups.forEach((f) => f());
  }, [pathname, campaigns, suppressed]);

  /* カード外クリックでも消える（G5）。閉じた事実も既読（表示時に焼き済み） */
  useEffect(() => {
    if (!shown) return;
    const onDocClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        trackOnsiteMsg("dismiss", shown.c.id, shown.c.trigger, { preview: shown.preview });
        setShown(null);
      }
    };
    // 表示の起因イベント自身を拾わないよう次 tick で登録
    const t = window.setTimeout(() => document.addEventListener("click", onDocClick), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", onDocClick);
    };
  }, [shown]);

  if (!shown) return null;

  const message = shown.c.message.replace("{count}", String(cart.count));

  return (
    <div className="om-card" role="status" aria-live="polite" ref={cardRef}>
      {shown.c.image && (
        <img
          className="om-thumb"
          src={shown.c.image.src}
          alt={shown.c.image.alt}
          width={64}
          height={64}
          decoding="async"
        />
      )}
      <div className="om-body">
        <p className="om-msg">{message}</p>
        {shown.c.cta && (
          <Link
            href={shown.c.cta.href}
            className="om-cta"
            onClick={() => {
              trackOnsiteMsg("click", shown.c.id, shown.c.trigger, { preview: shown.preview });
              setShown(null);
            }}
          >
            {shown.c.cta.label}
          </Link>
        )}
      </div>
      <button
        type="button"
        className="om-close"
        aria-label="閉じる"
        onClick={() => {
          trackOnsiteMsg("dismiss", shown.c.id, shown.c.trigger, { preview: shown.preview });
          setShown(null);
        }}
      >
        ×
      </button>
    </div>
  );
}
