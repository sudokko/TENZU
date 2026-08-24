"use client";

/* =========================================================================
   オンサイトメッセージ（自前 Web 接客）
   - 設計 SSOT: acquisition/onsite-messaging.md（G1-G7 が機能要件より上位）
   - キャンペーン定義は DynamoDB（配信 API /api/onsite/campaigns から取得）。
     取得失敗・未設定時は「出さない側」に倒す（§5 と同方向）
   - 頻度制御: localStorage `tenzu_om_{id}` に表示/閉じる/クリックを保存（G2）
   - 同時 1 件・1 ページビュー 1 件（G3）。localStorage 不可環境では出さない側に倒す
   - dev 検証: `?om_preview={id}` で既読・active を無視して強制表示（既読は焼かず、
     first-party カウンタにも数えない）
   ========================================================================= */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useCart } from "../../cart/CartContext";
import { trackOnsiteMsg } from "../../analytics";
import { type Campaign } from "./campaigns";
import "./onsite.css";

const READ_PREFIX = "tenzu_om_";
const PRODUCT_VIEWS_KEY = "tenzu_om_product_views";

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

type DeliveryState = {
  impressions: number;
  lastShownAt?: string;
  lastDismissedAt?: string;
  clicked?: boolean;
};

function readState(id: string): DeliveryState {
  try {
    const raw = window.localStorage.getItem(READ_PREFIX + id);
    if (!raw) return { impressions: 0 };
    try {
      const parsed = JSON.parse(raw) as DeliveryState;
      if (typeof parsed.impressions === "number") return parsed;
    } catch {
      /* 旧形式は ISO 日時文字列。表示済み 1 回として扱い、後方互換を保つ */
    }
    return { impressions: 1, lastShownAt: raw };
  } catch {
    return { impressions: Number.MAX_SAFE_INTEGER }; // 読めない環境は出さない
  }
}

function writeState(id: string, state: DeliveryState): void {
  try {
    window.localStorage.setItem(READ_PREFIX + id, JSON.stringify(state));
  } catch {
    /* storageOk() が先に弾くため通常は到達しない */
  }
}

function canShow(c: Campaign): boolean {
  const state = readState(c.id);
  const max = c.frequency?.maxImpressions ?? 1;
  if ((c.frequency?.stopOnClick ?? true) && state.clicked) return false;
  if (state.impressions >= max) return false;
  const cooldown = c.frequency?.cooldownDays;
  const since = state.lastDismissedAt ?? state.lastShownAt;
  if (cooldown && since) {
    const elapsed = Date.now() - new Date(since).getTime();
    if (Number.isFinite(elapsed) && elapsed < cooldown * 86_400_000) return false;
  }
  return true;
}

function recordDelivery(id: string, action: "show" | "dismiss" | "click"): void {
  const now = new Date().toISOString();
  const state = readState(id);
  if (action === "show") {
    writeState(id, { ...state, impressions: Math.max(0, state.impressions) + 1, lastShownAt: now });
  } else if (action === "dismiss") {
    writeState(id, { ...state, lastDismissedAt: now });
  } else {
    writeState(id, { ...state, clicked: true });
  }
}

function recordProductView(path: string): void {
  if (!/^\/products\/[^/]+/.test(path)) return;
  try {
    const current = JSON.parse(window.sessionStorage.getItem(PRODUCT_VIEWS_KEY) ?? "[]") as unknown;
    const paths = Array.isArray(current) ? current.filter((v): v is string => typeof v === "string") : [];
    if (!paths.includes(path)) {
      window.sessionStorage.setItem(PRODUCT_VIEWS_KEY, JSON.stringify([...paths, path].slice(-20)));
    }
  } catch {
    /* 閲覧数は早期表示の補助条件。使えなくても idleSec の通常経路は残る */
  }
}

