/* =========================================================================
   共有カタログモジュール（表示コピー・Fig・帯グラフの単一ソース）
   `/`（page.tsx）・`/products`（商品一覧まとめ）・`/level-guide` が共用。
   巻数（lv 配列）は products/data.ts（Vol レベル SSOT）から lvCounts() で導出
   ＝数値の二重定義なし。出典: pack-design §0.2/§11.6/§12-22/§13.7。
   ========================================================================= */

import { lvCounts, LEVEL_NAMES, LEVEL_AGES } from "./products/data";
import { isLaunchHidden } from "./products/capabilities";
import { MAKER_FIG, FigSolid } from "./products/maker-figs";
/* タスクの 1 行説明は products/task-desc.ts が SSOT（メーカー面と共用・
   直接文字列を書かないこと。2026-08-08 に二重管理を解消）。 */
import { TASK_DESC } from "./products/task-desc";

/* 設問サンプル図は maker-figs.tsx を SSOT として共用（メーカー一覧と完全同一の凡例）。
   solid のみメーカー非対応のため maker-figs 側の FigSolid を流用する。 */
const TEAL = "#2C6E7F";
const INK = "#1A1F2A";

/* ===== 3つの力・ミニ図解（visual-identity §6 準拠: 直線＋round cap・格子 0.16・
   teal は「到達後・完成形」の線のみ。アニメは landing.css .mfig-draw が担う） ===== */
const MiniDots = ({ ox }: { ox: number }) => (
  <g fill={INK} opacity={0.16}>
    {[0, 1, 2].map((r) =>
      [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={ox + c * 20} cy={10 + r * 20} r={1.7} />)
    )}
  </g>
);
const miniStroke = { fill: "none", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const MiniArrow = () => (
  <g stroke={INK} opacity={0.45} {...miniStroke}>
    <path d="M60 30 H73" />
    <path d="M69 26 L73 30 L69 34" />
  </g>
);

/* 見て写す: 見本（ink）→ 隣の格子に写しとられた同じ形（teal＝到達後） */
function MiniFigCopy() {
  return (
    <svg viewBox="0 0 134 60" role="img" aria-label="見本の形を、隣の点格子に写す図">
      <MiniDots ox={12} /><MiniDots ox={82} />
      <path d="M12 50 L12 10 L52 30 Z" stroke={INK} {...miniStroke} />
      <MiniArrow />
      <path className="mfig-draw" d="M82 50 L82 10 L122 30 Z" stroke={TEAL} {...miniStroke} pathLength={100} />
    </svg>
  );
}

/* かたちを動かす: 鏡の線（点線）ごしに、うつした形（teal＝到達後） */
function MiniFigMove() {
  return (
    <svg viewBox="0 0 134 60" role="img" aria-label="鏡の線の反対側に、形をうつす図">
      <MiniDots ox={12} /><MiniDots ox={82} />
      <path d="M67 6 V54" stroke={INK} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.35} strokeLinecap="round" fill="none" />
      <path d="M32 10 L52 30 L32 50 Z" stroke={INK} {...miniStroke} />
      <path className="mfig-draw" d="M102 10 L82 30 L102 50 Z" stroke={TEAL} {...miniStroke} pathLength={100} />
    </svg>
  );
}

/* 重ねる・分ける: 四角（ink）＋点線の三角＝重ねる相手 → 重ねた完成形（teal＝到達後）。
   頂点はすべて格子点（x 12/32/52・y 10/30/50）に一致させる。 */
function MiniFigOverlay() {
  return (
    <svg viewBox="0 0 134 60" role="img" aria-label="2つの形を重ねた姿を描く図">
      <MiniDots ox={12} /><MiniDots ox={82} />
      <path d="M12 10 H32 V30 H12 Z" stroke={INK} {...miniStroke} />
      <path d="M12 50 L52 50 L32 10 Z" stroke={INK} {...miniStroke} strokeDasharray="4 4" opacity={0.5} />
      <MiniArrow />
      <g className="mfig-draw" stroke={TEAL} {...miniStroke}>
        <path d="M82 10 H102 V30 H82 Z" pathLength={50} />
        <path d="M82 50 L122 50 L102 10 Z" pathLength={50} />
      </g>
    </svg>
  );
}

const FORCE_FIGS = [MiniFigCopy, MiniFigMove, MiniFigOverlay];

