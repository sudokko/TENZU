/* =========================================================================
   SNS ダッシュボード — 定義（ページ・収集 CLI 共通）
   設計 SSOT: engineering/analytics.md §7
   - 見る数字／見ない数字の区分は acquisition/sns-operations.md §7・channels.md §7.4 に従う。
     note と Ameba は両設計書に行が無いため、ここでの区分は暫定（§7 に明記）。
   - 数字そのものはリポジトリに入れない（公開リポジトリ）。保存先は store.ts。
   ========================================================================= */
import type { SnsKey } from "../../sns";

/* ---------- 運用中の 5 SNS（表示順はオーナーの呼び順） ---------- */

export interface SnsProfile {
  key: SnsKey;
  label: string;
  handle: string;
  /** 名義（sns-accounts.md §1.4） */
  owner: "TENZU" | "SUDO CRAFT";
  /** 媒体の役割（sns-operations.md サマリ） */
  role: string;
  /** 数字を読みに行く画面（収集手順の詳細は .claude/skills/sns-dashboard） */
  analyticsUrl: string;
}

export const SNS_PROFILES: SnsProfile[] = [
  { key: "instagram", label: "Instagram", handle: "@tenzu.jp", owner: "TENZU", role: "認知",
    analyticsUrl: "https://www.instagram.com/accounts/insights/?timeframe=7" },
  { key: "x", label: "X", handle: "@sudocraft_jp", owner: "SUDO CRAFT", role: "作り手の発信",
    analyticsUrl: "https://x.com/i/account_analytics" },
  { key: "note", label: "note", handle: "sudo_craft", owner: "SUDO CRAFT", role: "設計ノート・開発実録",
    analyticsUrl: "https://note.com/sitesettings/stats" },
  { key: "pinterest", label: "Pinterest", handle: "tenzuinfo", owner: "TENZU", role: "送客の主戦場",
    analyticsUrl: "https://analytics.pinterest.com/overview/" },
  { key: "ameba", label: "Ameba", handle: "sudo-craft", owner: "SUDO CRAFT", role: "店主エッセイ",
    analyticsUrl: "https://blog.ameba.jp/ucs/analysis/analysis.do" },
];

export const SNS_KEYS: SnsKey[] = SNS_PROFILES.map((p) => p.key);

/* ---------- 各 SNS の画面から読む数字 ---------- */

export interface MetricDef {
  key: string;
  label: string;
  /** true＝見る（先行指標）／false＝見ない（虚栄指標・参考として畳んで置く） */
  watch: boolean;
}

export const PLATFORM_METRICS: Record<SnsKey, MetricDef[]> = {
  instagram: [
    { key: "reach", label: "閲覧者（リーチ）", watch: true },
    { key: "saves", label: "保存", watch: true },
    { key: "shares", label: "シェア", watch: true },
    { key: "profileVisits", label: "プロフィールへのアクセス", watch: true },
    { key: "linkTaps", label: "外部リンクのタップ", watch: true },
    { key: "views", label: "閲覧（ビュー）", watch: false },
    { key: "interactions", label: "インタラクション", watch: false },
    { key: "followers", label: "フォロワー", watch: false },
  ],
  x: [
    { key: "profileVisits", label: "プロフィールへのアクセス", watch: true },
    { key: "linkClicks", label: "リンクのクリック", watch: true },
    { key: "bookmarks", label: "ブックマーク", watch: true },
    { key: "impressions", label: "インプレッション", watch: false },
    { key: "engagements", label: "エンゲージメント", watch: false },
    { key: "likes", label: "いいね", watch: false },
    { key: "followers", label: "フォロワー", watch: false },
  ],
  note: [
    { key: "views", label: "ビュー", watch: true },
    { key: "comments", label: "コメント", watch: true },
    { key: "likes", label: "スキ", watch: false },
    { key: "followers", label: "フォロワー", watch: false },
  ],
  pinterest: [
    { key: "impressions", label: "インプレッション", watch: true },
    { key: "outboundClicks", label: "アウトバウンドクリック", watch: true },
    { key: "saves", label: "保存", watch: true },
    { key: "pinClicks", label: "ピンのクリック", watch: false },
    { key: "engagements", label: "エンゲージメント", watch: false },
    { key: "followers", label: "フォロワー", watch: false },
  ],
  ameba: [
    { key: "access", label: "アクセス数", watch: true },
    { key: "likes", label: "いいね", watch: false },
    { key: "followers", label: "フォロワー", watch: false },
  ],
};

/** Pinterest 90 日ゲートのアウトバウンド CTR 帯（sns-operations.md §6） */
export function pinterestCtrBand(ctrPercent: number): "低め" | "良好" | "優秀" {
  if (ctrPercent < 1) return "低め";
  if (ctrPercent < 3) return "良好";
  return "優秀";
}

/* ---------- GA4 の流入元を名寄せする ---------- */

export type Bucket = SnsKey | "search" | "ai" | "ads" | "direct" | "other_social" | "other" | "noise";

