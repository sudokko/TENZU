/* =========================================================================
   「収録N問の内訳」セクション（商品詳細・LLMO）
   ねらい: 12問の中身はこれまで SVG だけで、本文にテキストが 1 文字も無かった。
   検索・LLM から見ると「絵が数枚ある商品ページ」になってしまうため、
   JSON-LD と同じ事実を人間にも読める形で本文に置き、両者が裏付け合う状態にする。
   ブランド上も「設計図ごと、全部公開する」（foundation/brand.md §0.5）に沿う。

   数値・文言はここに一切書かない。すべて published/{sku}.json → coverage.ts の導出。
   atelier で問題を差し替えれば本文も自動で追随する（直書き禁止）。
   ========================================================================= */

import type { Coverage } from "./coverage";

export default function CoverageSection({ cov }: { cov: Coverage }) {
  const hasD = cov.rows.some((r) => r.d !== undefined);

  return (
    <section className="s">
      <div className="wrap">
        <div className="cov">
          <h2 className="h2-product">収録している{cov.count}問</h2>
          <p className="lead">{cov.summary}</p>

          {cov.note && (
            <p className="cov-note">
              {cov.transformLabel && <b>{cov.transformLabel}：</b>}{cov.note}
            </p>
          )}

          {/* details の中身も HTML に含まれるため、折りたたんでいても
              クローラ・LLM からは全 N 問が読める（人間の視界だけを軽くする） */}
          <details className="cov-fold">
            <summary>
              {cov.count}問すべての内訳を見る
              <span className="cov-chev" aria-hidden="true" />
            </summary>

            <ol className="cov-list">
              {cov.rows.map((r) => (
                <li className="cov-row" key={r.no}>
                  <span className="cov-no">問{r.no}</span>
                  <span className="cov-body">
                    {r.metrics}
                    {cov.showRowTransform && r.transform && (
                      <span className="cov-tr">{r.transform}</span>
                    )}
                    {/* atelier が「この問題の狙い」を入れた問題だけ、その一文を添える */}
                    {r.aim && <span className="cov-aim">{r.aim}</span>}
                    {/* D の内訳＝式セクションと同じ語彙の実計算。行単位で検算できる */}
                    {r.dParts && <span className="cov-dparts">＝ {r.dParts}</span>}
                  </span>
                  {r.d !== undefined && <span className="cov-d">D {r.d}</span>}
                </li>
              ))}
            </ol>

            {/* D が未算出の巻で「D も計測しています」と書かない（無いものを言わない） */}
            <p className="cov-foot">
              {hasD
                ? `「線」「ななめ」「交差」「難易度スコア D」は、この巻の${cov.count}問すべてを実際に計測した値です。D の算出式も公開しています。`
                : `「線」「ななめ」「交差」は、この巻の${cov.count}問すべてを実際に計測した値です。`}
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