/* slug = products/data.ts のタスク slug（突合キー・/products/{slug} へ配線）
   lv = Lv.1〜5 の各 Vol 数（0＝歯抜け）。data.ts の lvCounts() から導出（手書き禁止）
   notes = 同 index のレベル内容解説（歯抜けは ""）。詳細アコーディオンで表示。出典 pack-tasks §15-22 / §12.2 */
export type Task = { slug: string; name: string; desc: string; lv: number[]; notes: string[]; Fig: () => React.ReactElement };
export type Group = { label: string; sub: string; tasks: Task[] };

/* 全タスク定義（translate/scale/shrink の定義も温存）。公開は LAUNCH_HIDDEN を除いた GROUPS。 */
const ALL_GROUPS: Group[] = [
  {
    label: "見て写す",
    sub: "形をそのまま読み取る、いちばんの基礎。立体に起こすところまで。",
    tasks: [
      {
        slug: "copy", name: "模写", desc: TASK_DESC.copy, lv: lvCounts("copy"), Fig: MAKER_FIG.copy,
        notes: [
          "3×3・まっすぐの線だけ",
          "ななめ（45°）が登場。3×3",
          "線が増えて交差も。4×4〜5×5",
          "45°以外の角度へ。4×4〜5×5",
          "6×6〜最大8×8で総仕上げ",
        ],
      },
      {
        slug: "solid", name: "模写（立体）", desc: TASK_DESC.solid, lv: lvCounts("solid"), Fig: FigSolid,
        notes: [
          "", "",
          "はこ・L字・三角柱・階段（見える辺だけ）",
          "段差・柱・家・門・小さな錐（見える辺だけ）",
          /* Lv.5 は 4 巻あるため、note は「共通点＋巻ごとに変わるもの」を言う。
             旧文は vol1 の形の列挙で、vol2〜4 を説明できていなかった（2026-08-08）。 */
          "巻がすすむほど、立体は大きくなります。隠れた辺も点線で。",
        ],
      },
      {
        slug: "fill", name: "欠け補完", desc: TASK_DESC.fill, lv: lvCounts("fill"), Fig: MAKER_FIG.fill,
        notes: [
          "",
          "3×3・ななめ入り。欠け1〜2本",
          "4×4・交差も登場。欠け2〜3本",
          "5×5・いろいろな角度。欠け3〜4本",
          "6×6・最大盤面。欠け4〜6本",
        ],
      },
    ],
  },
  {
    label: "かたちを動かす",
    sub: "向きや位置を変えて、頭の中で形をとらえる力。鏡・移動・回転。",
    tasks: [
      {
        slug: "mirror", name: "鏡", desc: TASK_DESC.mirror, lv: lvCounts("mirror"), Fig: MAKER_FIG.mirror,
        notes: [
          "",
          "3×3・やさしい形の鏡うつし",
          "4×4・線が増えて交差も",
          "5×5・広い盤面で対応づけ",
          "6×6・最大盤面で総仕上げ",
        ],
      },
      {
        slug: "translate", name: "移動", desc: TASK_DESC.translate, lv: lvCounts("translate"), Fig: MAKER_FIG.translate,
        notes: [
          "",
          "左右上下にずらす。3×3",
          "2マス、そして斜めへ。4×4",
          "複合移動（右2・下1など）",
          "たてよこ複合の移動。最大6×6",
        ],
      },
      {
        slug: "rotate", name: "回転", desc: TASK_DESC.rotate, lv: lvCounts("rotate"), Fig: MAKER_FIG.rotate,
        notes: [
          "",
          "90°右回り。3×3",
          "90°右＋左回り。4×4",
          "180°（さかさま）が登場",
          "右回り・左回り・さかさまが混ざる総仕上げ",
        ],
      },
      {
        slug: "scale", name: "拡大", desc: TASK_DESC.scale, lv: lvCounts("scale"), Fig: MAKER_FIG.scale,
        notes: [
          "", "", "",
          "2倍に拡大（3×3→5×5）",
          "",
        ],
      },
      {
        slug: "shrink", name: "縮小", desc: TASK_DESC.shrink, lv: lvCounts("shrink"), Fig: MAKER_FIG.shrink,
        notes: [
          "", "", "", "",
          "1/2に縮小（5×5→3×3）",
        ],
      },
    ],
  },
  {
    label: "重ねる・分ける",
    sub: "複数の形を組み立てたり、分けたりして読みとく力。",
    tasks: [
      {
        slug: "overlay", name: "かさね", desc: TASK_DESC.overlay, lv: lvCounts("overlay"), Fig: MAKER_FIG.overlay,
        notes: [
          "",
          "2つの形を重ねる。3×3",
          "交差＋線の密度。4×4",
          "角度いろいろ。5×5",
          "大盤面で重ねる。6×6",
        ],
      },
      {
        slug: "decompose", name: "分解", desc: TASK_DESC.decompose, lv: lvCounts("decompose"), Fig: MAKER_FIG.decompose,
        notes: [
          "",
          "重なりから1つ取り出す。3×3",
          "引き算思考を育てる。4×4",
          "密な重なりを抜き出す。5×5",
          "最大盤面の分解。6×6",
        ],
      },
      {
        slug: "fold", name: "折り重ね", desc: TASK_DESC.fold, lv: lvCounts("fold"), Fig: MAKER_FIG.fold,
        notes: [
          "",
          "折り返して重ねる。3×3",
          "4×4・重なりはまだ少なめ",
          "5×5・45°以外の角度で折る",
          "大盤面で折り重ねる。6×6",
        ],
      },
    ],
  },
];

