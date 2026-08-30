"use client";

/* =========================================================================
   メーカー共通・UI シェル（ヘッダー・編集ボタン帯・保存パネル・詳細設定・
   出力プレビュー枠・NOTE）。全メーカーで byte-identical だった JSX の単一ソース。
   ロック表示（copy の無料ゲート）は optional props — 未指定なら通常ボタン。
   ========================================================================= */

import { useEffect } from "react";
import {
  PAPER, PAPER_KEYS, COUNT_OPTIONS, paperMax, gridFor,
  type PaperKey, type LayoutPerPage, type PairLayout,
} from "../../products/print";
import { makerFromPath, trackToolStart } from "../../analytics";
import SnsLinks from "../../components/SnsLinks";

// 有料機能の鍵アイコン（「奪う」でなく「発見」: ロック要素はプレビューしつつ購入へ誘導）
export function Lock() {
  return (
    <svg className="lockico" viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
      <rect x="2.5" y="5.3" width="7" height="4.7" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M4 5.3 V3.9 a2 2 0 0 1 4 0 V5.3" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/* ヘッダー。children = 右側クラスタ（copy のマイページ導線等・不要なら省略）。
   トップへの帰り道はここで標準装備（ロゴ＝リンク＋「お店にもどる」）— メーカーを袋小路にしない。 */
export function MakerHeader({ appName, children }: { appName: string; children?: React.ReactNode }) {
  // メーカー起動の計測（tool_start）。全メーカーが必ずここを 1 回マウントする。
  useEffect(() => { trackToolStart(makerFromPath()); }, []);
  return (
    <header className="maker-header">
      <div className="logo-cluster">
        <a className="logo-link" href="/" aria-label="TENZU トップへ">
          <img className="logo-img" src="/assets/logo-horizontal.png" alt="TENZU" />
        </a>
        <div className="app-name">{appName}</div>
      </div>
      <div className="header-links">
        {/* スマホは「← お店へ」に縮めて右クラスタと 1 行同居（縦積み3段化を防ぐ） */}
        <a className="ma-home" href="/">← お店<span className="ma-home-full">にもどる</span><span className="ma-home-short">へ</span></a>
        {children}
      </div>
    </header>
  );
}

/* 戻る・進む・全消去 — 作図盤面の真上に（スマホで指の近く・2026-06-25） */
export function EditActions({
  onUndo, onRedo, onClear, canUndo, canRedo, canClear,
}: {
  onUndo: () => void; onRedo: () => void; onClear: () => void;
  canUndo: boolean; canRedo: boolean; canClear: boolean;
}) {
  return (
    <div className="edit-actions">
      <button className="iconbtn labeled" type="button" title="一つ戻る" aria-label="一つ戻る"
        onClick={onUndo} disabled={!canUndo}>
        <svg viewBox="0 0 16 16">
          <path d="M 6 4 L 3 7 L 6 10" stroke="#1A1F2A" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M 3 7 L 10 7 Q 13 7 13 10 L 13 12" stroke="#1A1F2A" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        <span className="lbl">戻る</span>
      </button>
      <button className="iconbtn labeled" type="button" title="一つ進める" aria-label="一つ進める"
        onClick={onRedo} disabled={!canRedo}>
        <svg viewBox="0 0 16 16">
          <path d="M 10 4 L 13 7 L 10 10" stroke="#1A1F2A" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M 13 7 L 6 7 Q 3 7 3 10 L 3 12" stroke="#1A1F2A" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        <span className="lbl">進む</span>
      </button>
      <button className="iconbtn labeled danger" type="button" title="全消去" aria-label="全消去"
        onClick={onClear} disabled={!canClear}>
        <svg viewBox="0 0 16 16">
          <path d="M 2.5 4.5 L 13.5 4.5" stroke="#1A1F2A" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M 6 4.5 L 6 3 L 10 3 L 10 4.5" stroke="#1A1F2A" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M 4 4.5 L 5 13.5 L 11 13.5 L 12 4.5" stroke="#1A1F2A" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M 7 7.5 L 7 11.5 M 9 7.5 L 9 11.5" stroke="#1A1F2A" strokeWidth="1.2"
            strokeLinecap="round"/>
        </svg>
        <span className="lbl">全消去</span>
      </button>
    </div>
  );
}

/* quickbar: 点の大きさ（小/中/大） */
export function DotSizeSeg({ value, onChange }: {
  value: "s" | "m" | "l"; onChange: (v: "s" | "m" | "l") => void;
}) {
  return (
    <div className="qb-group">
      <span className="qb-label">点の大きさ</span>
      <div className="seg qb-seg" role="group" aria-label="点の大きさ">
        {(["s", "m", "l"] as const).map((k) => (
          <button key={k} type="button"
            aria-pressed={value === k}
            onClick={() => onChange(k)}>
            {k === "s" ? "小" : k === "m" ? "中" : "大"}
          </button>
        ))}
      </div>
    </div>
  );
}

/* quickbar: 一筆書き ON/OFF */
export function OneStrokeSeg({ value, onChange }: {
  value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="qb-group">
      <span className="qb-label">一筆書き</span>
      <div className="seg qb-seg" role="group" aria-label="一筆書きモード">
        <button type="button" aria-pressed={!value} onClick={() => onChange(false)}>OFF</button>
        <button type="button" aria-pressed={value} onClick={() => onChange(true)}>ON</button>
      </div>
    </div>
  );
}

/* 保存済みの問題パネル（グリッド＋選択カウント）。サムネは renderThumb で注入 */
export function SavedPanel<P extends { id: string; selected: boolean }>({
  saved, editingId, selectAllState, selectedCount,
  onToggle, onEdit, onDelete, onMove, onToggleAll, renderThumb,
}: {
  saved: P[];
  editingId: string | null;
  selectAllState: "true" | "false" | "mixed";
  selectedCount: number;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onToggleAll: () => void;
  renderThumb: (p: P) => React.ReactNode;
}) {
  return (
    <div className="group">
      <h3>保存済みの問題</h3>
      {saved.length === 0 ? (
        <p className="saved-empty">
          まだ保存された問題はありません。<br />1 問作って「この問題を保存する」を押すと、ここに並びます。
        </p>
      ) : (
        <div className="saved-grid">
          {saved.map((p, i) => {
            const num = (i + 1).toString().padStart(2, "0");
            const beingEdited = editingId === p.id;
            return (
              <div className={`saved-cell${p.selected ? " sel" : ""}${beingEdited ? " editing" : ""}`} key={p.id}>
                <button className="thumb" type="button"
                  role="checkbox"
                  aria-checked={p.selected}
                  aria-label={`問題 ${num} を PDF に含める`}
                  onClick={() => onToggle(p.id)}>
                  {renderThumb(p)}
                </button>
                {p.selected && <span className="sel-mark" aria-hidden="true">✓</span>}
                {beingEdited && <span className="edit-mark" aria-hidden="true">編集中</span>}
                <span className="cnum">{num}</span>
                {/* 編集・削除は大きいラベル付きボタンを横並び（角の極小×は廃止＝誤タップ対策・案B 2026-06-21） */}
                <div className="cell-actions">
                  <button className="act-edit" type="button"
                    aria-label={`問題 ${num} を編集`}
                    aria-pressed={beingEdited}
                    onClick={() => onEdit(p.id)}>
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M10.5 2.5 L13.5 5.5 L5.5 13.5 L2.5 13.5 L2.5 10.5 Z"
                        fill="none" stroke="currentColor" strokeWidth="1.4"
                        strokeLinejoin="round" strokeLinecap="round" />
                    </svg>
                    <span className="lbl">{beingEdited ? "編集中" : "編集"}</span>
                  </button>
                  <button className="act-del" type="button" aria-label={`問題 ${num} を削除`}
                    onClick={() => {
                      if (window.confirm(`この問題（#${num}）を削除しますか？`)) onDelete(p.id);
                    }}>
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M 2.5 4.5 L 13.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      <path d="M 6 4.5 L 6 3 L 10 3 L 10 4.5" stroke="currentColor" strokeWidth="1.4"
                        strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      <path d="M 4 4.5 L 5 13.5 L 11 13.5 L 12 4.5" stroke="currentColor" strokeWidth="1.4"
                        strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </button>
                </div>
                <div className="order">
                  <button type="button" aria-label="ひとつ前へ" disabled={i === 0}
                    onClick={() => onMove(p.id, -1)}>‹</button>
                  <button type="button" aria-label="ひとつ後へ" disabled={i === saved.length - 1}
                    onClick={() => onMove(p.id, 1)}>›</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {saved.length > 0 && (
        <div className="saved-count">
          <div className="left">
            <button className="chk-all" type="button"
              role="checkbox" aria-checked={selectAllState}
              aria-label="すべて選択" onClick={onToggleAll} />
            <span>選択中 {selectedCount} / {saved.length} 問</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* 詳細設定の折りたたみ。current = summary に出す現在値サマリ文字列 */
export function SettingsFold({ current, children }: { current: string; children: React.ReactNode }) {
  return (
    <details className="settings-fold">
      <summary>
        <span className="sf-label">詳細設定<span className="sf-chevron" aria-hidden="true" /></span>
        <span className="sf-current">{current}</span>
      </summary>
      <div className="sf-body">
        {children}
      </div>
    </details>
  );
}

/* 用紙グループ。isLocked 指定時（copy）のみロック表示＋lockHint */
export function PaperGroup({ paperKey, onSelect, isLocked, lockHint }: {
  paperKey: PaperKey;
  onSelect: (k: PaperKey) => void;
  isLocked?: (k: PaperKey) => boolean;
  lockHint?: string;
}) {
  return (
    <div className="group">
      <h3>用紙</h3>
      <div className="paper-grid" role="group" aria-label="用紙サイズ">
        {PAPER_KEYS.map((k) => {
          const p = PAPER[k];
          const locked = isLocked ? isLocked(k) : false;
          return (
            <button key={k} type="button"
              className={locked ? "locked" : undefined}
              aria-pressed={paperKey === k}
              onClick={() => onSelect(k)}
              title={locked ? lockHint : undefined}>
              <span className="pname">{p.label}{locked && <Lock />}</span>
              <span className="pdim">{p.w}×{p.h}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* 1 ページに何問グループ。isLocked 指定時（copy）のみロック表示 */
export function PerPageGroup({
  perPage, onAuto, onPick, paperKey, pair, marginMm, isLocked, onLockedPick, lockHint,
}: {
  perPage: "auto" | LayoutPerPage;
  onAuto: () => void;
  onPick: (v: LayoutPerPage) => void;
  paperKey: PaperKey;
  pair: PairLayout;
  marginMm: number;
  isLocked?: (v: LayoutPerPage) => boolean;
  onLockedPick?: () => void;
  lockHint?: string;
}) {
  const paper = PAPER[paperKey];
  return (
    <div className="group">
      <h3>1 ページに何問</h3>
      <div className="layout-grid" role="group" aria-label="1ページあたりの問題数">
        <button type="button"
          aria-pressed={perPage === "auto"}
          onClick={onAuto}>
          <span className="lauto">おまかせ</span>
        </button>
        {COUNT_OPTIONS.filter((v) => v <= paperMax(paperKey)).map((v) => {
          const g = gridFor(v, pair, paper.w, paper.h, marginMm);
          const locked = isLocked ? isLocked(v) : false;
          return (
          <button key={v} type="button"
            className={locked ? "locked" : undefined}
            aria-pressed={perPage === v}
            onClick={() => (locked ? onLockedPick?.() : onPick(v))}
            title={locked ? lockHint : undefined}>
            <span className="ldiagram"
              style={{
                gridTemplateColumns: `repeat(${g.cols}, 1fr)`,
                gridTemplateRows:    `repeat(${g.rows}, 1fr)`,
              }}>
              {Array.from({ length: g.cols * g.rows }, (_, i) => <span key={i} />)}
            </span>
            <span className="lnum">{v} 問{locked && <Lock />}</span>
          </button>
          );
        })}
      </div>
    </div>
  );
}

/* 名前・日付の記入欄グループ。locked 指定時（copy）のみ「つける」をロック表示 */
export function NameFieldGroup({ value, onChange, locked, onLockedPick, lockHint }: {
  value: boolean;
  onChange: (v: boolean) => void;
  locked?: boolean;
  onLockedPick?: () => void;
  lockHint?: string;
}) {
  return (
    <div className="group">
      <h3>名前・日付の記入欄</h3>
      <div className="seg" role="group" aria-label="名前・日付の記入欄">
        <button type="button"
          aria-pressed={!value}
          onClick={() => onChange(false)}>
          つけない
        </button>
        <button type="button"
          className={locked ? "locked" : undefined}
          aria-pressed={value}
          onClick={() => (locked ? onLockedPick?.() : onChange(true))}
          title={locked ? lockHint : undefined}>
          つける{locked && <Lock />}
        </button>
      </div>
    </div>
  );
}

/* 出力プレビュー枠。pages = PreviewPage の列・after = DL ボタン等のメーカー固有部 */
export function PreviewShell({
  paperLabel, paperW, paperH, isEmpty, foot, children, after,
}: {
  paperLabel: string;
  paperW: number;
  paperH: number;
  isEmpty: boolean;
  foot: React.ReactNode;
  children: React.ReactNode;
  after: React.ReactNode;
}) {
  return (
    <div className="group">
      <h3>出力プレビュー<span className="pp-paperinfo">{paperLabel} · {paperW}×{paperH}mm</span></h3>
      <div className="pdf-preview">
        {isEmpty ? (
          <div className="pp-empty">
            選択した問題が、ここに並びます。
          </div>
        ) : (
          <>
            <div className="pp-pages">
              {children}
            </div>
            <div className="pp-foot">
              {foot}
            </div>
          </>
        )}
      </div>
      {after}
    </div>
  );
}

export function NoteBox() {
  return (
    <div className="warning" data-system="warning" role="note">
      <strong>NOTE</strong>
      画面で解かせる機能はありません。<br />必ず印刷して、紙の上で練習してください。
    </div>
  );
}

/* メーカー画面の足元（2026-08-26・案A / 2026-08-30 に店紹介を追加）。
   ここが「PDF ボタンより下」であることが置く条件——道具の本業（作る→刷る）を
   横切らせない。NoteBox の直後に置く前提。
   完了画面（DoneScreen）は /maker にしか無く、実測では PDF 到達前に離脱する
   訪問のほうが多いため、11 本すべてに効くこの位置を先に取っている。

   構成は 2 段（上＝店紹介 → 下＝SNS）。SNS チップは「もう知っている人」向けの
   導線で、メーカーから入った初見の人は素通りする。その手前に「誰が作った道具か」
   を置いて、素通りする前に一度は目へ入れる。

   SNS の見出しは実態に合わせて書く。かつての「新しい問題や、作り方のヒント」は
   そういう発信を実際にしておらず（Instagram＝プリント紹介／note＝設計の裏側／
   X・Ameba＝店主の書きもの）、見出しのほうが嘘になっていた。 */
export function MakerFootSns() {
  return (
    <div className="maker-foot-sns">
      <div className="maker-foot-shop">
        <h5 className="shop-head">この道具をつくっているお店</h5>
        {/* 文字列は {" "} を挟まず 1 つの式で持つ＝JSX の改行が全角文の途中へ
            半角スペースを差し込むのを避ける。 */}
        <p className="shop-body">
          {"点図形（点描写）プリントの専門店 TENZU が、無料で公開しています。" +
            "レベル別のプリントを作って売っている、ひとりのお店です。"}
        </p>
        {/* 遷移先は「TENZUについて」（/articles/tenzu-concept）＝店と店主の自己紹介。
            商品一覧ではない——道具の足元で売りに行くと、無料の道具という前提が濁る。 */}
        <a className="shop-link" href="/articles/tenzu-concept">
          <span>どんな店で、誰が、なぜ始めたのか</span>
          <span className="shop-arw" aria-hidden="true">▸</span>
        </a>
      </div>
      <SnsLinks
        heading="よければ、こちらでも"
        lede="お店の様子や、店主が日々考えていることを流しています。"
        className="sns-foot"
      />
    </div>
  );
}
