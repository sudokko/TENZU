"use client";

/* =========================================================================
   オンサイトメッセージ管理（本番稼働・オーナー専用）。
   設計 SSOT: acquisition/onsite-messaging.md §9。
   - キャンペーン一覧（active トグル・直近 7 日 show/click・プレビュー）＋編集フォーム
   - 保存 = PUT → DynamoDB 即時反映（デプロイ不要）
   - NG 語彙は警告のみ（保存はブロックしない・SSOT は foundation/voice-tone.md）
   - 統計タブ = 日次カウンタ（show/click/dismiss・click 率）
   ========================================================================= */

import { useEffect, useMemo, useState } from "react";
import type { Campaign } from "../../components/onsite/campaigns";
import type { CampaignRecord, StatRow } from "../../lib/onsite-store";
import { checkNgWords } from "./ng-words";
import { resizeImage } from "./resize";

const TRIGGER_LABEL: Record<Campaign["trigger"], string> = {
  first_visit: "初回訪問",
  idle: "アイドル",
  cart_abandon: "カート放置",
};

/* ---- フォームドラフト（全フィールドを文字列で持ち、保存時に Campaign へ変換）---- */

type Draft = {
  id: string;
  trigger: Campaign["trigger"];
  pages: string; // textarea 1 行 1 パス。空欄 = 全ページ（[""]）
  excludePages: string;
  headline: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
  imageSrc: string;
  imageAlt: string;
  layoutMobile: NonNullable<Campaign["layout"]>["mobile"];
  layoutDesktop: NonNullable<Campaign["layout"]>["desktop"];
  imageVariant: "side" | "none";
  inlineAnchor: string;
  minScrollPct: string;
  minProductViews: string;
  maxImpressions: "1" | "2";
  cooldownDays: string;
  priority: string;
  delaySec: string;
  idleSec: string;
  active: boolean;
};

function newDraft(): Draft {
  return {
    id: "",
    trigger: "first_visit",
    pages: "/",
    excludePages: "",
    headline: "",
    message: "",
    ctaLabel: "",
    ctaHref: "",
    imageSrc: "",
    imageAlt: "",
    layoutMobile: "floating",
    layoutDesktop: "corner",
    imageVariant: "side",
    inlineAnchor: "",
    minScrollPct: "",
    minProductViews: "",
    maxImpressions: "1",
    cooldownDays: "",
    priority: "50",
    delaySec: "",
    idleSec: "",
    active: false,
  };
}

function toDraft(c: Campaign): Draft {
  return {
    id: c.id,
    trigger: c.trigger,
    pages: c.pages.join("\n"),
    excludePages: (c.excludePages ?? []).join("\n"),
    headline: c.headline ?? "",
    message: c.message,
    ctaLabel: c.cta?.label ?? "",
    ctaHref: c.cta?.href ?? "",
    imageSrc: c.image?.src ?? "",
    imageAlt: c.image?.alt ?? "",
    layoutMobile: c.layout?.mobile ?? "bottom",
    layoutDesktop: c.layout?.desktop ?? "corner",
    imageVariant: c.layout?.imageVariant ?? "side",
    inlineAnchor: c.layout?.inlineAnchor ?? "",
    minScrollPct: c.conditions?.minScrollPct != null ? String(c.conditions.minScrollPct) : "",
    minProductViews: c.conditions?.minProductViews != null ? String(c.conditions.minProductViews) : "",
    maxImpressions: String(c.frequency?.maxImpressions ?? 1) as "1" | "2",
    cooldownDays: c.frequency?.cooldownDays != null ? String(c.frequency.cooldownDays) : "",
    priority: String(c.priority),
    delaySec: c.delaySec != null ? String(c.delaySec) : "",
    idleSec: c.idleSec != null ? String(c.idleSec) : "",
    active: c.active,
  };
}

