/* 管理 PUT で受けた JSON を Campaign へ検証・正規化する（依存を増やさない手動検証）。
   失敗はエラー文言（string）を返す。 */
import type { Campaign } from "../../../components/onsite/campaigns";

export const CAMPAIGN_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function parseCampaign(input: unknown): Campaign | string {
  if (typeof input !== "object" || input === null) return "JSON オブジェクトが必要です";
  const o = input as Record<string, unknown>;

  const id = typeof o.id === "string" ? o.id.trim() : "";
  if (!CAMPAIGN_ID_RE.test(id)) return "id は英小文字・数字・ハイフン・アンダースコア（64 字まで）です";

  const trigger = o.trigger;
  if (trigger !== "first_visit" && trigger !== "cart_abandon" && trigger !== "idle") {
    return "trigger が不正です";
  }

  if (!Array.isArray(o.pages) || o.pages.some((p) => typeof p !== "string")) {
    return "pages は文字列配列にしてください";
  }
  // 空文字 1 行は「全ページ」の意味で有効（既存 pageMatches の仕様）
  const pages = (o.pages as string[]).map((p) => p.trim());
  if (pages.length === 0) return "対象ページを 1 行以上入れてください（全ページは空欄 1 行）";

  let excludePages: string[] | undefined;
  if (o.excludePages != null) {
    if (!Array.isArray(o.excludePages) || o.excludePages.some((p) => typeof p !== "string")) {
      return "excludePages は文字列配列にしてください";
    }
    excludePages = (o.excludePages as string[]).map((p) => p.trim()).filter(Boolean);
    if (excludePages.length === 0) excludePages = undefined;
  }

  const message = typeof o.message === "string" ? o.message.trim() : "";
  if (!message) return "message は必須です";

  const headline = typeof o.headline === "string" ? o.headline.trim() : "";

  let cta: Campaign["cta"];
  if (o.cta != null) {
    const c = o.cta as Record<string, unknown>;
    const label = typeof c.label === "string" ? c.label.trim() : "";
    const href = typeof c.href === "string" ? c.href.trim() : "";
    if (!label || !href) return "CTA は label と href の両方が必要です（不要なら外してください）";
    cta = { label, href };
  }

  let image: Campaign["image"];
  if (o.image != null) {
    const im = o.image as Record<string, unknown>;
    const src = typeof im.src === "string" ? im.src.trim() : "";
    const alt = typeof im.alt === "string" ? im.alt.trim() : "";
    if (!src) return "image.src が空です";
    if (!alt) return "画像には alt（代替テキスト）が必須です";
    image = { src, alt };
  }

  let layout: Campaign["layout"];
  if (o.layout != null) {
    if (typeof o.layout !== "object") return "layout が不正です";
    const l = o.layout as Record<string, unknown>;
    if (l.mobile !== "floating" && l.mobile !== "bottom" && l.mobile !== "inline") {
      return "layout.mobile が不正です";
    }
    if (l.desktop !== "corner" && l.desktop !== "inline") {
      return "layout.desktop が不正です";
    }
    const imageVariant = l.imageVariant == null ? undefined : l.imageVariant;
    if (imageVariant !== undefined && imageVariant !== "side" && imageVariant !== "none") {
      return "layout.imageVariant が不正です";
    }
    const inlineAnchor = typeof l.inlineAnchor === "string" ? l.inlineAnchor.trim() : "";
    if ((l.mobile === "inline" || l.desktop === "inline") && !inlineAnchor) {
      return "文脈内表示には inlineAnchor が必要です";
    }
    layout = {
      mobile: l.mobile,
      desktop: l.desktop,
      ...(imageVariant ? { imageVariant } : {}),
      ...(inlineAnchor ? { inlineAnchor } : {}),
    };
  }

  let conditions: Campaign["conditions"];
  if (o.conditions != null) {
    if (typeof o.conditions !== "object") return "conditions が不正です";
    const c = o.conditions as Record<string, unknown>;
    const minScrollPct = c.minScrollPct == null ? undefined : Number(c.minScrollPct);
    if (minScrollPct !== undefined && (!Number.isFinite(minScrollPct) || minScrollPct < 0 || minScrollPct > 100)) {
      return "minScrollPct は 0〜100 の数値にしてください";
    }
    const minProductViews = c.minProductViews == null ? undefined : Number(c.minProductViews);
    if (minProductViews !== undefined && (!Number.isInteger(minProductViews) || minProductViews < 1)) {
      return "minProductViews は 1 以上の整数にしてください";
    }
    conditions = {
      ...(minScrollPct !== undefined ? { minScrollPct } : {}),
      ...(minProductViews !== undefined ? { minProductViews } : {}),
    };
  }

  let frequency: Campaign["frequency"];
  if (o.frequency != null) {
    if (typeof o.frequency !== "object") return "frequency が不正です";
    const f = o.frequency as Record<string, unknown>;
    const maxImpressions = Number(f.maxImpressions);
    if (maxImpressions !== 1 && maxImpressions !== 2) {
      return "maxImpressions は 1 または 2 にしてください";
    }
    const cooldownDays = f.cooldownDays == null ? undefined : Number(f.cooldownDays);
    if (cooldownDays !== undefined && (!Number.isInteger(cooldownDays) || cooldownDays < 1)) {
      return "cooldownDays は 1 以上の整数にしてください";
    }
    frequency = {
      maxImpressions,
      ...(cooldownDays !== undefined ? { cooldownDays } : {}),
      stopOnClick: f.stopOnClick !== false,
    };
  }

  const priority = typeof o.priority === "number" && Number.isFinite(o.priority) ? o.priority : NaN;
  if (Number.isNaN(priority)) return "priority は数値にしてください";

  const delaySec = o.delaySec == null ? undefined : Number(o.delaySec);
  if (delaySec !== undefined && (!Number.isFinite(delaySec) || delaySec < 0)) {
    return "delaySec が不正です";
  }
  const idleSec = o.idleSec == null ? undefined : Number(o.idleSec);
  if (idleSec !== undefined && (!Number.isFinite(idleSec) || idleSec <= 0)) {
    return "idleSec が不正です";
  }

  return {
    id,
    trigger,
    pages,
    ...(excludePages ? { excludePages } : {}),
    ...(headline ? { headline } : {}),
    message,
    ...(cta ? { cta } : {}),
    ...(image ? { image } : {}),
    ...(layout ? { layout } : {}),
    ...(conditions ? { conditions } : {}),
    ...(frequency ? { frequency } : {}),
    priority,
    ...(delaySec !== undefined ? { delaySec } : {}),
    ...(idleSec !== undefined ? { idleSec } : {}),
    active: o.active === true,
  };
}
