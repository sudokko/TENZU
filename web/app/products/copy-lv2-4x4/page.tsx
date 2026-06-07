import type { Metadata } from "next";
import SiteHeader from "../../SiteHeader";
import "../product.css";

export const metadata: Metadata = {
  title: "模写 Lv.2 — 4×4 まで · TENZU",
  description:
    "見て写すタスクの Lv.2。点と点の距離を、目で測れるように。A4 縦・12 問・¥200 一律。",
};

const LEVELS = [
  { num: "LV.1", grid: "3×3 まで",  desc: "点の位置を「数えて」写す段階。",          current: false },
  { num: "LV.2", grid: "4×4 まで",  desc: "距離を「測って」写す段階。",              current: true  },
  { num: "LV.3", grid: "5×5 まで",  desc: "構造を「掴んで」写す段階。",              current: false },
  { num: "LV.4", grid: "6×6 まで",  desc: "全体を「先に見て」から写す段階。",        current: false },
  { num: "LV.5", grid: "7×7 まで",  desc: "手本なしで「想起して」写す段階。",        current: false },
];

const REVISIONS = [
  { ver: "v1.3", date: "2026-05-12", note: "線太さを 0.5pt 増しました" },
  { ver: "v1.2", date: "2026-04-30", note: "第 3 問の dot 配置を 1 段下げました" },
  { ver: "v1.1", date: "2026-04-12", note: "親向け解説の段落を入れ替えました" },
  { ver: "v1.0", date: "2026-04-01", note: "初版" },
];

const RELATED = [
  { icon: "/assets/icons/task-copy.svg",   row: "A · 見て写す · Lv.1", name: "模写 Lv.1 — 3×3 まで", promise: "点の位置を、まず数えて確認する。" },
  { icon: "/assets/icons/task-copy.svg",   row: "A · 見て写す · Lv.3", name: "模写 Lv.3 — 5×5 まで", promise: "構造を掴んでから、写し始める。" },
  { icon: "/assets/icons/task-mirror.svg", row: "B · かたちを動かす · Lv.2", name: "線対称 Lv.2", promise: "軸を見つけて、向こう側を描き起こす。" },
];