/* Draft → Campaign。問題があればエラー文言（string）を返す */
function fromDraft(d: Draft): Campaign | string {
  const id = d.id.trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(id)) {
    return "id は英小文字・数字・ハイフン・アンダースコア（64 字まで）です";
  }

  const pageLines = d.pages.split("\n").map((s) => s.trim()).filter(Boolean);
  const pages = pageLines.length > 0 ? pageLines : [""]; // 空欄 = 全ページ
  const excludePages = d.excludePages.split("\n").map((s) => s.trim()).filter(Boolean);

  const message = d.message.trim();
  if (!message) return "メッセージ本文は必須です";
  const headline = d.headline.trim();

  const ctaLabel = d.ctaLabel.trim();
  const ctaHref = d.ctaHref.trim();
  if ((ctaLabel && !ctaHref) || (!ctaLabel && ctaHref)) {
    return "CTA はラベルとリンク先の両方を入れてください（不要なら両方空欄）";
  }

  const imageSrc = d.imageSrc.trim();
  const imageAlt = d.imageAlt.trim();
  if (imageSrc && !imageAlt) return "画像には alt（代替テキスト）が必須です";

  const inlineAnchor = d.inlineAnchor.trim();
  if ((d.layoutMobile === "inline" || d.layoutDesktop === "inline") && !inlineAnchor) {
    return "文脈内表示には挿入先アンカーが必要です";
  }

  const minScrollPct = d.minScrollPct.trim() === "" ? undefined : Number(d.minScrollPct);
  if (minScrollPct !== undefined && (!Number.isFinite(minScrollPct) || minScrollPct < 0 || minScrollPct > 100)) {
    return "最小スクロール率は 0〜100 にしてください";
  }
  const minProductViews = d.minProductViews.trim() === "" ? undefined : Number(d.minProductViews);
  if (minProductViews !== undefined && (!Number.isInteger(minProductViews) || minProductViews < 1)) {
    return "商品閲覧数は 1 以上の整数にしてください";
  }
  const cooldownDays = d.cooldownDays.trim() === "" ? undefined : Number(d.cooldownDays);
  if (cooldownDays !== undefined && (!Number.isInteger(cooldownDays) || cooldownDays < 1)) {
    return "再表示までの日数は 1 以上の整数にしてください";
  }

  const priority = Number(d.priority);
  if (!Number.isFinite(priority)) return "priority は数値にしてください";

  const delaySec = d.delaySec.trim() === "" ? undefined : Number(d.delaySec);
  if (delaySec !== undefined && (!Number.isFinite(delaySec) || delaySec < 0)) {
    return "表示までの秒数が不正です";
  }
  const idleSec = d.idleSec.trim() === "" ? undefined : Number(d.idleSec);
  if (idleSec !== undefined && (!Number.isFinite(idleSec) || idleSec <= 0)) {
    return "アイドル秒数が不正です";
  }

  return {
    id,
    trigger: d.trigger,
    pages,
    ...(excludePages.length > 0 ? { excludePages } : {}),
    ...(headline ? { headline } : {}),
    message,
    ...(ctaLabel ? { cta: { label: ctaLabel, href: ctaHref } } : {}),
    ...(imageSrc ? { image: { src: imageSrc, alt: imageAlt } } : {}),
    layout: {
      mobile: d.layoutMobile,
      desktop: d.layoutDesktop,
      imageVariant: d.imageVariant,
      ...(inlineAnchor ? { inlineAnchor } : {}),
    },
    ...((minScrollPct !== undefined || minProductViews !== undefined) ? {
      conditions: {
        ...(minScrollPct !== undefined ? { minScrollPct } : {}),
        ...(minProductViews !== undefined ? { minProductViews } : {}),
      },
    } : {}),
    frequency: {
      maxImpressions: Number(d.maxImpressions) as 1 | 2,
      ...(d.maxImpressions === "2" && cooldownDays !== undefined ? { cooldownDays } : {}),
      stopOnClick: true,
    },
    priority,
    ...(delaySec !== undefined ? { delaySec } : {}),
    ...(idleSec !== undefined ? { idleSec } : {}),
    active: d.active,
  };
}

function stripMeta(r: CampaignRecord): Campaign {
  const rest = { ...r };
  delete rest.createdAt;
  delete rest.updatedAt;
  return rest;
}

