"use client";

/* =========================================================================
   レベル選びガイド本体（F2 サブ②・C1-3 / acquisition/funnel.md §3 SSOT）
   設問は questions.ts が SSOT（設問数も QUESTION_COUNT から導出・直書き禁止）。
   選択式に答えると 2 軸を出す:
     軸A はじめる位置（Lv 1-5）… 年齢はめやす、手ごたえ 3 問が優先
     軸B どの種類から（群/タスク）… 目的 1 問 → ★最初の一冊（具体 SKU）
   データは catalog.tsx の GROUPS/LEVELS/LevelGraph を再利用（SSOT・新規データなし）。
   診断語彙は使わない。提案トーン。メアド取得なし・外部依存なし。
   商品リンクは products/data.ts へ配線済（live=詳細・scaffold=一覧の Lv アンカー）。
   中身プレビューは live 巻のみ SKU 詳細の紙面プレビュー（#preview アンカー）へ
   「問題の中身を見る」で配線（decisions §4.9/§5.13・scaffold 巻は非表示）。
   ========================================================================= */

import { useState } from "react";
import { GROUPS, LEVELS, LevelGraph, volOf, type Task } from "../catalog";
import { taskBySlug } from "../products/data";
import { QUESTIONS, QUESTION_COUNT, type Question } from "./questions";

/* ---- タスク横断ルックアップ（GROUPS から名前で引く） ---- */
const ALL_TASKS: { task: Task; group: string }[] = GROUPS.flatMap((g) =>
  g.tasks.map((t) => ({ task: t, group: g.label })),
);
function findTask(name: string) {
  return ALL_TASKS.find((x) => x.task.name === name)!;
}

/* 設問定義は questions.ts へ移設（2026-08-08）。設問数を商品一覧とも共有するため。 */

/* ---- 軸B：目的 → ★最初の一冊（primary）＋関連（related） ---- */
/* 2026-06-19: 旧「模写（絵柄）」は「模写」に統合済（subtype 区別）。draw 系は
   primary=模写 のまま related で絵柄ニーズを受ける関連タスクへ流す */
const MOKUTEKI_MAP: Record<string, { primary: string; related: string[] }> = {
  first: { primary: "模写", related: ["欠け補完", "鏡"] },
  kumon: { primary: "模写", related: ["鏡", "回転"] },
  struggle: { primary: "模写", related: ["欠け補完", "鏡"] },
  draw: { primary: "模写", related: ["かさね", "模写（立体）"] },
  harder: { primary: "鏡", related: ["回転", "かさね"] },
  solid: { primary: "模写（立体）", related: ["模写", "かさね"] },
};

/* ---- 軸A：年齢で初期推定 → 手ごたえ 3 問で確定（手ごたえ優先・やさしい方が勝つ） ---- */
function computeLevelIndex(a: Record<string, string>): number {
  const anchor: Record<string, number> = { "4": 0, "5": 0, "6": 1, "7": 2, "8": 3 };
  let lv = anchor[a.age] ?? 1;
  const { naname, komaka } = a;
  // 手ごたえが年齢を上回るなら引き上げ
  // 斜め・細かさとも最強かつ 7 才以上のときだけ発展編(Lv.5)を許可
  if (naname === "sui" && komaka === "fun") lv = Math.max(lv, (a.age === "7" || a.age === "8") ? 4 : 3);
  else if (naname === "sui" || komaka === "fun") lv = Math.max(lv, 2);
  // 床/天井（やさしい側が勝つ）
  if (komaka === "mada") lv = Math.min(lv, 2);
  if (naname === "mada") lv = Math.min(lv, 1);
  return Math.max(0, Math.min(4, lv));
}

/* ---- SKU 決定（軸A × 軸B）＋歯抜けスナップ（近い存在 Lv・同距離はやさしい側） ---- */
function resolveSku(task: Task, lvIndex: number): { idx: number; snapped: boolean } {
  if (task.lv[lvIndex] > 0) return { idx: lvIndex, snapped: false };
  let best = -1;
  let bestDist = 99;
  task.lv.forEach((v, i) => {
    if (v > 0) {
      const d = Math.abs(i - lvIndex);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
  });
  return { idx: best, snapped: true };
}

export default function GuideApp() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0); // 0..QUESTIONS.length-1
  const [done, setDone] = useState(false);

  const total = QUESTIONS.length;
  const current = QUESTIONS[step];

  function choose(key: string, v: string) {
    setAnswers((prev) => ({ ...prev, [key]: v }));
    if (step + 1 < total) setStep(step + 1);
    else setDone(true);
  }

  function back() {
    if (done) {
      setDone(false);
      setStep(total - 1);
    } else if (step > 0) {
      setStep(step - 1);
    }
  }

  function reset() {
    setAnswers({});
    setStep(0);
    setDone(false);
  }

  return (
    <main className="lg-main">
      <div className="wrap wrap-narrow">
        <header className="lg-head">
          <p className="lg-kicker">レベル選びガイド</p>
          <h1 className="lg-h1">どこから始めるか、いっしょに決めましょう。</h1>
          <p className="lg-lead">
            {QUESTION_COUNT} つの質問に答えると、はじめる位置の目安と、おすすめの一冊が出ます。
            {/* 「迷ったら、ひとつやさしい巻から」は結果画面に一本化（2026-08-08）。
                導入・結果サブ・結果末尾の 3 箇所で同趣旨を繰り返していたため。
                実際に巻を提示されたあと＝迷いが生まれる場所で言うほうが効く。 */}
            正解さがしではありません。
          </p>
        </header>

        {!done ? (
          <Step
            key={current.key}
            q={current}
            index={step}
            total={total}
            selected={answers[current.key]}
            canBack={step > 0}
            onChoose={choose}
            onBack={back}
          />
        ) : (
          <Result answers={answers} onReset={reset} onBack={back} />
        )}
      </div>
    </main>
  );
}

