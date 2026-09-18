"use client";

/* =========================================================================
   記事の編集モード（クライアント）
   - 記事ページ（/articles/[slug]）を iframe で表示する。同一オリジンなので中の DOM に触れる。
   - 本文 `article.article-body` 直下の要素を、API が返すソースのブロック列と順番どおりに
     照合して data-aed="b<番号>" を付ける。ヘッダの title / kicker / lead は data-aed="f:<キー>"。
   - 編集モード ON で印の付いた要素をクリックすると、右（狭い画面では下）のドロワーに
     その部分のソースが開く。保存すると web/content/articles/<slug>.mdx が書き換わり、
     Next の HMR で iframe の表示が数秒で追従する（追従しなければ iframe を再読み込み）。
   ========================================================================= */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type {
  ArticlePayload, FieldKey, SourceBlock, SourceError,
} from "../../../api/atelier/article-source";

const API = "/api/atelier/article";
const MARK = "data-aed";
const ACTIVE = "data-aed-active";
const LABEL = "data-aed-label";
const HELP_KEY = "aed-help-dismissed";
const HELP_EVENT = "aed-help-change";

/* 「使い方」を閉じたかどうか（localStorage）。サーバー描画では出さない */
function subscribeHelp(onChange: () => void) {
  window.addEventListener(HELP_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(HELP_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
function helpDismissedNow(): boolean {
  try {
    return window.localStorage.getItem(HELP_KEY) === "1";
  } catch {
    return false;
  }
}

type LoadResult = { payload: ArticlePayload } | { error: string };

async function fetchPayload(slug: string): Promise<LoadResult> {
  try {
    const res = await fetch(`${API}?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.error) {
      return { error: json?.error?.message ?? `読み込みに失敗しました（HTTP ${res.status}）` };
    }
    return { payload: json as ArticlePayload };
  } catch (e) {
    return { error: `読み込みに失敗しました: ${String(e)}` };
  }
}

type Target =
  | { type: "block"; index: number }
  | { type: "field"; key: FieldKey }
  | { type: "full" }
  | { type: "meta" };

type HistoryEntry = { source: string; label: string };

const STATUS_LABEL: Record<ArticlePayload["status"], string> = {
  published: "公開",
  unlisted: "限定公開",
  draft: "下書き",
};

/* iframe（記事ページ）側に差し込むスタイル。ローカルだけに出るプレオープン帯は本番に無いので隠す */
const FRAME_CSS = `
.preopen{display:none!important}
[${MARK}]{cursor:pointer}
[${MARK}]:hover{outline:2px dashed #2c6e7f;outline-offset:6px;border-radius:2px;background-color:rgba(44,110,127,.05)}
[${ACTIVE}],[${ACTIVE}]:hover{outline:2px solid #2c6e7f;outline-offset:6px;background-color:rgba(44,110,127,.09)}
html.aed-off [${MARK}]{cursor:auto}
html.aed-off [${MARK}]:hover,html.aed-off [${ACTIVE}]{outline:none;background-color:transparent}
#aed-tip{position:absolute;z-index:2147483647;display:none;pointer-events:none;padding:4px 8px;border-radius:4px;background:#2c6e7f;color:#fff;font:600 11px/1.3 "IBM Plex Sans JP",system-ui,sans-serif;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.15)}
`;

/* ---- 照合: 画面の要素 ↔ ソースのブロック ---------------------------------- */

const norm = (s: string) => s.normalize("NFKC").replace(/[\s​-‍﻿]+/g, "").toLowerCase();

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

function similarity(a: string, b: string, ga: Map<string, number>, gb: Map<string, number>): number {
  if (a === b) return a.length > 0 ? 1 : 0.5;
  if (a.length < 2 || b.length < 2) return 0;
  let shared = 0;
  for (const [g, n] of ga) shared += Math.min(n, gb.get(g) ?? 0);
  return (2 * shared) / (a.length + b.length - 2);
}

/** 本文は画面とソースで同じ順に並ぶので、順序を保ったまま似ているもの同士を対応づける */
function align(domTexts: string[], blockTexts: string[]): [number, number][] {
  const A = domTexts.map(norm);
  const B = blockTexts.map(norm);
  const GA = A.map(bigrams);
  const GB = B.map(bigrams);
  const n = A.length;
  const m = B.length;
  const sim = (i: number, j: number) => similarity(A[i], B[j], GA[i], GB[j]);

  // 数がそろい、同じ位置どうしが十分似ていれば 1:1（通常はここで終わる）
  if (n === m && A.every((_, i) => sim(i, i) >= 0.3)) return A.map((_, i) => [i, i]);

  const TH = 0.35;
  const S = Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => sim(i, j)));
  const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const take = S[i][j] >= TH ? S[i][j] + dp[i + 1][j + 1] : 0;
      dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1], take);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (S[i][j] >= TH && dp[i][j] === S[i][j] + dp[i + 1][j + 1]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

/** 画面の要素の文字。挿絵は alt も照合に使う（ソース側も属性の文字を持っている） */
function domText(el: Element): string {
  const alts = Array.from(el.querySelectorAll("img[alt]"), (img) => img.getAttribute("alt") ?? "");
  return `${el.textContent ?? ""} ${alts.join(" ")}`;
}

function hintFor(target: Target, block: SourceBlock | null): string {
  if (target.type === "field") return "1 行で書きます（改行は入りません）。";
  if (target.type === "full") return "記事ファイル全体です。先頭の --- で囲んだ部分が frontmatter、その下が本文です。";
  switch (block?.kind) {
    case "table":
      return "列は | で区切ります。各行の | の数をそろえてください。";
    case "jsx":
      return "< > や =\"…\" の記号は残したまま、\" \" の中の文字だけを直してください。";
    case "heading":
      return "先頭の ## は見出しの印です（消すと段落になります）。";
    case "list":
      return "行頭の - や 1. は箇条書きの印です。1 行に 1 項目。";
    default:
      return "リンクは [文字](URL)、太字は **文字**。空行を入れると段落が分かれます。全部消して保存するとこのブロックを削除します。";
  }
}

const timeNow = () => new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

const targetId = (t: Target | null) =>
  t?.type === "block" ? `b${t.index}` : t?.type === "field" ? `f:${t.key}` : null;

/* iframe に差し込むスタイルと吹き出し。React が張り直して消えていたら戻す */
function ensureChrome(doc: Document) {
  if (doc.head && !doc.getElementById("aed-style")) {
    const style = doc.createElement("style");
    style.id = "aed-style";
    style.textContent = FRAME_CSS;
    doc.head.appendChild(style);
  }
  if (doc.body && !doc.getElementById("aed-tip")) {
    const tip = doc.createElement("div");
    tip.id = "aed-tip";
    doc.body.appendChild(tip);
  }
}

/** 開いている箇所を画面側で実線の枠にする。狭い画面ではドロワーに隠れないよう上へ寄せる */
function markActive(frame: HTMLIFrameElement | null, t: Target | null, reveal = false) {
  const doc = frame?.contentDocument;
  const win = frame?.contentWindow;
  if (!doc || !win) return;
  doc.querySelectorAll(`[${ACTIVE}]`).forEach((el) => el.removeAttribute(ACTIVE));
  const id = targetId(t);
  const el = id ? doc.querySelector(`[${MARK}="${id}"]`) : null;
  if (!el) return;
  el.setAttribute(ACTIVE, "");
  if (reveal && window.innerWidth < 1100) {
    win.scrollTo({ top: el.getBoundingClientRect().top + win.scrollY - 24, behavior: "smooth" });
  }
}

export default function ArticleEditor({ slug }: { slug: string }) {
  const [payload, setPayload] = useState<ArticlePayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(true);
  const [target, setTarget] = useState<Target | null>(null);
  const [draft, setDraft] = useState("");
  const [initial, setInitial] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<SourceError | null>(null);
  const [stale, setStale] = useState(false);
  const [externalChange, setExternalChange] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [match, setMatch] = useState<{ matched: number; total: number } | null>(null);
  const [offPage, setOffPage] = useState(false);
  const [bodyMissing, setBodyMissing] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpClosed, setHelpClosed] = useState(false);
  const helpDismissed = useSyncExternalStore(subscribeHelp, helpDismissedNow, () => true);
  const [ask, setAsk] = useState<{ message: string; ok: string } | null>(null);

  const frameRef = useRef<HTMLIFrameElement>(null);
  const payloadRef = useRef<ArticlePayload | null>(null);
  const targetRef = useRef<Target | null>(null);
  const draftRef = useRef("");
  const initialRef = useRef("");
  const editModeRef = useRef(true);
  const savingRef = useRef(false);
  const observerRef = useRef<MutationObserver | null>(null);
  const boundDocsRef = useRef(new WeakSet<Document>());
  const remarkTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const lastMutationRef = useRef(0);
  const pendingScrollRef = useRef<number | null>(null);
  const openRef = useRef<(t: Target) => Promise<void>>(async () => {});
  const closeRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  const saveRef = useRef<() => Promise<void>>(async () => {});
  const askResolveRef = useRef<((ok: boolean) => void) | null>(null);

  const dirty = target !== null && target.type !== "meta" && draft !== initial;
  const isDirty = () => targetRef.current !== null && targetRef.current.type !== "meta" && draftRef.current !== initialRef.current;

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  /* 確認はブラウザ標準の confirm() ではなく画面内に出す（埋め込みのブラウザでは標準ダイアログが出ないことがある） */
  const confirmAsk = useCallback((message: string, ok: string) => new Promise<boolean>((resolve) => {
    askResolveRef.current?.(false);
    askResolveRef.current = resolve;
    setAsk({ message, ok });
  }), []);

  const answer = useCallback((ok: boolean) => {
    askResolveRef.current?.(ok);
    askResolveRef.current = null;
    setAsk(null);
  }, []);

  /* 画面の要素に印を付け直す（読み込み時・保存後・表示が変わったとき） */
  const remark = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!doc?.body) return;
    ensureChrome(doc);
    doc.documentElement.classList.toggle("aed-off", !editModeRef.current);

    const onArticle = frame?.contentWindow?.location.pathname.replace(/\/$/, "") === `/articles/${slug}`;
    setOffPage(!onArticle);
    const p = payloadRef.current;
    if (!p || !onArticle) {
      setMatch(null);
      return;
    }

    doc.querySelectorAll(`[${MARK}]`).forEach((el) => {
      el.removeAttribute(MARK);
      el.removeAttribute(ACTIVE);
      el.removeAttribute(LABEL);
    });

    const body = doc.querySelector("article.article-body");
    setBodyMissing(!body);
    const els = body ? Array.from(body.children) : [];
    const pairs = align(els.map(domText), p.blocks.map((b) => b.text));
    for (const [ei, bi] of pairs) {
      const b = p.blocks[bi];
      els[ei].setAttribute(MARK, `b${bi}`);
      els[ei].setAttribute(LABEL, `${b.label} · ${b.line} 行目`);
    }

    const head = doc.querySelector("header.article-meta");
    const bindField = (selector: string, key: FieldKey) => {
      const el = head?.querySelector(selector);
      const f = p.fields.find((x) => x.key === key);
      if (el && f?.value && norm(el.textContent ?? "") === norm(f.value)) {
        el.setAttribute(MARK, `f:${key}`);
        el.setAttribute(LABEL, f.label);
      }
    };
    bindField("h1", "title");
    bindField(".kicker", "kicker");
    bindField(".lead", "lead");

    markActive(frame, targetRef.current);
    setMatch({ matched: pairs.length, total: p.blocks.length });
  }, [slug]);

  const scheduleRemark = useCallback(() => {
    if (remarkTimerRef.current) window.clearTimeout(remarkTimerRef.current);
    remarkTimerRef.current = window.setTimeout(remark, 150);
  }, [remark]);

  const applyPayload = useCallback((next: ArticlePayload) => {
    payloadRef.current = next;
    setPayload(next);
    remark();
  }, [remark]);

  const acceptLoad = useCallback((r: LoadResult): ArticlePayload | null => {
    if ("error" in r) {
      setLoadError(r.error);
      return null;
    }
    setLoadError(null);
    applyPayload(r.payload);
    return r.payload;
  }, [applyPayload]);

  const reloadPayload = useCallback(
    async () => acceptLoad(await fetchPayload(slug)),
    [slug, acceptLoad],
  );

  const reloadFrame = useCallback(() => {
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    pendingScrollRef.current = win.scrollY;
    win.location.reload();
  }, []);

  /* 保存後、HMR で表示が変わらなければ iframe を読み込み直す */
  const expectRender = useCallback(() => {
    const since = Date.now();
    window.setTimeout(() => {
      if (lastMutationRef.current < since) reloadFrame();
    }, 3500);
  }, [reloadFrame]);

  const setDraftText = (text: string) => {
    draftRef.current = text;
    setDraft(text);
  };

  const open = useCallback(async (next: Target) => {
    const p = payloadRef.current;
    if (!p) return;
    if (isDirty() && !(await confirmAsk("編集中の内容を保存せずに、別の場所を開きますか？", "保存せずに開く"))) return;

    let text = "";
    if (next.type === "block") {
      const b = p.blocks[next.index];
      if (!b) return;
      text = p.source.slice(b.start, b.end);
    } else if (next.type === "field") {
      const f = p.fields.find((x) => x.key === next.key);
      if (!f?.editable) {
        notify("この項目は「全文ソース」で直してください");
        return;
      }
      text = f.value ?? "";
    } else if (next.type === "full") {
      text = p.source;
    }

    targetRef.current = next;
    initialRef.current = text;
    setTarget(next);
    setInitial(text);
    setDraftText(text);
    setSaveError(null);
    setStale(false);
    setExternalChange(false);
    markActive(frameRef.current, next, true);
  }, [notify, confirmAsk]);

  const close = useCallback(async (force = false) => {
    if (!force && isDirty() && !(await confirmAsk("保存していない変更を破棄して閉じますか？", "破棄して閉じる"))) return;
    targetRef.current = null;
    initialRef.current = "";
    draftRef.current = "";
    setTarget(null);
    setSaveError(null);
    setStale(false);
    setExternalChange(false);
    markActive(frameRef.current, null);
  }, [confirmAsk]);

  const save = useCallback(async () => {
    const p = payloadRef.current;
    const t = targetRef.current;
    if (!p || !t || t.type === "meta" || savingRef.current) return;
    const text = draftRef.current;
    if (text === initialRef.current) return;

    let body: Record<string, unknown>;
    let label: string;
    let visible = true;
    if (t.type === "block") {
      const b = p.blocks[t.index];
      if (!b) return;
      if (text.trim() === "" && !(await confirmAsk(`この${b.label}（${b.line} 行目）を削除しますか？`, "削除する"))) return;
      body = { action: "replaceBlock", start: b.start, end: b.end, original: p.source.slice(b.start, b.end), replacement: text };
      label = `${b.label}・${b.line} 行目`;
    } else if (t.type === "field") {
      body = { action: "setField", key: t.key, value: text };
      label = p.fields.find((x) => x.key === t.key)?.label ?? t.key;
      visible = t.key !== "description"; // 説明文は画面に出ない
    } else {
      body = { action: "writeAll", source: text };
      label = "全文ソース";
    }

    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, baseHash: p.hash, ...body }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        if (json?.payload) {
          // ファイルが先に変わっていた。位置がずれている可能性があるので、この画面からは保存させない
          applyPayload(json.payload as ArticlePayload);
          setStale(true);
        }
        setSaveError(json?.error ?? { message: `保存に失敗しました（HTTP ${res.status}）` });
        return;
      }
      const next = json as ArticlePayload;
      const changed = next.hash !== p.hash;
      if (changed) {
        setHistory((h) => [...h.slice(-29), { source: p.source, label }]);
        setSavedAt(timeNow());
      }
      applyPayload(next);
      void close(true);
      notify(!changed ? "変更はありませんでした" : visible ? "保存しました。数秒で表示に反映されます" : "保存しました");
      if (changed && visible) expectRender();
    } catch (e) {
      setSaveError({ message: `保存に失敗しました: ${String(e)}` });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [slug, applyPayload, close, notify, expectRender, confirmAsk]);

  const undo = useCallback(async () => {
    const p = payloadRef.current;
    const last = history[history.length - 1];
    if (!p || !last || savingRef.current) return;
    if (isDirty()) {
      notify("編集中の内容を保存するか閉じてから、取り消してください");
      return;
    }
    if (!(await confirmAsk(`直前の保存（${last.label}）を取り消して、保存する前の状態に戻しますか？`, "取り消す"))) return;

    savingRef.current = true;
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, baseHash: p.hash, action: "writeAll", source: last.source }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        if (json?.payload) applyPayload(json.payload as ArticlePayload);
        notify(json?.error?.message ?? "取り消しに失敗しました");
        return;
      }
      setHistory((h) => h.slice(0, -1));
      setSavedAt(timeNow());
      applyPayload(json as ArticlePayload);
      void close(true);
      notify("直前の保存を取り消しました");
      expectRender();
    } catch (e) {
      notify(`取り消しに失敗しました: ${String(e)}`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [history, slug, applyPayload, close, notify, expectRender, confirmAsk]);

  useEffect(() => {
    openRef.current = open;
    closeRef.current = close;
    saveRef.current = save;
  }, [open, close, save]);

  /* ---- iframe（記事ページ）側のイベント -------------------------------------- */

  const onFrameClick = useCallback((e: MouseEvent) => {
    if (!editModeRef.current) return;
    const t = e.target as Element | null;
    if (!t || typeof t.closest !== "function") return;
    const hit = t.closest(`[${MARK}]`);
    if (hit) {
      e.preventDefault();
      e.stopPropagation();
      const id = hit.getAttribute(MARK) ?? "";
      void openRef.current(id.startsWith("f:") ? { type: "field", key: id.slice(2) as FieldKey } : { type: "block", index: Number(id.slice(1)) });
      return;
    }
    if (t.closest("a")) {
      e.preventDefault();
      e.stopPropagation();
      notify("編集モード中はリンクを開きません（上の「編集モード」を OFF にすると移動できます）");
    }
  }, [notify]);

  const onFrameOver = useCallback((e: MouseEvent) => {
    const doc = frameRef.current?.contentDocument;
    const win = frameRef.current?.contentWindow;
    const tip = doc?.getElementById("aed-tip");
    if (!doc || !win || !tip) return;
    const t = e.target as Element | null;
    const hit = editModeRef.current && t && typeof t.closest === "function" ? t.closest(`[${MARK}]`) : null;
    if (!hit) {
      tip.style.display = "none";
      return;
    }
    const r = hit.getBoundingClientRect();
    tip.textContent = `✎ ${hit.getAttribute(LABEL) ?? "クリックで編集"}`;
    tip.style.display = "block";
    tip.style.left = `${Math.max(4, r.left + win.scrollX)}px`;
    tip.style.top = `${Math.max(4, r.top + win.scrollY - 28)}px`;
  }, []);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (askResolveRef.current) {
      // 確認を出している間は、Esc で「やめる」だけを受け付ける
      if (e.key === "Escape") {
        e.preventDefault();
        answer(false);
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      void saveRef.current();
      return;
    }
    if (e.key === "Escape" && !e.isComposing && targetRef.current) {
      e.preventDefault();
      void closeRef.current();
    }
  }, [answer]);

  const attach = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    const win = frameRef.current?.contentWindow;
    if (!doc?.body || !win) return;
    ensureChrome(doc);

    if (!boundDocsRef.current.has(doc)) {
      boundDocsRef.current.add(doc);
      doc.addEventListener("click", onFrameClick, true);
      doc.addEventListener("mouseover", onFrameOver, true);
      doc.addEventListener("keydown", handleKey, true);
      doc.documentElement.addEventListener("mouseleave", () => {
        const tip = doc.getElementById("aed-tip");
        if (tip) tip.style.display = "none";
      });
      observerRef.current?.disconnect();
      const observer = new MutationObserver((records) => {
        const relevant = records.some((r) => {
          const el = r.target.nodeType === 1 ? (r.target as Element) : r.target.parentElement;
          return !el?.closest("#aed-tip");
        });
        if (!relevant) return;
        lastMutationRef.current = Date.now();
        scheduleRemark();
      });
      observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
      observerRef.current = observer;
    }

    remark();
    const y = pendingScrollRef.current;
    if (y !== null) {
      pendingScrollRef.current = null;
      win.scrollTo(0, y);
      window.setTimeout(() => win.scrollTo(0, y), 400);
    }
  }, [onFrameClick, onFrameOver, handleKey, remark, scheduleRemark]);

  /* ---- 副作用 ---------------------------------------------------------------- */

  useEffect(() => {
    let alive = true;
    void fetchPayload(slug).then((r) => {
      if (alive) acceptLoad(r);
    });
    return () => {
      alive = false;
    };
  }, [slug, acceptLoad]);

  /* ハイドレーションより先に iframe の読み込みが終わっていると onLoad を取りこぼすので、ここでも拾う */
  useEffect(() => {
    const win = frameRef.current?.contentWindow;
    if (win && win.location.href !== "about:blank" && win.document.readyState !== "loading") attach();
  }, [attach]);

  useEffect(() => {
    editModeRef.current = editMode;
    const doc = frameRef.current?.contentDocument;
    doc?.documentElement.classList.toggle("aed-off", !editMode);
    const tip = doc?.getElementById("aed-tip");
    if (tip && !editMode) tip.style.display = "none";
  }, [editMode]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty()) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("beforeunload", onBeforeUnload);
      observerRef.current?.disconnect();
    };
  }, [handleKey]);

  /* 別の場所（Claude など）でファイルが書き換わったら取り込む。編集中なら知らせるだけ */
  useEffect(() => {
    const id = window.setInterval(async () => {
      const p = payloadRef.current;
      if (!p || document.hidden || savingRef.current) return;
      const base = p.hash;
      try {
        const res = await fetch(`${API}?slug=${encodeURIComponent(slug)}&hashOnly=1`, { cache: "no-store" });
        if (!res.ok) return;
        const { hash } = (await res.json()) as { hash?: string };
        if (!hash || hash === base || payloadRef.current?.hash !== base || savingRef.current) return;
        if (isDirty()) {
          setExternalChange(true);
          return;
        }
        if (await reloadPayload()) {
          void close(true);
          notify("ファイルが別の場所で更新されたので、最新の内容を読み込みました");
        }
      } catch {
        /* dev サーバーの再起動中など。次の周期で再試行する */
      }
    }, 4000);
    return () => window.clearInterval(id);
  }, [slug, reloadPayload, close, notify]);

  /* ---- 表示 ------------------------------------------------------------------ */

  const p = payload;
  const block = target?.type === "block" && p ? p.blocks[target.index] ?? null : null;
  const field = target?.type === "field" && p ? p.fields.find((f) => f.key === target.key) ?? null : null;
  const title = p?.fields.find((f) => f.key === "title")?.value ?? slug;
  const chars = [...draft].length;
  const descOut = field?.key === "description" && (chars < 60 || chars > 120);

  let drawerTitle = "";
  let drawerSub = "";
  if (target?.type === "block" && block) {
    drawerTitle = block.label;
    drawerSub = `${block.line} 行目`;
  } else if (target?.type === "field" && field) {
    drawerTitle = field.label;
    drawerSub = `frontmatter: ${field.key}`;
  } else if (target?.type === "full") {
    drawerTitle = "全文ソース";
    drawerSub = p?.file ?? "";
  } else if (target?.type === "meta") {
    drawerTitle = "タイトル・説明文";
    drawerSub = "frontmatter の主な項目";
  }

  let errorText: string | null = null;
  if (saveError) {
    let where = "";
    if (saveError.line) {
      if (block && saveError.line >= block.line) where = `（このブロックの ${saveError.line - block.line + 1} 行目付近）`;
      else if (target?.type === "full") where = `（${saveError.line} 行目付近）`;
    }
    errorText = saveError.message + where;
  }

  const onTextChange = (value: string) => {
    setDraftText(target?.type === "field" ? value.replace(/\r?\n/g, "") : value);
  };
  const onTextKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (target?.type === "field" && e.key === "Enter" && !e.nativeEvent.isComposing) e.preventDefault();
  };

  const showHelp = helpOpen || (!helpDismissed && !helpClosed);
  const dismissHelp = () => {
    setHelpOpen(false);
    setHelpClosed(true);
    try {
      window.localStorage.setItem(HELP_KEY, "1");
      window.dispatchEvent(new Event(HELP_EVENT));
    } catch {
      /* 保存できない環境では、次に開いたときにまた出るだけ */
    }
  };

  return (
    <div className="aed-app">
      <div className="aed-bar">
        <a className="aed-back" href="/atelier/articles">← 記事一覧</a>
        <div className="aed-title">
          <strong title={title}>{title}</strong>
          <span className="aed-file">{p?.file ?? `web/content/articles/${slug}.mdx`}</span>
        </div>
        {p ? <span className={`aed-chip aed-chip--${p.status}`}>{STATUS_LABEL[p.status]}</span> : null}
        <label className={`aed-switch${editMode ? " is-on" : ""}`}>
          <input type="checkbox" checked={editMode} onChange={(e) => setEditMode(e.target.checked)} />
          <span>編集モード {editMode ? "ON" : "OFF"}</span>
        </label>
        <div className="aed-actions">
          <button type="button" onClick={() => void open({ type: "meta" })} disabled={!p}>タイトル・説明文</button>
          <button type="button" onClick={() => void open({ type: "full" })} disabled={!p}>全文ソース</button>
          <button
            type="button"
            onClick={() => void undo()}
            disabled={history.length === 0 || saving}
            title={history.length > 0 ? `直前の保存（${history[history.length - 1].label}）を取り消す` : "取り消せる保存はありません"}
          >
            ↶ 取り消す
          </button>
          <button type="button" onClick={() => { void reloadPayload(); reloadFrame(); }}>再読み込み</button>
          <a href={`/articles/${slug}`} target="_blank" rel="noreferrer">記事を開く ↗</a>
          <button type="button" onClick={() => (showHelp ? dismissHelp() : setHelpOpen(true))}>使い方</button>
        </div>
        <div className="aed-state">
          {match ? (
            <span
              className={match.matched < match.total ? "is-warn" : ""}
              title={match.matched < match.total ? "画面と対応づけられなかったブロックは「全文ソース」で直せます" : "本文のブロックはすべてクリックで開けます"}
            >
              本文 {match.matched}/{match.total}
            </span>
          ) : null}
          {saving ? <span>保存中…</span> : savedAt ? <span>保存 {savedAt}</span> : null}
        </div>
      </div>

      {showHelp ? (
        <div className="aed-help">
          <ul>
            <li>記事の文章をクリックすると、その部分のソースが開きます（タイトル・リードもクリックで開けます）。</li>
            <li>直して「保存（Ctrl+S）」を押すとファイルに書き込まれ、数秒で表示が更新されます。</li>
            <li>説明文（検索結果に出る要約）は「タイトル・説明文」から。図や表もクリックで開けます。</li>
            <li>書き方の誤りは保存前に止めます。「↶ 取り消す」で直前の保存を戻せます（この画面を開いている間）。</li>
            <li>保存しただけでは公開されません。公開するときは Claude に「公開して」と伝えてください。</li>
          </ul>
          <button type="button" onClick={dismissHelp}>わかった</button>
        </div>
      ) : null}
      {loadError ? <div className="aed-banner is-error">{loadError}</div> : null}
      {p?.parseError ? (
        <div className="aed-banner is-error">
          MDX の書き方に誤りがあり、本文をブロックに分けられません: {p.parseError.message}
          <button type="button" onClick={() => void open({ type: "full" })}>全文ソースで直す</button>
        </div>
      ) : null}
      {offPage ? (
        <div className="aed-banner">
          記事以外のページを表示しています。
          <button type="button" onClick={() => frameRef.current?.contentWindow?.location.assign(`/articles/${slug}`)}>記事に戻る</button>
        </div>
      ) : null}
      {!offPage && bodyMissing && p && !p.parseError ? (
        <div className="aed-banner">
          記事の本文が表示されていません。下書きの記事をローカルで見るには web/.env.local に SHOW_DRAFTS=1 が必要です
          （設定済みなら、記事ページ側でエラーが出ていないか確認してください）。
          <button type="button" onClick={reloadFrame}>表示を読み込み直す</button>
        </div>
      ) : null}

      <div className="aed-main">
        <iframe ref={frameRef} className="aed-frame" src={`/articles/${slug}`} title="記事の表示" onLoad={attach} />

        {target && p ? (
          <aside className={`aed-drawer aed-drawer--${target.type}`} aria-label="編集">
            <div className="aed-drawer-head">
              <div>
                <div className="aed-drawer-title">{drawerTitle}</div>
                <div className="aed-drawer-sub">{drawerSub}</div>
              </div>
              <button type="button" className="aed-close" onClick={() => void close()} aria-label="閉じる">×</button>
            </div>

            {target.type === "meta" ? (
              <div className="aed-meta">
                {p.fields.map((f) => (
                  <div className="aed-meta-row" key={f.key}>
                    <div className="aed-meta-label">
                      {f.label}
                      <span>{f.value ? `${[...f.value].length} 字` : "未記入"}</span>
                    </div>
                    <div className="aed-meta-value">{f.value ?? "—"}</div>
                    {f.editable ? (
                      <button type="button" onClick={() => void open({ type: "field", key: f.key })}>直す</button>
                    ) : (
                      <span className="aed-meta-note">「全文ソース」で直せます</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {externalChange ? (
                  <p className="aed-warn">
                    このファイルは別の場所でも更新されています。このまま保存すると衝突するので、
                    文章をコピーしてから開き直してください。
                  </p>
                ) : null}
                <textarea
                  key={targetId(target) ?? target.type}
                  className="aed-text"
                  value={draft}
                  onChange={(e) => onTextChange(e.target.value)}
                  onKeyDown={onTextKeyDown}
                  spellCheck={false}
                  autoFocus
                />
                <p className="aed-hint">{hintFor(target, block)}</p>
                {errorText ? (
                  <p className="aed-error">
                    {errorText}
                    {saveError?.detail && saveError.detail !== saveError.message ? (
                      <span className="aed-error-detail">{saveError.detail}</span>
                    ) : null}
                  </p>
                ) : null}
                <div className="aed-drawer-foot">
                  <span className={`aed-count${descOut ? " is-warn" : ""}`}>
                    {chars} 字{field?.key === "description" ? "（60〜120 字が目安）" : ""}
                  </span>
                  <div className="aed-foot-actions">
                    <button type="button" onClick={() => void close()}>キャンセル</button>
                    <button
                      type="button"
                      className="is-primary"
                      onClick={() => void save()}
                      disabled={!dirty || saving || stale}
                    >
                      {saving ? "保存中…" : "保存（Ctrl+S）"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>
        ) : null}
      </div>

      {toast ? <div className="aed-toast" role="status">{toast}</div> : null}

      {ask ? (
        <div className="aed-confirm" role="dialog" aria-modal="true" onClick={() => answer(false)}>
          <div className="aed-confirm-box" onClick={(e) => e.stopPropagation()}>
            <p>{ask.message}</p>
            <div className="aed-foot-actions">
              <button type="button" onClick={() => answer(false)}>やめる</button>
              <button type="button" className="is-primary" onClick={() => answer(true)} autoFocus>{ask.ok}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