export default function ProductCopyLv2() {
  return (
    <>
      <SiteHeader currentNav="商品" />

      <div className="wrap">
        <nav className="crumb" aria-label="パンくず">
          <a href="#">商品</a><span className="sep">/</span>
          <a href="#">A 見て写す</a><span className="sep">/</span>
          <span className="cur">模写 Lv.2 — 4×4 まで</span>
        </nav>
      </div>

      <main>
        {/* ============ SKU HEAD ============ */}
        <div className="wrap">
          <section className="sku-head">
            <div className="sku-visual" aria-label="模写 Lv.2 サンプル PDF プレビュー">
              <div className="puzzle-grid" />
              <svg className="sample" viewBox="0 0 100 140" preserveAspectRatio="xMidYMid meet">
                <polyline
                  points="14,42 42,28 70,42 56,84 28,84 14,42"
                  fill="none" stroke="#1A1F2A" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" opacity="0.95"
                />
              </svg>
              <div className="top-stamp">模写 Lv.2</div>
              <div className="corner-stamp">SAMPLE · A4 · 12 問</div>
            </div>

            <div className="sku-meta">
              <div className="sku-tag-row">
                <span>A</span><span className="dot">·</span>
                <span>見て写す</span><span className="dot">·</span>
                <span>Lv.2</span><span className="dot">·</span>
                <span>Vol.03</span>
              </div>
              <h1 className="sku-name">模写 Lv.2<br />— 4×4 まで</h1>
              <p className="sku-promise">点と点の距離を、<br />目で測れるように。</p>

              <div className="price-row">
                <div className="price-yen">¥200</div>
                <div className="price-meta">税込 · 全 12 問 · PDF ダウンロード</div>
              </div>

              <div className="cta-row">
                <a className="btn-strong" href="#">カートへ →</a>
                <a className="btn-medium" href="#">サンプル 1 枚を見る</a>
              </div>

              <div className="spec-table">
                <div className="spec-row"><span className="spec-label">紙サイズ</span><span className="spec-value">A4 縦</span></div>
                <div className="spec-row"><span className="spec-label">問題数</span><span className="spec-value mono">12 問</span></div>
                <div className="spec-row"><span className="spec-label">グリッド</span><span className="spec-value mono">3×3 / 4×4 混在</span></div>
                <div className="spec-row"><span className="spec-label">対象目安</span><span className="spec-value">5 — 7 歳</span></div>
                <div className="spec-row"><span className="spec-label">所要時間</span><span className="spec-value">1 問 1 — 2 分</span></div>
                <div className="spec-row"><span className="spec-label">最終改訂</span><span className="spec-value mono">v1.3 · 2026-05-12</span></div>
              </div>
            </div>
          </section>
        </div>

        {/* ============ LEVEL LADDER ============ */}
        <section className="s">
          <div className="wrap">
            <h2 className="h2-product">このタスクのレベル</h2>
            <p className="lead">
              同じ「模写」を Lv.1 から Lv.5 まで Vol 細刻みで進めます。各レベルは独立に始められます。
            </p>

            <div className="ladder">
              {LEVELS.map((lv) => (
                <article className="lv" key={lv.num} data-state={lv.current ? "current" : undefined}>
                  <span className="lv-num">{lv.current ? `${lv.num} · NOW` : lv.num}</span>
                  <span className="lv-grid-label">{lv.grid}</span>
                  <span className="lv-desc">{lv.desc}</span>
                </article>
              ))}
            </div>

            <aside className="memo--observe" style={{ marginTop: 32, maxWidth: 720 }}>
              <div className="memo-label">ここを見てください</div>
              <p className="memo-body">
                このレベルの〈模写タスク〉は、鏡を渡すよりも軸を見つけてもらうほうが先です。手本を見るときの目の動きが、Lv.1 と Lv.2 で変わってきます。
              </p>
              <div className="memo-date">2026-05-12</div>
            </aside>
          </div>
        </section>

        {/* ============ INSIDE ============ */}
        <section className="s">
          <div className="wrap">
            <h2 className="h2-product">この 1 枚に入っているもの</h2>
            <p className="lead">12 問・A4 1 枚・親向け解説 + 改訂履歴。¥200 一律、サブスクなし。</p>

            <div className="inside-grid">
              <div className="inside-cell">
                <div><span className="ic-num">12</span><span className="ic-unit">問</span></div>
                <div className="ic-label">A4 1 枚に収まる出題密度</div>
              </div>
              <div className="inside-cell">
                <div><span className="ic-num">2</span><span className="ic-unit">分 / 問</span></div>
                <div className="ic-label">1 セッション 15 — 25 分</div>
              </div>
              <div className="inside-cell">
                <div><span className="ic-num">¥200</span></div>
                <div className="ic-label">買い切り · 印刷自由 · 兄妹再利用可</div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ RATIONALE (T3) ============ */}
        <section className="s">
          <div className="wrap">
            <h2 className="h2-product">なぜ Lv.2 にこの SKU が来るか</h2>
            <aside className="memo--rationale" style={{ maxWidth: 720 }}>
              <div className="memo-label">店主から</div>
              <p className="memo-body">
                点と点の距離を測る目を作るには、4×4 までの規則的な配置が必要です。3×3 では情報が足りず、5×5 では距離の比較対象が増えすぎる。Lv.2 は「距離を測ること」だけに集中できる範囲として置きました。
              </p>
            </aside>
          </div>
        </section>

        {/* ============ PARENTS (T4) ============ */}
        <section className="s">
          <div className="wrap">
            <h2 className="h2-product">続け方</h2>
            <aside className="memo--parents" style={{ maxWidth: 720 }}>
              <div className="memo-label">親へのひとこと</div>
              <p className="memo-body">
                このレベルは「写す前に、どこを見るか」を一緒に確認してみてください。<br />
                次は明日でも大丈夫です。同じ問題を 2 回やる日があってもいい設計です。
              </p>
            </aside>
          </div>
        </section>

        {/* ============ REVISION HISTORY (T2) ============ */}
        <section className="s">
          <div className="wrap">
            <h2 className="h2-product">改訂履歴</h2>
            <dl className="rev-list" style={{ maxWidth: 720 }}>
              {REVISIONS.map((r) => (
                <div className="rev-row" key={r.ver}>
                  <dt>{r.ver}</dt>
                  <dd className="rev-date">{r.date}</dd>
                  <dd className="rev-note">{r.note}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ============ RELATED ============ */}
        <section className="s">
          <div className="wrap">
            <h2 className="h2-product">同じ群の他のレベル</h2>
            <div className="related">
              {RELATED.map((c) => (
                <a className="related-card" href="#" key={c.name}>
                  <img src={c.icon} alt="" />
                  <div>
                    <div className="rc-row">{c.row}</div>
                    <div className="rc-name">{c.name}</div>
                    <div className="rc-promise">{c.promise}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="site footer-mini">
        <div className="wrap">
          <span className="copyright">© 2026 TENZU · 点図形（点描写）プリントの専門店</span>
        </div>
      </footer>
    </>
  );
}
