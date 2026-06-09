"use client";

/* =========================================================================
   レベル選びガイド本体（F2 サブ②・C1-3 / acquisition/funnel.md §3 SSOT）
   6 問（うち最後は任意）の選択式に答えると 2 軸を出す:
     軸A はじめる位置（Lv 1-5）… 年齢はめやす、手ごたえ 3 問が優先
     軸B どの種類から（群/タスク）… 目的 1 問 → ★最初の一冊（具体 SKU）
   データは catalog.tsx の GROUPS/LEVELS/LevelGraph を再利用（SSOT・新規データなし）。
   診断語彙は使わない。提案トーン。メアド取得なし・外部依存なし。
   ※サンプル/商品/記事リンクは未配線（href="#"）。
   ========================================================================= */

import { useState } from "react";
import { GROUPS, LEVELS, LevelGraph, volOf, type Task } from "../catalog";

/* ---- タスク横断ルックアップ（GROUPS から名前で引く） ---- */
const ALL_TASKS: { task: Task; group: string }[] = GROUPS.flatMap((g) =>
  g.tasks.map((t) => ({ task: t, group: g.label })),
);
function findTask(name: string) {
  return ALL_TASKS.find((x) => x.task.name === name)!;
}

/* ---- 質問定義 ---- */
type Question = {
  key: string;
  q: string;
  help?: string;
  optional?: boolean;
  opts: { v: string; label: string }[];
};

const QUESTIONS: Question[] = [
  {
    key: "age",
    q: "お子さんの年齢は？",
    help: "答えはレベルの「めやす」にだけ使います。最後は、いまの手ごたえで決めます。",
    opts: [
      { v: "pre", label: "〜4才ごろ" },
      { v: "nenchu", label: "年中（4〜5才）" },
      { v: "nencho", label: "年長（5〜6才）" },
      { v: "g12", label: "小1〜2" },
      { v: "g3", label: "小3以上" },
    ],
  },
  {
    key: "unten",
    q: "点と点を、まっすぐな線でつなげますか？",
    opts: [
      { v: "sui", label: "線でつなぐのは得意" },
      { v: "mada", label: "まだ練習中" },
      { v: "wakaranai", label: "わからない" },
    ],
  },
  {
    key: "naname",
    q: "ななめ（斜め）の線は、引けそうですか？",
    opts: [
      { v: "sui", label: "すいすい引ける" },
      { v: "toki", label: "ときどき・練習中" },
      { v: "mada", label: "まだむずかしい" },
    ],
  },
  {
    key: "komaka",
    q: "5×5くらいの細かいマスや、線の交差はどうですか？",
    opts: [
      { v: "fun", label: "楽しめそう" },
      { v: "ok", label: "少し難しいかも" },
      { v: "mada", label: "まだ早いかも" },
    ],
  },
  {
    key: "mokuteki",
    q: "いちばんのきっかけ・目的は？",
    help: "「どの種類から始めるか」のおすすめに使います。",
    opts: [
      { v: "first", label: "はじめての点描写。とにかく始めたい" },
      { v: "kumon", label: "公文・運筆の「次」を探している" },
      { v: "struggle", label: "図形が苦手・つまずいた" },
      { v: "draw", label: "絵を描くのが好き。楽しく続けたい" },
      { v: "harder", label: "もっと頭を使う問題を" },
      { v: "solid", label: "立体・空間の感覚を育てたい" },
    ],
  },
  {
    key: "kyomi",
    q: "「写す」以外で、興味のあるものは？",
    help: "なくても大丈夫。おすすめの幅をひろげるだけです。",
    optional: true,
    opts: [
      { v: "move", label: "向きを変える・動かす" },
      { v: "overlay", label: "重ねる・分ける" },
      { v: "skip", label: "とくにない / まだわからない" },
    ],
  },
];

/* ---- 軸B：目的 → ★最初の一冊（primary）＋関連（related） ---- */
const MOKUTEKI_MAP: Record<string, { primary: string; related: string[] }> = {
  first: { primary: "模写（図形）", related: ["欠け補完", "模写（絵柄）"] },
  kumon: { primary: "模写（図形）", related: ["線対称", "回転"] },
  struggle: { primary: "模写（図形）", related: ["欠け補完", "平行移動"] },
  draw: { primary: "模写（絵柄）", related: ["模写（図形）", "かさね"] },
  harder: { primary: "線対称", related: ["回転", "かさね"] },
  solid: { primary: "模写（立体）", related: ["模写（図形）", "かさね"] },
};

/* ---- 軸A：年齢で初期推定 → 手ごたえ 3 問で確定（手ごたえ優先・やさしい方が勝つ） ---- */
function computeLevelIndex(a: Record<string, string>): number {
  const anchor: Record<string, number> = { pre: 0, nenchu: 0, nencho: 1, g12: 2, g3: 3 };
  let lv = anchor[a.age] ?? 1;
  const { unten, naname, komaka } = a;
  // 手ごたえが年齢を上回るなら引き上げ
  if (naname === "sui" && komaka === "fun") lv = Math.max(lv, 3);
  if (unten === "sui" && naname === "sui") lv = Math.max(lv, 2);
  // 床/天井（やさしい側が勝つ）
  if (komaka === "mada") lv = Math.min(lv, 2);
  if (naname === "mada") lv = Math.min(lv, 1);
  if (unten === "mada") lv = 0;
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
            6 つの質問（最後の 1 つは任意）に答えると、はじめる位置の目安と、おすすめの一冊が出ます。
            正解さがしではありません。迷ったら、ひとつやさしい巻からで大丈夫です。
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
      <p className="lg-qno">
        質問 {index + 1} / {total}
        {q.optional && <span className="lg-optional">任意</span>}
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

  // 関連 2-3（Q6 の興味で広げる・primary 除外・重複除外）
  let relatedNames = [...map.related];
  if (answers.kyomi === "move") relatedNames = ["回転", "線対称", ...relatedNames];
  else if (answers.kyomi === "overlay") relatedNames = ["かさね", "分解", ...relatedNames];
  relatedNames = [...new Set(relatedNames.filter((n) => n !== map.primary))].slice(0, 3);
  const related = relatedNames.map(findTask);

  const snapNote = snapped
    ? `${primary.task.name}は「${LEVELS[skuIdx]}」から始まります。まずはここから。`
    : null;

  const Fig = primary.task.Fig;

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
              <a className="btn-medium" href="#">
                この一冊を見る →
              </a>
              <a className="btn-weak" href="#">
                サンプル PDF を見る
              </a>
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
                <a className="lg-related-item" href="#">
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
          <a className="btn-weak" href="#">
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