/* ===================== 質問 1 問 ===================== */
function Step({
  q,
  index,
  total,
  selected,
  canBack,
  onChoose,
  onBack,
}: {
  q: Question;
  index: number;
  total: number;
  selected?: string;
  canBack: boolean;
  onChoose: (key: string, v: string) => void;
  onBack: () => void;
}) {
  return (
    <section className="lg-step">
      <div className="lg-progress" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`lg-dot${i === index ? " is-now" : ""}${i < index ? " is-done" : ""}`} />
        ))}
      </div>
      {/* 「任意」バッジは撤去（2026-08-08）。設問が 6 問だった頃の名残で、
          4 問化以降どの設問も optional を持たない死んだ分岐だった。 */}
      <p className="lg-qno">
        質問 {index + 1} / {total}
      </p>
      <h2 className="lg-q">{q.q}</h2>
      {q.help && <p className="lg-help">{q.help}</p>}

      <div className="lg-opts">
        {q.opts.map((o) => (
          <button
            key={o.v}
            type="button"
            className={`lg-opt${selected === o.v ? " is-sel" : ""}`}
            onClick={() => onChoose(q.key, o.v)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {canBack && (
        <button type="button" className="lg-back" onClick={onBack}>
          ← 前の質問へ
        </button>
      )}
    </section>
  );
}

/* ===================== 結果 ===================== */
function Result({
  answers,
  onReset,
  onBack,
}: {
  answers: Record<string, string>;
  onReset: () => void;
  onBack: () => void;
}) {
  const lvIndex = computeLevelIndex(answers);
  const levelName = LEVELS[lvIndex];

  const map = MOKUTEKI_MAP[answers.mokuteki] ?? MOKUTEKI_MAP.first;
  const primary = findTask(map.primary);
  const { idx: skuIdx, snapped } = resolveSku(primary.task, lvIndex);

  // 関連 2-3（primary 除外・重複除外）
  const relatedNames = [...new Set(map.related.filter((n) => n !== map.primary))].slice(0, 3);
  const related = relatedNames.map(findTask);

  const snapNote = snapped
    ? `${primary.task.name}は「${LEVELS[skuIdx]}」から始まります。まずはここから。`
    : null;

  const Fig = primary.task.Fig;

  /* ★一冊のリンク先: 推奨 Lv の Vol.1 が live なら詳細、そうでなければ一覧の該当 Lv へ */
  const dataTask = taskBySlug(primary.task.slug);
  const pickVol = dataTask?.vols.find((x) => x.lv === skuIdx + 1 && x.volNo === 1);
  const pickHref =
    pickVol && pickVol.status === "live"
      ? `/products/${pickVol.sku}`
      : `/products/${primary.task.slug}#lv${skuIdx + 1}`;

  return (
    <section className="lg-result">
      <div className="lg-result-head">
        <p className="lg-result-kicker">店主からのおすすめ</p>
        <h2 className="lg-result-h2">
          「{levelName}」から、はじめてみましょう。
        </h2>
        <p className="lg-result-sub">
          いまの手ごたえなら、ここがちょうどいい入り口です。年齢はめやすです。迷ったときは、ひとつやさしい巻から。
        </p>
      </div>

      {/* はじめる位置（帯グラフでハイライト） */}
      <div className="lg-band">
        <p className="lg-band-label">はじめる位置の目安</p>
        <div className="lvgraph-wrap">
          <LevelGraph highlight={levelName} />
        </div>
      </div>

      {/* ★最初の一冊 */}
      <div className="lg-pick">
        <p className="lg-pick-star">★ 最初の一冊</p>
        <div className="lg-pick-body">
          <div className="lg-pick-fig">
            <Fig />
          </div>
          <div className="lg-pick-text">
            <p className="lg-pick-meta">
              {primary.group} ・ {levelName}
            </p>
            <h3 className="lg-pick-name">
              {primary.task.name}
              <span className="lg-pick-lv">{LEVELS[skuIdx]}</span>
            </h3>
            <p className="lg-pick-desc">{primary.task.desc}</p>
            <p className="lg-pick-note">{primary.task.notes[skuIdx]}</p>
            {snapNote && <p className="lg-pick-snap">{snapNote}</p>}
            <div className="lg-pick-cta">
              <a className="btn-medium" href={pickHref}>
                この一冊を見る →
              </a>
              {pickVol?.status === "live" && (
                <a className="btn-weak" href={`/products/${pickVol.sku}#preview`}>
                  問題の中身を見る →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* そのほかにおすすめ */}
      {related.length > 0 && (
        <div className="lg-related">
          <p className="lg-related-label">そのあとに、こんな種類も</p>
          <ul className="lg-related-list">
            {related.map((r) => (
              <li key={r.task.name}>
                <a className="lg-related-item" href={`/products/${r.task.slug}`}>
                  <span className="lg-related-name">{r.task.name}</span>
                  <span className="lg-related-vol">全 {volOf(r.task.lv)} 巻</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 逃げ道・やり直し */}
      <div className="lg-foot">
        <p className="lg-foot-note">
          このおすすめは、選びの目安です。中身を見て、お子さんに合いそうな一冊を選んでください。
        </p>
        <div className="lg-foot-actions">
          <a className="btn-weak" href="/products">
            ガイドを使わず、全部見る →
          </a>
          <button type="button" className="lg-redo" onClick={onReset}>
            もう一度やってみる
          </button>
          <button type="button" className="lg-back" onClick={onBack}>
            ← 質問にもどる
          </button>
        </div>
      </div>
    </section>
  );
}