function CampaignPreview({ draft }: { draft: Draft }) {
  const showImage = Boolean(draft.imageSrc) && draft.imageVariant === "side";
  const headline = draft.headline.replaceAll("{count}", "1") || "見出しプレビュー";
  const message = draft.message.replaceAll("{count}", "1") || "本文を入力すると、ここへ反映されます。";
  return (
    <div className="adm-preview-wrap">
      <div className="adm-preview-head">
        <span>スマホ実寸プレビュー</span>
        <span>390px · {draft.layoutMobile === "floating" ? "中央寄せ" : draft.layoutMobile === "bottom" ? "下部" : "文脈内"}</span>
      </div>
      <div className="adm-phone">
        <div className="adm-phone-bar">TENZU <span>点描写プリント専門店</span></div>
        <div className="adm-phone-page">
          <small>HOME / 点描写プリント</small>
          <h3>見て、考えて、書く力を、点描写から。</h3>
          <p>今の地点に合う一枚を、中身を見て選べます。</p>
          <div className="adm-phone-paper" />
        </div>
        <aside className={`adm-card-preview is-${draft.layoutMobile} ${showImage ? "has-image" : "no-image"}`}>
          {showImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.imageSrc} alt="" />
          )}
          <div>
            <strong>{headline}</strong>
            <p>{message}</p>
            {draft.ctaLabel && <span>{draft.ctaLabel} →</span>}
          </div>
          <i aria-hidden="true">×</i>
        </aside>
      </div>
    </div>
  );
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* オーナーのローカル時刻基準で「n 日前」の日付文字列（useState の lazy 初期化から呼ぶ） */
function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

async function readError(r: Response): Promise<string> {
  const j = (await r.json().catch(() => null)) as { error?: string } | null;
  return j?.error ?? `エラー（${r.status}）`;
}

/* ========================================================================= */