export const BUCKET_LABELS: Record<Bucket, string> = {
  instagram: "Instagram",
  x: "X",
  note: "note",
  pinterest: "Pinterest",
  ameba: "Ameba",
  search: "検索",
  ai: "AI アシスタント",
  ads: "広告",
  direct: "Direct",
  other_social: "その他の SNS",
  other: "その他",
  noise: "計測ノイズ",
};

/** 表の並び（5 SNS → 他の流入 → ノイズ） */
export const BUCKET_ORDER: Bucket[] = [
  ...SNS_KEYS, "search", "ai", "ads", "direct", "other_social", "other", "noise",
];

const has = (re: RegExp, s: string) => re.test(s);

/**
 * sessionSource / sessionMedium を 1 つの流入元にまとめる。
 * - Instagram はプロフィールリンクの自前 UTM（instagram）と、Instagram 側の値（ig）の 2 通りで届く
 * - 取引先の CRM（*.lightning.force.com）から開かれた訪問と、Stripe の決済画面からの戻りは客の流入ではない
 *   → noise。前者は Pinterest の営業担当の閲覧が pinterest.lightning.force.com で届いた実例がある
 */
export function classifySource(source: string, medium: string): Bucket {
  const s = source.trim().toLowerCase();
  const m = medium.trim().toLowerCase();
  if (s === "(direct)") return "direct";
  if (has(/(^|\.)lightning\.force\.com$|(^|\.)salesforce\.com$|(^|\.)stripe\.com$/, s)) return "noise";
  if (has(/^(cpc|ppc|paid|paid_social|paidsocial|display)$/, m)) return "ads";
  if (has(/^(instagram|ig)$|(^|\.)instagram\.com$/, s)) return "instagram";
  if (has(/^(x|twitter)$|^t\.co$|(^|\.)(x|twitter)\.com$/, s)) return "x";
  if (has(/^note$|(^|\.)note\.com$/, s)) return "note";
  if (has(/^pinterest$|(^|\.)pinterest\.[a-z.]+$|^pin\.it$/, s)) return "pinterest";
  if (has(/^ameba$|(^|\.)ameblo\.jp$|(^|\.)ameba\.jp$/, s)) return "ameba";
  if (has(/^(facebook|fb|threads|line|youtube|tiktok)$|(^|\.)(facebook|threads|line|youtube|tiktok)\.(com|net|me|jp)$/, s)) {
    return "other_social";
  }
  if (has(/(^|\.)chatgpt\.com$|^openai$|perplexity|(^|\.)gemini\.google\.com$|(^|\.)copilot\.microsoft\.com$|(^|\.)claude\.ai$/, s)) {
    return "ai";
  }
  if (m === "organic" || has(/(^|\.)google\.|(^|\.)yahoo\.|(^|\.)bing\.com$|duckduckgo|ecosia|naver/, s)) return "search";
  return "other";
}

/* ---------- 保存データ（1 取得日＝1 ファイル） ---------- */

/** GA4 イベント名（engineering/analytics.md §2） */
export const GA4_EVENTS = { toolStart: "tool_start", generatedPdf: "generated_pdf", purchase: "purchase" } as const;

export interface Ga4Counts {
  sessions: number;
  engagedSessions: number;
  toolStart: number;
  generatedPdf: number;
  purchases: number;
  revenue: number;
}

export interface Ga4SourceRow extends Ga4Counts {
  source: string;
  medium: string;
  bucket: Bucket;
}

export interface Ga4Range {
  /** YYYY-MM-DD（プロパティのタイムゾーン＝日本） */
  start: string;
  end: string;
  buckets: Record<Bucket, Ga4Counts>;
  total: Ga4Counts;
  sources: Ga4SourceRow[];
}

export interface Ga4Block {
  fetchedAt: string;
  current: Ga4Range;
  previous: Ga4Range;
}

export interface PlatformBlock {
  collectedAt: string;
  /** 画面の期間表記そのまま（例「過去7日間」「2026/09/09〜09/15」） */
  periodLabel: string;
  /** null＝画面に出ていない（0 と区別する） */
  metrics: Record<string, number | null>;
  memo?: string;
}

export interface Snapshot {
  schema: 1;
  /** 取得日（日本時間・ファイル名と同じ） */
  date: string;
  ga4?: Ga4Block;
  platforms: Partial<Record<SnsKey, PlatformBlock>>;
}

export const emptyCounts = (): Ga4Counts => ({
  sessions: 0, engagedSessions: 0, toolStart: 0, generatedPdf: 0, purchases: 0, revenue: 0,
});

export function sumCounts(list: Ga4Counts[]): Ga4Counts {
  const t = emptyCounts();
  for (const c of list) {
    t.sessions += c.sessions;
    t.engagedSessions += c.engagedSessions;
    t.toolStart += c.toolStart;
    t.generatedPdf += c.generatedPdf;
    t.purchases += c.purchases;
    t.revenue += c.revenue;
  }
  return t;
}

/** 運用中の 5 SNS の合計 */
export const snsTotal = (range: Ga4Range): Ga4Counts => sumCounts(SNS_KEYS.map((k) => range.buckets[k]));