/* 公開カタログ＝LAUNCH_HIDDEN（scale/shrink）を除いた集合。
   TOTAL_KINDS/TOTAL_VOL・TOP/一覧の表示はすべてこの GROUPS から導出（件数の二重定義なし）。 */
export const GROUPS: Group[] = ALL_GROUPS.map((g) => ({
  ...g,
  tasks: g.tasks.filter((t) => !isLaunchHidden(t.slug)),
}));

export const LEVELS = LEVEL_NAMES;

/* レベル＝発達段階インデックス。年齢はめやす（§12.7 基準尺）。 */
const LEVEL_GRAPH = [
  { name: "発展編", from: 7, to: 10, label: LEVEL_AGES[4] },
  { name: "応用編", from: 6, to: 9, label: LEVEL_AGES[3] },
  { name: "基礎編", from: 5, to: 8, label: LEVEL_AGES[2] },
  { name: "初級編", from: 4, to: 7, label: LEVEL_AGES[1] },
  { name: "入門編", from: 3, to: 6, label: LEVEL_AGES[0] },
];
const AGE_MIN = 3, AGE_MAX = 10, GX0 = 130, GX1 = 504, NAMEX = 118;
const gxa = (a: number) => GX0 + ((a - AGE_MIN) / (AGE_MAX - AGE_MIN)) * (GX1 - GX0);

const ACCENT_INK = "#1F5260";

export function LevelGraph({ highlight }: { highlight?: string } = {}) {
  return (
    <svg className="lvgraph" viewBox="0 0 528 278" role="img"
      aria-label={`レベル ${LEVEL_NAMES.length} 段階と対象年齢のめやす（年齢の帯グラフ）`}>
      {[4, 5, 6, 7, 8, 9].map((a) => (
        <line key={a} x1={gxa(a)} y1={14} x2={gxa(a)} y2={240}
          stroke="#E6E3DB" strokeWidth={1} strokeDasharray="2 4" />
      ))}
      <line x1={GX0} y1={240} x2={GX1} y2={240} stroke="#C9CDD3" strokeWidth={1} />
      {LEVEL_GRAPH.map((l, i) => {
        const cy = 30 + i * 46;
        const x = gxa(l.from);
        const w = gxa(l.to) - x;
        const isHi = highlight === l.name;
        const baseOp = 1 - i * 0.055;
        const fillOp = highlight ? (isHi ? 1 : baseOp * 0.32) : baseOp;
        return (
          <g key={l.name}>
            <text x={NAMEX} y={cy + 6} textAnchor="end" className="lvg-name"
              fontWeight={isHi ? 700 : undefined} fill={isHi ? ACCENT_INK : undefined}>{l.name}</text>
            <rect x={x} y={cy - 15} width={w} height={30} rx={7} fill={TEAL} fillOpacity={fillOp}
              stroke={isHi ? ACCENT_INK : "none"} strokeWidth={isHi ? 2 : 0} />
            {isHi && <text x={x - 6} y={cy + 6} textAnchor="end" className="lvg-age"
              fill={ACCENT_INK} fontSize={16}>▶</text>}
            <text x={x + 13} y={cy + 6} className="lvg-age">{l.label}</text>
          </g>
        );
      })}
      {[3, 4, 5, 6, 7, 8, 9, 10].map((a) => (
        <text key={a} x={gxa(a)} y={259} textAnchor="middle" className="lvg-tick">{a}</text>
      ))}
      <text x={GX0} y={273} textAnchor="start" className="lvg-axis">← 対象年齢のめやす（才）</text>
    </svg>
  );
}