export default function OnsiteAdminApp() {
  const [tab, setTab] = useState<"campaigns" | "stats">("campaigns");
  const [campaigns, setCampaigns] = useState<CampaignRecord[] | null>(null);
  const [recent, setRecent] = useState<StatRow[]>([]); // 直近 7 日（一覧の小計用）
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadCampaigns() {
    try {
      const r = await fetch("/api/admin/onsite/campaigns");
      if (!r.ok) throw new Error(await readError(r));
      const j = (await r.json()) as { campaigns: CampaignRecord[] };
      setCampaigns(j.campaigns);
      setErr("");
    } catch (e) {
      setCampaigns([]);
      setErr((e as Error).message);
    }
  }

  async function loadRecent() {
    try {
      const from = daysAgoStr(6);
      const to = daysAgoStr(0);
      const r = await fetch(`/api/admin/onsite/stats?from=${from}&to=${to}`);
      if (!r.ok) return;
      const j = (await r.json()) as { rows: StatRow[] };
      setRecent(j.rows);
    } catch {
      /* 小計は無くても画面は成立する */
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadCampaigns();
      void loadRecent();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const recentByCampaign = useMemo(() => {
    const m = new Map<string, { show: number; click: number }>();
    for (const r of recent) {
      const cur = m.get(r.campaignId) ?? { show: 0, click: 0 };
      cur.show += r.show;
      cur.click += r.click;
      m.set(r.campaignId, cur);
    }
    return m;
  }, [recent]);

  const ngHits = useMemo(
    () => (draft ? checkNgWords(`${draft.headline}\n${draft.message}\n${draft.ctaLabel}`) : []),
    [draft],
  );

  async function save() {
    if (!draft || busy) return;
    const parsed = fromDraft(draft);
    if (typeof parsed === "string") {
      setErr(parsed);
      return;
    }
    if (isNew && campaigns?.some((c) => c.id === parsed.id)) {
      setErr(`id「${parsed.id}」は既に存在します`);
      return;
    }
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const r = await fetch(`/api/admin/onsite/campaigns/${encodeURIComponent(parsed.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (!r.ok) throw new Error(await readError(r));
      setMsg(`保存しました（即時反映）: ${parsed.id}`);
      setDraft(null);
      await loadCampaigns();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(rec: CampaignRecord) {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const next = { ...stripMeta(rec), active: !rec.active };
      const r = await fetch(`/api/admin/onsite/campaigns/${encodeURIComponent(rec.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!r.ok) throw new Error(await readError(r));
      setMsg(`${rec.id} を ${next.active ? "配信中" : "停止"} にしました`);
      await loadCampaigns();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    if (!window.confirm(`「${id}」を削除しますか？\n（運用上の停止は削除ではなく「停止」を使ってください）`)) {
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(`/api/admin/onsite/campaigns/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error(await readError(r));
      setMsg(`削除しました: ${id}`);
      setDraft(null);
      await loadCampaigns();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function syncTemplates() {
    if (busy) return;
    if (campaigns && campaigns.length > 0 && !window.confirm(
      "推奨5テンプレートの見出し・本文・画像・表示条件で、同じidの設定を更新します。\n現在の個別編集内容は上書きされます。反映しますか？",
    )) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/onsite/seed?replace=1", { method: "POST" });
      if (!r.ok) throw new Error(await readError(r));
      const j = (await r.json()) as { updated: string[] };
      setMsg(`推奨テンプレートを反映しました: ${j.updated.join(", ")}`);
      await loadCampaigns();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file: File) {
    if (!draft) return;
    setBusy(true);
    setErr("");
    try {
      const blob = await resizeImage(file);
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const form = new FormData();
      form.append("file", new File([blob], `onsite.${ext}`, { type: blob.type }));
      const r = await fetch("/api/admin/onsite/image", { method: "POST", body: form });
      if (!r.ok) throw new Error(await readError(r));
      const j = (await r.json()) as { src: string };
      setDraft((d) => (d ? { ...d, imageSrc: j.src } : d));
      setMsg("画像をアップロードしました（保存を押すまでカードには反映されません）");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    window.location.reload();
  }

  return (
    <main className="adm-wrap">
      <header className="adm-header">
        <h1 className="adm-title">オンサイトメッセージ管理</h1>
        <nav className="adm-tabs">
          <button
            type="button"
            className={`adm-tab ${tab === "campaigns" ? "is-active" : ""}`}
            onClick={() => setTab("campaigns")}
          >
            キャンペーン
          </button>
          <button
            type="button"
            className={`adm-tab ${tab === "stats" ? "is-active" : ""}`}
            onClick={() => setTab("stats")}
          >
            統計
          </button>
        </nav>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={logout}>
          ログアウト
        </button>
      </header>

      {msg && <p className="adm-msg" role="status">{msg}</p>}
      {err && <p className="adm-error" role="alert">{err}</p>}

      {tab === "campaigns" && (
        <>
          <section className="adm-list">
            <div className="adm-list-head">
              <h2 className="adm-h2">キャンペーン一覧</h2>
              <div className="adm-list-actions">
                <button type="button" className="adm-btn" onClick={syncTemplates} disabled={busy}>
                  推奨5テンプレートを反映
                </button>
                <button
                  type="button"
                  className="adm-btn adm-btn-primary"
                  onClick={() => {
                    setDraft(newDraft());
                    setIsNew(true);
                    setErr("");
                    setMsg("");
                  }}
                >
                  新規作成
                </button>
              </div>
            </div>

            {campaigns === null ? (
              <p className="adm-hint">読み込み中…</p>
            ) : campaigns.length === 0 ? (
              <p className="adm-hint">
                キャンペーンがまだありません。「推奨5テンプレートを反映」で初期設定を投入できます。
              </p>
            ) : (
              <div className="adm-table-scroll">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>id</th>
                      <th>トリガー</th>
                      <th>対象ページ</th>
                      <th>優先</th>
                      <th>状態</th>
                      <th>7日 表示/クリック</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => {
                      const stat = recentByCampaign.get(c.id);
                      const previewPath = c.pages[0] || "/";
                      return (
                        <tr key={c.id} className={c.active ? "" : "is-inactive"}>
                          <td className="adm-td-id">{c.id}</td>
                          <td>
                            <span className="adm-badge">{TRIGGER_LABEL[c.trigger]}</span>
                          </td>
                          <td className="adm-td-pages">
                            {c.pages.map((p) => (p === "" ? "（全ページ）" : p)).join(", ")}
                          </td>
                          <td className="adm-td-num">{c.priority}</td>
                          <td>
                            <button
                              type="button"
                              className={`adm-toggle ${c.active ? "is-on" : ""}`}
                              onClick={() => toggleActive(c)}
                              disabled={busy}
                            >
                              {c.active ? "配信中" : "停止"}
                            </button>
                          </td>
                          <td className="adm-td-num">
                            {stat ? `${stat.show} / ${stat.click}` : "— / —"}
                          </td>
                          <td className="adm-td-actions">
                            <a
                              className="adm-link"
                              href={`${previewPath}?om_preview=${encodeURIComponent(c.id)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              プレビュー
                            </a>
                            <button
                              type="button"
                              className="adm-link adm-link-btn"
                              onClick={() => {
                                setDraft(toDraft(stripMeta(c)));
                                setIsNew(false);
                                setErr("");
                                setMsg("");
                              }}
                            >
                              編集
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="adm-hint">
              生涯 1 回制約のため常時 5 本以内に厳選（onsite-messaging.md §8）。停止は「削除」ではなく
              トグルで（既読キー履歴を残す）。
            </p>
          </section>

          {draft && (
            <section className="adm-form">
              <h2 className="adm-h2">{isNew ? "新規キャンペーン" : `編集: ${draft.id}`}</h2>

              <div className="adm-field">
                <label className="adm-label" htmlFor="adm-id">id（既読キーに使う・後から変えない）</label>
                <input
                  id="adm-id"
                  className="adm-input"
                  value={draft.id}
                  onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                  disabled={!isNew}
                  placeholder="例: autumn-lp-2026"
                />
              </div>

              <div className="adm-row">
                <div className="adm-field">
                  <label className="adm-label" htmlFor="adm-trigger">トリガー</label>
                  <select
                    id="adm-trigger"
                    className="adm-input"
                    value={draft.trigger}
                    onChange={(e) =>
                      setDraft({ ...draft, trigger: e.target.value as Campaign["trigger"] })
                    }
                  >
                    <option value="first_visit">初回訪問（表示まで数秒待つ）</option>
                    <option value="idle">アイドル（無操作が続いたら）</option>
                    <option value="cart_abandon">カート放置（離脱の予兆）</option>
                  </select>
                </div>
                <div className="adm-field">
                  <label className="adm-label" htmlFor="adm-priority">priority（小さいほど優先）</label>
                  <input
                    id="adm-priority"
                    className="adm-input"
                    inputMode="numeric"
                    value={draft.priority}
                    onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                  />
                </div>
                {draft.trigger === "first_visit" && (
                  <div className="adm-field">
                    <label className="adm-label" htmlFor="adm-delay">表示までの秒数（既定 3・最低 3）</label>
                    <input
                      id="adm-delay"
                      className="adm-input"
                      inputMode="numeric"
                      value={draft.delaySec}
                      onChange={(e) => setDraft({ ...draft, delaySec: e.target.value })}
                      placeholder="3"
                    />
                  </div>
                )}
                {draft.trigger === "idle" && (
                  <div className="adm-field">
                    <label className="adm-label" htmlFor="adm-idle">アイドル秒数（既定 60）</label>
                    <input
                      id="adm-idle"
                      className="adm-input"
                      inputMode="numeric"
                      value={draft.idleSec}
                      onChange={(e) => setDraft({ ...draft, idleSec: e.target.value })}
                      placeholder="60"
                    />
                  </div>
                )}
              </div>

              <div className="adm-row">
                <div className="adm-field">
                  <label className="adm-label" htmlFor="adm-max-impressions">最大表示回数</label>
                  <select
                    id="adm-max-impressions"
                    className="adm-input"
                    value={draft.maxImpressions}
                    onChange={(e) => setDraft({
                      ...draft,
                      maxImpressions: e.target.value as Draft["maxImpressions"],
                    })}
                  >
                    <option value="1">1回だけ</option>
                    <option value="2">最大2回</option>
                  </select>
                </div>
                {draft.maxImpressions === "2" && (
                  <div className="adm-field">
                    <label className="adm-label" htmlFor="adm-cooldown">再表示までの日数</label>
                    <input
                      id="adm-cooldown"
                      className="adm-input"
                      inputMode="numeric"
                      value={draft.cooldownDays}
                      onChange={(e) => setDraft({ ...draft, cooldownDays: e.target.value })}
                      placeholder="例: 30"
                    />
                  </div>
                )}
              </div>

              <div className="adm-row">
                <div className="adm-field">
                  <label className="adm-label" htmlFor="adm-layout-mobile">スマホの表示位置</label>
                  <select
                    id="adm-layout-mobile"
                    className="adm-input"
                    value={draft.layoutMobile}
                    onChange={(e) => setDraft({
                      ...draft,
                      layoutMobile: e.target.value as Draft["layoutMobile"],
                    })}
                  >
                    <option value="floating">中央寄せ（非モーダル）</option>
                    <option value="bottom">画面下部</option>
                    <option value="inline">文脈内</option>
                  </select>
                </div>
                <div className="adm-field">
                  <label className="adm-label" htmlFor="adm-layout-desktop">PCの表示位置</label>
                  <select
                    id="adm-layout-desktop"
                    className="adm-input"
                    value={draft.layoutDesktop}
                    onChange={(e) => setDraft({
                      ...draft,
                      layoutDesktop: e.target.value as Draft["layoutDesktop"],
                    })}
                  >
                    <option value="corner">右下</option>
                    <option value="inline">文脈内</option>
                  </select>
                </div>
                <div className="adm-field">
                  <label className="adm-label" htmlFor="adm-image-variant">画像表示</label>
                  <select
                    id="adm-image-variant"
                    className="adm-input"
                    value={draft.imageVariant}
                    onChange={(e) => setDraft({
                      ...draft,
                      imageVariant: e.target.value as Draft["imageVariant"],
                    })}
                  >
                    <option value="side">画像＋文言</option>
                    <option value="none">文言のみ</option>
                  </select>
                </div>
              </div>

              {(draft.layoutMobile === "inline" || draft.layoutDesktop === "inline") && (
                <div className="adm-field">
                  <label className="adm-label" htmlFor="adm-inline-anchor">文脈内の挿入先アンカー</label>
                  <input
                    id="adm-inline-anchor"
                    className="adm-input"
                    value={draft.inlineAnchor}
                    onChange={(e) => setDraft({ ...draft, inlineAnchor: e.target.value })}
                    placeholder="例: maker-pdf"
                  />
                  <p className="adm-hint">ページ側の data-onsite-anchor と同じ値を指定します。</p>
                </div>
              )}

              <div className="adm-row">
                {draft.trigger === "first_visit" && (
                  <div className="adm-field">
                    <label className="adm-label" htmlFor="adm-min-scroll">最小スクロール率（%・秒数とAND）</label>
                    <input
                      id="adm-min-scroll"
                      className="adm-input"
                      inputMode="numeric"
                      value={draft.minScrollPct}
                      onChange={(e) => setDraft({ ...draft, minScrollPct: e.target.value })}
                      placeholder="例: 35"
                    />
                  </div>
                )}
                {draft.trigger === "idle" && (
                  <div className="adm-field">
                    <label className="adm-label" htmlFor="adm-min-product-views">商品閲覧数（到達時は早期表示）</label>
                    <input
                      id="adm-min-product-views"
                      className="adm-input"
                      inputMode="numeric"
                      value={draft.minProductViews}
                      onChange={(e) => setDraft({ ...draft, minProductViews: e.target.value })}
                      placeholder="例: 2"
                    />
                  </div>
                )}
              </div>

              <div className="adm-row">
                <div className="adm-field">
                  <label className="adm-label" htmlFor="adm-pages">
                    対象ページ（1 行 1 パス・前方一致。&quot;/&quot; は TOP のみ。空欄 = 全ページ）
                  </label>
                  <textarea
                    id="adm-pages"
                    className="adm-textarea"
                    rows={3}
                    value={draft.pages}
                    onChange={(e) => setDraft({ ...draft, pages: e.target.value })}
                    placeholder={"/products\n/articles"}
                  />
                </div>
                <div className="adm-field">
                  <label className="adm-label" htmlFor="adm-exclude">除外ページ（1 行 1 パス・対象より優先）</label>
                  <textarea
                    id="adm-exclude"
                    className="adm-textarea"
                    rows={3}
                    value={draft.excludePages}
                    onChange={(e) => setDraft({ ...draft, excludePages: e.target.value })}
                    placeholder={"/cart\n/checkout"}
                  />
                </div>
              </div>

              <div className="adm-field">
                <label className="adm-label" htmlFor="adm-headline">見出し（18字目安・任意）</label>
                <input
                  id="adm-headline"
                  className="adm-input"
                  value={draft.headline}
                  onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
                />
                {draft.headline.length > 24 && (
                  <p className="adm-warn">24字を超えています — スマホで2行を超えない長さを推奨します。</p>
                )}
              </div>

              <div className="adm-field">
                <label className="adm-label" htmlFor="adm-message">
                  メッセージ本文（1〜2 文・提案トーン。&#123;count&#125; はカート点数に置換）
                </label>
                <textarea
                  id="adm-message"
                  className="adm-textarea"
                  rows={2}
                  value={draft.message}
                  onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                />
                {draft.message.length > 120 && (
                  <p className="adm-warn">120 字を超えています — カードは 1〜2 文が目安です（G6）</p>
                )}
              </div>

              <div className="adm-row">
                <div className="adm-field">
                  <label className="adm-label" htmlFor="adm-cta-label">CTA ラベル（任意・1 つまで）</label>
                  <input
                    id="adm-cta-label"
                    className="adm-input"
                    value={draft.ctaLabel}
                    onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })}
                    placeholder="例: 品ぞろえを見る"
                  />
                </div>
                <div className="adm-field">
                  <label className="adm-label" htmlFor="adm-cta-href">CTA リンク先</label>
                  <input
                    id="adm-cta-href"
                    className="adm-input"
                    value={draft.ctaHref}
                    onChange={(e) => setDraft({ ...draft, ctaHref: e.target.value })}
                    placeholder="例: /products"
                  />
                </div>
              </div>

              {ngHits.length > 0 && (
                <p className="adm-warn" role="alert">
                  NG 語彙が含まれています（voice-tone.md）: <strong>{ngHits.join("、")}</strong>
                  {" "}— 保存はできますが文言の見直しを推奨します
                </p>
              )}

              <div className="adm-field">
                <span className="adm-label">画像（任意・カードに 64px サムネイル表示）</span>
                <div className="adm-image-row">
                  {draft.imageSrc ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="adm-thumb" src={draft.imageSrc} alt={draft.imageAlt || "アップロード画像"} width={64} height={64} />
                      <button
                        type="button"
                        className="adm-btn"
                        onClick={() => setDraft({ ...draft, imageSrc: "", imageAlt: "" })}
                      >
                        画像を外す
                      </button>
                    </>
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      className="adm-file"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadImage(f);
                        e.target.value = "";
                      }}
                      disabled={busy}
                    />
                  )}
                </div>
                {draft.imageSrc && (
                  <input
                    className="adm-input"
                    value={draft.imageAlt}
                    onChange={(e) => setDraft({ ...draft, imageAlt: e.target.value })}
                    placeholder="alt（代替テキスト・必須）例: 秋の特集ページのイメージ"
                  />
                )}
              </div>

              <CampaignPreview draft={draft} />

              <div className="adm-field">
                <label className="adm-check">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                  />
                  配信する（active）
                </label>
              </div>

              <div className="adm-form-actions">
                <button type="button" className="adm-btn adm-btn-primary" onClick={save} disabled={busy}>
                  {busy ? "保存中…" : "保存（即時反映）"}
                </button>
                <button type="button" className="adm-btn" onClick={() => setDraft(null)} disabled={busy}>
                  閉じる
                </button>
                {!isNew && (
                  <button
                    type="button"
                    className="adm-btn adm-btn-danger"
                    onClick={() => remove(draft.id)}
                    disabled={busy}
                  >
                    削除
                  </button>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {tab === "stats" && <StatsView />}
    </main>
  );
}

/* ---- 統計タブ ---- */

function StatsView() {
  const [from, setFrom] = useState(() => daysAgoStr(13));
  const [to, setTo] = useState(() => daysAgoStr(0));
  const [rows, setRows] = useState<StatRow[] | null>(null);
  const [err, setErr] = useState("");

  async function load(f: string, t: string) {
    setErr("");
    try {
      const r = await fetch(`/api/admin/onsite/stats?from=${f}&to=${t}`);
      if (!r.ok) throw new Error(await readError(r));
      const j = (await r.json()) as { rows: StatRow[] };
      setRows(j.rows);
    } catch (e) {
      setRows([]);
      setErr((e as Error).message);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(from, to), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const m = new Map<string, { show: number; click: number; dismiss: number }>();
    for (const r of rows ?? []) {
      const cur = m.get(r.campaignId) ?? { show: 0, click: 0, dismiss: 0 };
      cur.show += r.show;
      cur.click += r.click;
      cur.dismiss += r.dismiss;
      m.set(r.campaignId, cur);
    }
    return [...m.entries()].sort((a, b) => b[1].show - a[1].show);
  }, [rows]);

  const daily = useMemo(
    () =>
      [...(rows ?? [])].sort(
        (a, b) => b.date.localeCompare(a.date) || a.campaignId.localeCompare(b.campaignId),
      ),
    [rows],
  );

  const rate = (click: number, show: number) =>
    show > 0 ? `${((click / show) * 100).toFixed(1)}%` : "—";

  return (
    <section>
      <div className="adm-stats-controls">
        <label className="adm-label" htmlFor="adm-from">期間</label>
        <input
          id="adm-from"
          type="date"
          className="adm-input adm-input-date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <span>〜</span>
        <input
          type="date"
          className="adm-input adm-input-date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="終了日"
        />
        <button type="button" className="adm-btn" onClick={() => load(from, to)}>
          表示
        </button>
      </div>

      {err && <p className="adm-error" role="alert">{err}</p>}

      {rows === null ? (
        <p className="adm-hint">読み込み中…</p>
      ) : rows.length === 0 ? (
        <p className="adm-hint">この期間のデータはまだありません。</p>
      ) : (
        <>
          <h2 className="adm-h2">キャンペーン別合計</h2>
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>キャンペーン</th>
                  <th>表示</th>
                  <th>クリック</th>
                  <th>クリック率</th>
                  <th>閉じる</th>
                </tr>
              </thead>
              <tbody>
                {totals.map(([id, t]) => (
                  <tr key={id}>
                    <td className="adm-td-id">{id}</td>
                    <td className="adm-td-num">{t.show}</td>
                    <td className="adm-td-num">{t.click}</td>
                    <td className="adm-td-num">{rate(t.click, t.show)}</td>
                    <td className="adm-td-num">{t.dismiss}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="adm-h2">日別</h2>
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>キャンペーン</th>
                  <th>表示</th>
                  <th>クリック</th>
                  <th>クリック率</th>
                  <th>閉じる</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((r) => (
                  <tr key={`${r.date}#${r.campaignId}`}>
                    <td>{r.date}</td>
                    <td className="adm-td-id">{r.campaignId}</td>
                    <td className="adm-td-num">{r.show}</td>
                    <td className="adm-td-num">{r.click}</td>
                    <td className="adm-td-num">{rate(r.click, r.show)}</td>
                    <td className="adm-td-num">{r.dismiss}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="adm-hint">
        見るのはクリック率（5% 前後で良好目安）と閉じる率だけ — 表示数は母数であって成果ではない
        （onsite-messaging.md §8.3）。プレビュー表示（?om_preview）はカウントされない。
      </p>
    </section>
  );
}