function productViewCount(): number {
  try {
    const current = JSON.parse(window.sessionStorage.getItem(PRODUCT_VIEWS_KEY) ?? "[]") as unknown;
    return Array.isArray(current) ? current.length : 0;
  } catch {
    return 0;
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
  useEffect(() => {
    cartRef.current = { ready: cart.ready, count: cart.count };
  }, [cart.ready, cart.count]);

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
    recordProductView(pathname);
    const t = window.setTimeout(() => setShown(null), 0);
    return () => window.clearTimeout(t);
  }, [pathname]);

  /* プレビューモード: ?om_preview={id}（既読は焼かない・active も無視・計測に数えない） */
  useEffect(() => {
    if (suppressed || !campaigns) return;
    const id = new URLSearchParams(window.location.search).get("om_preview");
    if (!id) return;
    const c = campaigns.find((x) => x.id === id);
    if (!c) return;
    shownThisPv.current = true;
    const t = window.setTimeout(() => {
      setShown({ c, preview: true });
      trackOnsiteMsg("show", c.id, c.trigger, { preview: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [pathname, campaigns, suppressed]);

  /* 本番トリガー評価 */
  useEffect(() => {
    if (suppressed || !campaigns) return;
    if (shownThisPv.current) return;
    if (!storageOk()) return; // 出し過ぎより出ない方がブランド整合（§5）
    if (new URLSearchParams(window.location.search).has("om_preview")) return;

    const candidates = campaigns
      .filter((c) => c.active && pageMatches(c, pathname) && canShow(c))
      .sort((a, b) => a.priority - b.priority);
    if (candidates.length === 0) return;

    const cleanups: (() => void)[] = [];

    const fire = (c: Campaign) => {
      if (shownThisPv.current) return; // priority 上位が先に出ていたら譲る（G3）
      shownThisPv.current = true;
      recordDelivery(c.id, "show");
      setShown({ c, preview: false });
      trackOnsiteMsg("show", c.id, c.trigger);
    };

    for (const c of candidates) {
      if (c.trigger === "first_visit") {
        // delay と読了率を AND で満たしてから表示。到着直後の反射閉じを避ける。
        let delayMet = false;
        const minScrollPct = c.conditions?.minScrollPct ?? 0;
        const scrollMet = () => {
          if (minScrollPct <= 0) return true;
          const max = document.documentElement.scrollHeight - window.innerHeight;
          const pct = max <= 0 ? 100 : (window.scrollY / max) * 100;
          return pct >= minScrollPct;
        };
        const maybeFire = () => { if (delayMet && scrollMet()) fire(c); };
        const t = window.setTimeout(() => {
          delayMet = true;
          maybeFire();
        }, Math.max(c.delaySec ?? 3, 3) * 1000);
        window.addEventListener("scroll", maybeFire, { passive: true });
        cleanups.push(() => {
          window.clearTimeout(t);
          window.removeEventListener("scroll", maybeFire);
        });
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
        // 商品を複数見比べた人には、無操作時間を待たず短い間を置いて案内する。
        const minViews = c.conditions?.minProductViews;
        const early = minViews && productViewCount() >= minViews
          ? window.setTimeout(() => fire(c), 800)
          : undefined;
        cleanups.push(() => {
          stop();
          if (early !== undefined) window.clearTimeout(early);
          evs.forEach((e) => window.removeEventListener(e, onActivity));
          document.removeEventListener("visibilitychange", onVis);
        });
      } else if (c.trigger === "cart_abandon") {
        // スマホの疑似 exit intent（visibility 復帰）は唐突なので使わない。
        // カートを保持したまま別ページへ来た時、短い間を置いて事実だけ知らせる。
        const armed = () => cartRef.current.ready && cartRef.current.count > 0;
        const t = window.setTimeout(() => { if (armed()) fire(c); }, 6000);
        cleanups.push(() => {
          window.clearTimeout(t);
        });
      }
    }

    return () => cleanups.forEach((f) => f());
  }, [pathname, campaigns, suppressed]);

  /* カード外クリックでも消える（G5）。閉じた事実は dismiss として保存する */
  useEffect(() => {
    if (!shown) return;
    const onDocClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        if (!shown.preview) recordDelivery(shown.c.id, "dismiss");
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

  const message = shown.c.message.replaceAll("{count}", String(cart.count));
  const headline = shown.c.headline?.replaceAll("{count}", String(cart.count));
  const layout = shown.c.layout ?? { mobile: "bottom" as const, desktop: "corner" as const };
  const imageVisible = shown.c.image && layout.imageVariant !== "none";
  const className = [
    "om-card",
    `om-mobile-${layout.mobile}`,
    `om-desktop-${layout.desktop}`,
    imageVisible ? "om-has-image" : "om-no-image",
  ].join(" ");

  const card = (
    <aside
      className={className}
      role="region"
      aria-label={headline ?? "TENZU からのご案内"}
      aria-live="polite"
      ref={cardRef}
    >
      {imageVisible && shown.c.image && (
        // eslint-disable-next-line @next/next/no-img-element
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
        {headline && <p className="om-headline">{headline}</p>}
        <p className="om-msg">{message}</p>
        {shown.c.cta && (
          <Link
            href={shown.c.cta.href}
            className="om-cta"
            onClick={() => {
              if (!shown.preview) recordDelivery(shown.c.id, "click");
              trackOnsiteMsg("click", shown.c.id, shown.c.trigger, { preview: shown.preview });
              setShown(null);
            }}
          >
            {shown.c.cta.label}<span aria-hidden="true"> →</span>
          </Link>
        )}
      </div>
      <button
        type="button"
        className="om-close"
        aria-label="閉じる"
        onClick={() => {
          if (!shown.preview) recordDelivery(shown.c.id, "dismiss");
          trackOnsiteMsg("dismiss", shown.c.id, shown.c.trigger, { preview: shown.preview });
          setShown(null);
        }}
      >
        ×
      </button>
    </aside>
  );

  if (layout.mobile === "inline" || layout.desktop === "inline") {
    const anchor = layout.inlineAnchor
      ? document.querySelector<HTMLElement>(`[data-onsite-anchor="${CSS.escape(layout.inlineAnchor)}"]`)
      : null;
    if (anchor) return createPortal(card, anchor);
  }
  return card;
}