export const volOf = (lv: number[]) => lv.reduce((a, b) => a + b, 0);

/* slug → 表示コピー側 Task（Fig・notes・desc）と群ラベルのルックアップ */
export function catalogTaskBySlug(slug: string): { task: Task; group: Group; groupIdx: number } | undefined {
  for (let gi = 0; gi < GROUPS.length; gi++) {
    const task = GROUPS[gi].tasks.find((t) => t.slug === slug);
    if (task) return { task, group: GROUPS[gi], groupIdx: gi };
  }
  return undefined;
}
export const TOTAL_VOL = GROUPS.reduce((s, g) => s + g.tasks.reduce((t, k) => t + volOf(k.lv), 0), 0);
export const TOTAL_KINDS = GROUPS.reduce((s, g) => s + g.tasks.length, 0);

/* ===================== 3つの力・地図カード（/products と TOP 予告編で共用） =====================
   hrefBase 省略時＝同一ページ内アンカー（/products）。TOP からは hrefBase="/products" で棚へ飛ばす。 */
export function ForceMapCards({ hrefBase = "", goLabel }: { hrefBase?: string; goLabel: string }) {
  return (
    <nav className="cat-map" aria-label="3つの力の一覧">
      {GROUPS.map((g, gi) => {
        const Fig = FORCE_FIGS[gi] ?? FORCE_FIGS[0];
        return (
          <a className="cat-map-card" href={`${hrefBase}#cat-g${gi + 1}`} key={g.label}>
            <span className="cat-map-text">
              <span className="cat-map-title">{g.label}</span>
              <span className="cat-map-tasks">{g.tasks.map((t) => t.name).join("・")}</span>
              <span className="cat-map-go">{goLabel}</span>
            </span>
            <span className="cat-map-fig" aria-hidden="true"><Fig /></span>
          </a>
        );
      })}
    </nav>
  );
}

/* §2 もっと知る（記事）は app/ArticlesSection.tsx へ分離（Server 専用・fs 依存のため） */

/* ===================== 共通フッター ===================== */
export function SiteFooter() {
  return (
    <footer className="site">
      <div className="wrap">
        <div className="foot-inner">
          <div className="foot-brand">
            <img src="/assets/logo-horizontal.png" alt="TENZU" />
            <p>
              点図形（点描写）プリントの専門店 TENZU<br />
              見て、考えて、書く力を、点描写から。
            </p>
          </div>
          {/* 見出しは日本語（2026-08-08）。旧 SHOP / ABOUT は、リンクが全部日本語なのに
              見出しだけ英字という状態で、全ページのフッターに出ていた。 */}
          <div className="foot-col">
            <h5>プリント</h5>
            <ul>
              <li><a href="/products">すべてのプリント</a></li>
              <li><a href="/level-guide">レベルで選ぶ</a></li>
              <li><a href="/makers">自分でつくる</a></li>
              <li><a href="/products/design">設計台帳</a></li>
            </ul>
          </div>
          <div className="foot-col">
            {/* 列内に「お店のこと」リンクがあるため、見出しは「お店について」で重複を避ける。 */}
            <h5>お店について</h5>
            <ul>
              <li><a href="/articles">読みもの</a></li>
              <li><a href="/articles/tenzu-concept">お店のこと</a></li>
              <li><a href="/sudo-craft">運営者（SUDO CRAFT）</a></li>
              <li><a href="/contact">お問い合わせ</a></li>
              <li><a href="/tokushoho">特定商取引法に基づく表記</a></li>
              <li><a href="/privacy">プライバシーポリシー</a></li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span className="copyright">© 2026 TENZU · 点図形（点描写）プリントの専門店</span>
        </div>
      </div>
    </footer>
  );
}
