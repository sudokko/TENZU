import "./top-rich.css";
import SiteHeader from "./SiteHeader";
import { ArticlesSection, SiteFooter, TOTAL_KINDS, TOTAL_VOL, GROUPS, LEVELS, LevelGraph } from "./catalog";
import CoverageStudio from "./CoverageStudio";
import { VISIBLE_MAKERS } from "./products/makers";
import { QUESTIONS_PER_VOL } from "./products/data";

const MAKER_KINDS = VISIBLE_MAKERS.length;
/* 総問数はハードコードせず SSOT から導出（巻数 × 1 巻の問数）。
   巻数・種類数は本日だけで何度も動いたため、必ず GROUPS 由来の値を使う。
   3 つの力＝群数・9 種類＝タスク数・5 段階＝レベル名の数。 */
const TOTAL_QUESTIONS = TOTAL_VOL * QUESTIONS_PER_VOL;
const TOTAL_FORCES = GROUPS.length;      // 3（見て写す／かたちを動かす／重ねる・分ける）
const TOTAL_LEVELS = LEVELS.length;      // 5（入門〜発展）

/* =========================================================================
   TOP（正本 `/`）— Brilliant 寄せ「1.5」。2026-06-09 に /top-rich から昇格。
   方針（オーナー確定）: rev.5 の静けさを保ったまま、物語・証明・体験・締めの
   セクションを足して平坦さを解消。署名となる動き（点→形の線描）を一つだけ置く。
   - Hero 文言はタグライン第4世代（brand.md §12）: H1=業態主役（表記階層化の並記を
     統合）＋コアタグライン＋サブタグライン。業態識別句はフッターが担保。
   - メーカーは従属的に触れる（funnel §17 更新）。主導線は「レベル選びガイド」。
     メーカーは Flow 後の補完セクションで案内。
   - 品ぞろえは coverage 方式で圧縮: 地図3カード＋CTA（店頭の実体は /products に一本化）。
   - 「大切にした 3 つ」＝図解カード（①適レベル ②模写だけにしない ③印刷の自由）。
   - 「家庭での続け方」＝縦タイムライン（案B）。
   自前 CSS のみ（client JS なし・Server Component 維持）。
   商品系リンクは配線済（種類→/products/{slug}・すべて見る→/products）。
   ※「サンプルを見る」CTA はサンプル閲覧プレビュー実装まで撤去（2026-07-06）。
   変遷: 旧 A 案 → archive/retired-designs/2026-06-09-top-a-storefront-superseded.tsx
   ========================================================================= */

/* インライン SVG 用の色定数（tokens.css の --accent / --fg と同値を維持すること） */
const TEAL = "#2C6E7F";
const INK = "#1A1F2A";
const FAINT = "#C5C9CF";

/* ---- 署名アニメ Pattern B: 左のお手本（常時表示）を見ながら、右に悩みながら写す ---- */
const SX0 = 24, SSTEP = 44;
const sc = (n: number) => SX0 + n * SSTEP; // 24,68,112,156,200
const PANEL_DX = 296;  // 右パネルの横オフセット（左 0..224 ／ 右 296..520）
const SLOT = "7.5s";   // 1 フェーズ（お手本を見て、悩みながら写す 1 巡）の尺
const FADE = 0.9;      // この比率まで完成を保持し、以降で消去して次フェーズへ
const RWIN: [number, number] = [0.12, 0.80]; // 右パネルの描画時間窓（残りは保持→消去）
const HOVER = 0.5, DRAW = 0.4; // 各辺: 迷う(hover)→引く(draw)→止まる(残り)＝"悩みながら"の間

/* お手本＝左右にも回転にも非対称なひと筆書き（鏡・回転が判別できる形）。 */
const BASE: number[][] = [[1, 0], [2, 0], [2, 3], [4, 3], [4, 4], [1, 4]];
const dOf = (verts: number[][]) =>
  "M" + verts.map(([c, r]) => `${sc(c)} ${sc(r)}`).join(" L") + " Z";

/* グリッド変換（列 c・行 r ∈ 0..4）。SSOT: 鏡＝左右反転（縦軸・横並び）／回転＝90°時計回り。
   label＝タスク名／rule＝親子向けの平易な言い換え（用語だけでは伝わらないため併記）。 */
type Xf = (c: number, r: number) => number[];
const applyXf = (verts: number[][], xf: Xf) => verts.map(([c, r]) => xf(c, r));
const PHASES: { key: string; label: string; rule: string; xf: Xf }[] = [
  { key: "copy", label: "模写", rule: "そのまま写す（模写）", xf: (c, r) => [c, r] },
  { key: "mirror", label: "鏡", rule: "左右をさかさまにして写す（鏡）", xf: (c, r) => [4 - c, r] },
  { key: "rotate", label: "回転", rule: "回してから写す（回転）", xf: (c, r) => [4 - r, c] },
];

/* 1 図形を時間窓 [t0,t1] で描き、FADE まで保持して消す SMIL データを生成。
   辺ごと「描く(0.72)→止まる(0.28)」の二拍・線(dashoffset)/点灯/鉛筆(keyPoints) が
   同一 keyTimes を共有して単一クロックで同期する構造は従来と同じ。 */
function buildPanel(verts: number[][], t0: number, t1: number) {
  const pts = verts.map(([c, r]) => [sc(c), sc(r)]);
  const n = pts.length;
  const seg: number[] = []; let total = 0;
  for (let k = 0; k < n; k++) {
    const a = pts[k], b = pts[(k + 1) % n];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    seg.push(L); total += L;
  }
  const cum: number[] = []; let acc = 0;
  for (let k = 0; k < n; k++) { acc += seg[k]; cum.push(acc / total); }
  const SEGT = (t1 - t0) / n; // 各辺の持ち時間（窓内）
  const kt: number[] = [0, t0], dash: number[] = [360, 360], kp: number[] = [0, 0];
  for (let k = 0; k < n; k++) {
    const sk = t0 + k * SEGT;
    const hoverEnd = sk + SEGT * HOVER, drawEnd = sk + SEGT * (HOVER + DRAW), segEnd = sk + SEGT;
    const cumPrev = k === 0 ? 0 : cum[k - 1];
    const prevOff = +(360 * (1 - cumPrev)).toFixed(2), newOff = +(360 * (1 - cum[k])).toFixed(2);
    const prevPos = +cumPrev.toFixed(5), newPos = +cum[k].toFixed(5);
    kt.push(+hoverEnd.toFixed(4)); dash.push(prevOff); kp.push(prevPos); // 迷う：前の頂点で止まって考える
    kt.push(+drawEnd.toFixed(4)); dash.push(newOff); kp.push(newPos);    // 引く：次の頂点まで一気に
    kt.push(+segEnd.toFixed(4)); dash.push(newOff); kp.push(newPos);     // 止まる：一拍おく
  }
  kt.push(FADE); dash.push(0); kp.push(1);  // 完成を保持
  kt.push(1); dash.push(360); kp.push(1);   // 消去（次フェーズへ）
  // 各頂点は「その辺を引き終えた時刻」に点灯（v0 は描き始め）
  const lit = pts.map((_, j) => (j === 0 ? +(t0 + 0.01).toFixed(4)
    : +(t0 + (j - 1) * SEGT + SEGT * (HOVER + DRAW)).toFixed(4)));
  const d = dOf(verts);
  return { d, pts, lit, keyTimes: kt.join(";"), dash: dash.join(";"), keyPoints: kp.join(";") };
}

function PencilShape() {
  return (
    <g transform="rotate(-40)">
      {/* 芯（黒鉛の尖り） */}
      <polygon points="0,0 5.5,-1.7 5.5,1.7" fill="#232730" />
      {/* 削った木部（テーパー・上下で陰影） */}
      <polygon points="5.5,-1.7 15,-3.6 15,0 5.5,0" fill="#EAD3A2" />
      <polygon points="5.5,1.7 15,3.6 15,0 5.5,0" fill="#D6AE68" />
      {/* 六角軸（上ハイライト／中／下シャドウの3帯で立体に） */}
      <rect x={15} y={-3.6} width={54} height={2.2} fill="#F2C45E" />
      <rect x={15} y={-1.4} width={54} height={2.8} fill="#E0A23A" />
      <rect x={15} y={1.4} width={54} height={2.2} fill="#C6871F" />
      <rect x={15} y={-3.6} width={54} height={7.2} fill="none" stroke="#9C6E1A" strokeWidth={0.5} />
      {/* 軸の切り口（フラットエンド・色鉛筆風） */}
      <rect x={67.5} y={-3.6} width={1.5} height={7.2} fill="#C6871F" />
    </g>
  );
}

/* 静的な 5×5 ドット格子（1 パネルぶん）。 */
function DotGrid() {
  const dots: React.ReactNode[] = [];
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 5; c++)
      dots.push(<circle key={`${r}-${c}`} cx={sc(c)} cy={sc(r)} r={1.7} fill={INK} opacity={0.32} />);
  return <>{dots}</>;
}

/* 1 図形の線を描く。teal 点・鉛筆は右パネル（写す側＝「書く」）のみ true。 */
function DrawFigure({ g, begin, clkId, pathId, dots, pencil }: {
  g: ReturnType<typeof buildPanel>; begin: string; clkId?: string; pathId: string;
  dots: boolean; pencil: boolean;
}) {
  return (
    <g aria-hidden="true">
      <path className="sig-path sig-bloom" d={g.d} pathLength={360} filter="url(#sig-press)">
        <animate attributeName="stroke-dashoffset" values={g.dash} keyTimes={g.keyTimes}
          begin={begin} dur={SLOT} calcMode="linear" />
      </path>
      <path id={pathId} className="sig-path" d={g.d} pathLength={360} filter="url(#sig-graphite)">
        <animate id={clkId} attributeName="stroke-dashoffset" values={g.dash} keyTimes={g.keyTimes}
          begin={begin} dur={SLOT} calcMode="linear" />
      </path>
      {dots && g.pts.map((p, j) => (
        <circle key={j} className="sig-dot" cx={p[0]} cy={p[1]} r={3.4}>
          <animate attributeName="opacity" values="0;1;0;0"
            keyTimes={`0;${g.lit[j]};${FADE};1`} begin={begin} dur={SLOT} calcMode="discrete" />
        </circle>
      ))}
      {pencil && (
        <g className="sig-pencil">
          <animateMotion begin={begin} dur={SLOT} keyPoints={g.keyPoints} keyTimes={g.keyTimes}
            calcMode="linear" rotate="0">
            <mpath href={`#${pathId}`} />
          </animateMotion>
          <animate attributeName="opacity" values="0;0;1;1;0;0"
            keyTimes="0;0.11;0.15;0.80;0.84;1" begin={begin} dur={SLOT} calcMode="linear" />
          <PencilShape />
        </g>
      )}
    </g>
  );
}

/* 左＝お手本。最初から描いてあり、全フェーズ通して残す静的モデル（アニメなし）。 */
function StaticModel() {
  const d = dOf(BASE);
  return (
    <g aria-hidden="true">
      <path className="sig-path sig-bloom sig-static" d={d} pathLength={360} filter="url(#sig-press)" />
      <path className="sig-path sig-static" d={d} pathLength={360} filter="url(#sig-graphite)" />
    </g>
  );
}

/* 右＝写す側（1 フェーズぶん）。悩みながら描き、begin チェーンでフェーズを巡回。
   お手本は静的なので位相クロック（sigClk{i}）は右パスに載せる。 */
function RightPhase({ phase, i, n }: { phase: (typeof PHASES)[number]; i: number; n: number }) {
  const begin = i === 0 ? `0s;sigClk${n - 1}.end` : `sigClk${i - 1}.end`;
  const g = buildPanel(applyXf(BASE, phase.xf), RWIN[0], RWIN[1]);
  return (
    <g className={`sig-phase sig-phase-${i}`} transform={`translate(${PANEL_DX},0)`}>
      <DrawFigure g={g} begin={begin} clkId={`sigClk${i}`} pathId={`rPath${i}`} dots pencil />
    </g>
  );
}

/* パネル名。左＝「お手本」（静的）／右＝タスク単語（模写・鏡・回転）をフェーズ同期で巡回表示。 */
function Labels() {
  const n = PHASES.length;
  return (
    <>
      <text className="sig-panel-label" x={112} y={258} textAnchor="middle" aria-hidden="true">お手本</text>
      {PHASES.map((p, i) => {
        const begin = i === 0 ? `0s;sigClk${n - 1}.end` : `sigClk${i - 1}.end`;
        return (
          <text key={p.key} className={`sig-word-label sig-word-${i}`} x={408} y={258}
            textAnchor="middle" aria-hidden="true">
            {p.label}
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.88;1"
              begin={begin} dur={SLOT} calcMode="linear" />
          </text>
        );
      })}
    </>
  );
}

function SignatureDraw() {
  return (
    <div className="sig-wrap">
      <svg className="sig-draw" viewBox="0 0 520 272" role="img"
        aria-label="左のお手本を見ながら、右のマスに、そのまま写す・左右さかさま・回して写す、を順に書いていくアニメーション">
        <defs>
          {/* グラファイト：擦れ（変位）＋ 紙の目に乗る粒状カスレ */}
          <filter id="sig-graphite" x="-30%" y="-30%" width="160%" height="160%"
            colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.04"
              numOctaves={3} seed={7} result="warp" />
            <feDisplacementMap in="SourceGraphic" in2="warp" scale={2.4}
              xChannelSelector="R" yChannelSelector="G" result="rough" />
            <feTurbulence type="fractalNoise" baseFrequency="0.85"
              numOctaves={2} seed={11} result="grain" />
            <feColorMatrix in="grain" type="matrix" result="mask"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.1 0 0 0 0.32" />
            <feComposite in="rough" in2="mask" operator="in" result="speckled" />
            <feColorMatrix in="rough" type="matrix" result="base"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.38 0" />
            <feMerge result="ink">
              <feMergeNode in="base" />
              <feMergeNode in="speckled" />
            </feMerge>
            <feGaussianBlur in="ink" stdDeviation={0.22} />
          </filter>
          {/* 筆圧のにじみ＝太く薄くボカした下地 */}
          <filter id="sig-press" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={1.7} />
          </filter>
        </defs>
        {/* お手本＝格子ごと 1.25 倍に拡大（みほんを主役に） */}
        <g className="sig-model" transform="translate(112 118) scale(1.25) translate(-112 -112)">
          <DotGrid />
          <StaticModel />
        </g>
        {/* かいてみる＝お手本と同スケール（1.25 倍）に揃える */}
        <g className="sig-copy" transform="translate(408 118) scale(1.25) translate(-408 -112)">
          <g transform={`translate(${PANEL_DX},0)`}><DotGrid /></g>
          {PHASES.map((p, i) => (
            <RightPhase key={p.key} phase={p} i={i} n={PHASES.length} />
          ))}
        </g>
        <g className="sig-arrow" aria-hidden="true">
          <path d="M250 118 H272" />
          <path d="M266 112 L272 118 L266 124" />
        </g>
        <Labels />
      </svg>
    </div>
  );
}

/* ---- ★ 3 つの特長・ビジュアル（差し替え可能） ----
   既定はインライン SVG。将来ラスター/別画像に差し替えたくなったら、下の定数に
   /public 配下のパスを入れるだけで <img> に切り替わる（WHY_PHOTO と同じ流儀）。
   SVG 自体を差し替えるなら FeatOpenSvg / FeatPrintSvg の中身を書き換える。 */
const FEAT_OPEN_IMG: string | null = null;   // 特長2: 設計図が見える商品カード
const FEAT_PRINT_IMG: string | null = null;  // 特長3: 用紙・向き・問数の選択

/* 特長2 ビジュアル: 「買う前に全部読める」＝実際の商品カードに忠実。
   左＝紙面プレビュー（お手本の点描写＝点格子＋図形）／右＝商品ページと同じ spec
   （盤面・この巻の特徴・対象目安）を“文字で読める”形に＋¥200。難易度 D などの
   内部語は出さない（外向け商品ページに合わせる）。viewBox 固定・CSS で幅フィット。 */
function FeatOpenSvg() {
  const jp = "'Hiragino Sans','Yu Gothic',sans-serif";
  const dp = (i: number) => 40 + i * 21;            // 4×4 サムネの点座標（40,61,82,103）
  const spec = [
    { lab: "盤面", val: "4×4" },
    { lab: "この巻の特徴", val: "ななめ入り・交差も" },
    { lab: "対象目安", val: "6〜9 才ごろ" },
  ];
  return (
    <svg viewBox="0 0 300 150" className="tr-feat-svg" aria-hidden="true">
      <rect x="16" y="16" width="268" height="118" rx="8" fill="#fff" stroke={INK} strokeWidth="1.4" />
      {/* 左: 紙面プレビュー（お手本＝実際に子が写す図形） */}
      <rect x="30" y="32" width="86" height="86" rx="4" fill={TEAL} fillOpacity="0.04" stroke={FAINT} strokeWidth="1" />
      {[0, 1, 2, 3].map((c) => [0, 1, 2, 3].map((r) => (
        <circle key={`${c}-${r}`} cx={dp(c)} cy={dp(r)} r="1.6" fill={INK} opacity="0.42" />
      )))}
      {/* 非対称なひと筆書き（模写のお手本らしい形・ロ＋対角＋屋根） */}
      <path d="M40 61 L82 61 L82 103 L40 103 Z" fill="none" stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M40 61 L61 40 L82 61" fill="none" stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
      <line x1="40" y1="61" x2="82" y2="103" stroke={INK} strokeWidth="1.9" />
      {/* 右: 商品ページと同じ spec（文字で読める） */}
      <g fontFamily={jp}>
        <line x1="132" y1="40" x2="268" y2="40" stroke={FAINT} strokeWidth="0.8" strokeDasharray="2 3" />
        {spec.map((s, i) => (
          <g key={s.lab}>
            <text x="132" y={54 + i * 20} fontSize="8" fill={INK} opacity="0.5">{s.lab}</text>
            <text x="268" y={54 + i * 20} fontSize="10.5" fill={INK} textAnchor="end" fontWeight="600">{s.val}</text>
            <line x1="132" y1={60 + i * 20} x2="268" y2={60 + i * 20} stroke={FAINT} strokeWidth="0.8" strokeDasharray="2 3" />
          </g>
        ))}
        <text x="132" y="126" fontSize="9" fill={INK} opacity="0.5">全 12 問</text>
        <text x="268" y="127" fontSize="15" fontWeight="700" fill={TEAL} textAnchor="end">¥200</text>
      </g>
    </svg>
  );
}

/* 特長3 ビジュアル: 「家庭の印刷機に合わせる」＝A4/A3・たてよこ・1 枚の問数の選択 UI 抜粋。 */
function FeatPrintSvg() {
  return (
    <svg viewBox="0 0 300 150" className="tr-feat-svg" aria-hidden="true">
      {/* A4・A3 用紙 */}
      <rect x="34" y="40" width="52" height="72" rx="3" fill="#fff" stroke={INK} strokeWidth="1.4" />
      <text x="60" y="126" fontSize="9" fill={INK} opacity="0.5" textAnchor="middle" fontFamily="sans-serif">A4</text>
      <rect x="96" y="26" width="66" height="92" rx="3" fill="#fff" stroke={TEAL} strokeWidth="1.6" />
      <text x="129" y="132" fontSize="9" fill={TEAL} textAnchor="middle" fontFamily="sans-serif">A3</text>
      {/* たて/よこ トグル */}
      <g fontFamily="sans-serif" fontSize="9">
        <rect x="188" y="40" width="84" height="22" rx="6" fill="#fff" stroke={FAINT} strokeWidth="1" />
        <rect x="188" y="40" width="42" height="22" rx="6" fill={INK} />
        <text x="209" y="54.5" fill="#fff" textAnchor="middle">たて</text>
        <text x="251" y="54.5" fill={INK} opacity="0.55" textAnchor="middle">よこ</text>
      </g>
      {/* 1 枚あたりの問数 */}
      <g fontFamily="sans-serif" fontSize="8.5">
        <rect x="188" y="76" width="84" height="22" rx="6" fill="#fff" stroke={FAINT} strokeWidth="1" />
        <rect x="209" y="76" width="21" height="22" fill={INK} />
        {["2", "4", "6", "12"].map((n, i) => (
          <text key={n} x={198.5 + i * 21} y="90.5" fill={i === 1 ? "#fff" : INK} opacity={i === 1 ? 1 : 0.55} textAnchor="middle">{n}</text>
        ))}
        <text x="230" y="112" fill={INK} opacity="0.5" textAnchor="middle">1 枚あたりの問数</text>
      </g>
    </svg>
  );
}

/* ---- ⑤ 続け方フロー用アイコン（40×40・採用: 案B 縦タイムライン） ---- */
function IcSample() {
  return (
    <svg viewBox="0 0 40 40" className="flow-icon" aria-hidden="true">
      <rect x="8" y="6" width="20" height="26" rx="2" fill="#fff" stroke={INK} strokeWidth="1.6" />
      <line x1="12" y1="13" x2="24" y2="13" stroke={FAINT} strokeWidth="1.4" />
      <line x1="12" y1="18" x2="24" y2="18" stroke={FAINT} strokeWidth="1.4" />
      <line x1="12" y1="23" x2="20" y2="23" stroke={FAINT} strokeWidth="1.4" />
      <circle cx="26" cy="27" r="6.5" fill="#fff" stroke={TEAL} strokeWidth="2" />
      <line x1="30.5" y1="31.5" x2="36" y2="37" stroke={TEAL} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IcPick() {
  return (
    <svg viewBox="0 0 40 40" className="flow-icon" aria-hidden="true">
      <rect x="13" y="14" width="18" height="22" rx="2" fill="#fff" stroke={INK} strokeWidth="1.6" />
      <rect x="8" y="7" width="18" height="22" rx="2" fill="#fff" stroke={TEAL} strokeWidth="2" />
      <path d="M12 18 L16 22 L23 13" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IcPrint() {
  return (
    <svg viewBox="0 0 40 40" className="flow-icon" aria-hidden="true">
      {[0, 1, 2].map((c) => [0, 1, 2].map((r) => (
        <circle key={`${c}-${r}`} cx={10 + c * 7} cy={24 + r * 6} r="1.4" fill={INK} opacity="0.32" />
      )))}
      <line x1="11" y1="31" x2="31" y2="9" stroke={TEAL} strokeWidth="3" strokeLinecap="round" />
      <path d="M31 9 L34 6 L36 12 Z" fill={TEAL} />
    </svg>
  );
}
function IcLoop() {
  return (
    <svg viewBox="0 0 40 40" className="flow-icon" aria-hidden="true">
      <path d="M31 13 A13 13 0 1 0 33 25" fill="none" stroke={TEAL} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M31 6 L33 15 L24 13 Z" fill={TEAL} />
    </svg>
  );
}

const STEPS = [
  { n: "01", Ic: IcSample, t: "サンプルを見る", d: "代表 1 枚を無料公開。中身を見てから。" },
  { n: "02", Ic: IcPick, t: "今のレベルを選ぶ", d: "¥200 一律。レベル選びガイドで「今」に合う一枚を。" },
  { n: "03", Ic: IcPrint, t: "印刷して、机で", d: "A4 1 枚。鉛筆で点と点をつなぐ数分。" },
  { n: "04", Ic: IcLoop, t: "気が向いた日に、次の一枚", d: "繰り返しても、次へ進んでも。家庭ごとで。" },
];

/* ---- ② なぜ用イラスト ----
   表示パターン切替: "A"=暫定線画（墨＋teal）／"B"=実写真（/assets/top/why-tensha.webp）。
   フラグ 1 つで A↔B を戻せる。 */
const WHY_PATTERN: "A" | "B" = "B";
const WHY_PHOTO_SRC = "/assets/top/why-tensha.webp";
const WHY_PHOTO_ALT = "鉛筆を持って机に向かい、じっと考えながら手を動かしている子ども";

function WhyIllus() {
  const SHAPE = "M60 56 L120 56 L120 128 L156 128 L156 172 L60 172 Z";
  return (
    <svg viewBox="0 0 360 240" className="tr-why-svg" aria-hidden="true">
      <path d={SHAPE} fill="none" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <g>
        <path d="M182 116 H206" stroke={FAINT} strokeWidth={2.4} fill="none" />
        <path d="M200 110 L206 116 L200 122" stroke={FAINT} strokeWidth={2.4} fill="none" strokeLinejoin="round" />
      </g>
      <g transform="translate(168,0)">
        <path d={SHAPE} fill="none" stroke={TEAL} strokeWidth={3} strokeLinejoin="round" strokeDasharray="6 7" />
        <circle cx={60} cy={56} r={4.6} fill={TEAL} />
        <circle cx={120} cy={56} r={4.6} fill={TEAL} />
        <circle cx={120} cy={128} r={4.6} fill={TEAL} />
      </g>
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* ===================== ① Hero（ベネフィット先行＋署名アニメ） ===================== */}
        <section className="tr-hero">
          <div className="wrap">
            <div className="tr-hero-grid">
              <div>
                <h1>点図形（点描写）プリントの、専門店です。</h1>
                <p className="tr-hero-tagline">見て、考えて、書く力を、点描写から。</p>
                {/* サイト紹介文＝Hero に畳み込む（知育村型・店を紹介し「見ていってください」で締める）。
                    旧サブタグライン（模写から〜）は撤去しこの枠に置換。無記名・ラベルなし・淡い teal 敷きで
                    白地から浮かせる。主軸＝作り手の実在（新製品企画の父）／研究して設計／発達に合わせて
                    選べる／親目線の印刷／有料（広告なし・作り込み）。visual-identity §8.1 で正式化。 */}
                <div className="tr-hero-note">
                  <p className="tr-hero-note-body">
                    TENZU のプリントは、IT 企業で新しい製品を企画してきた二児の父が、数多くの教材を
                    研究して一から設計しました。<span className="tr-mark">急に難しくならない、発達に合わせて選べる仕組み</span>、
                    親が使いやすい印刷まで工夫しています。手間をかけているぶん有料ですが、
                    広告は一切入れていません。どうぞ、ゆっくり見ていってください。
                  </p>
                </div>
              </div>
              <div>
                <SignatureDraw />
              </div>
            </div>
          </div>
        </section>

        {/* ===================== ② なぜ、点描写なのか（案A・左に大きな絵＋右に散文）
            背景は白に（tr-sec-alt を外す）。色は写真枠(.tr-why-illus の bg-3)だけに残し、
            上の店主紹介文（淡い teal 敷き）を際立たせる。 */}
        <section className="tr-sec">
          <div className="wrap tr-why-grid">
            <div className="tr-why-illus">
              {WHY_PATTERN === "B" ? (
                <img src={WHY_PHOTO_SRC} alt={WHY_PHOTO_ALT} />
              ) : (
                <WhyIllus />
              )}
            </div>
            <div className="tr-why-copy">
              <div className="tr-sec-head">
                <h2>なぞるのと、写すのは違う。点描写は「考えて、書く」練習です。</h2>
              </div>
              <p className="tr-lead">
                <span className="tr-lead-in">
                  点つなぎは番号をたどるだけ、タブレットは指で触れるだけ。
                </span>
                <br />
                点描写は、<span className="tr-mark">見て、考えて、鉛筆で書く</span>。
                この経験が、ひらがなや図形、これからの学びの土台になります。
              </p>
            </div>
          </div>
        </section>

        {/* ===================== ②.5 TENZU、3 つの特長（数・公開・印刷） =====================
            ①品ぞろえ＝棚(9種類×5段階×42巻)＋レベル目安表(LevelGraph 再利用)、
            ②設計図ごと公開＝中を見て¥200から、③家庭の印刷機に合わせる。
            数字は GROUPS 由来（TOTAL_KINDS/TOTAL_VOL/TOTAL_QUESTIONS）＝ハードコード禁止。 */}
        <section className="tr-sec tr-sec-alt">
          <div className="wrap">
            <div className="tr-sec-head">
              <p className="tr-sec-kicker">TENZU の特長</p>
              <h2>TENZU、3 つの特長。</h2>
            </div>

            {/* 特長1: 品ぞろえ＝棚＋レベル目安表 */}
            <div className="tr-feat tr-feat--shelf">
              <div className="tr-feat-lead">
                <span className="tr-feat-no">1</span>
                <h3 className="tr-feat-name">品ぞろえが、豊富。</h3>
              </div>
              <div className="tr-shelf">
                <div className="tr-shelf-copy">
                  <p className="tr-shelf-headline">
                    {TOTAL_FORCES} つの力が {TOTAL_KINDS} 種類のタスクに分かれ、それぞれレベル別に {TOTAL_LEVELS} 段階。
                    棚にはぜんぶで、<b>{TOTAL_VOL} 巻</b>・<b>{TOTAL_QUESTIONS} 問</b>。
                  </p>
                  <p className="tr-shelf-honest">
                    タスクごとに始まりのレベルが違うので、棚にはあえて空きがあります。むりに埋めていません。
                  </p>
                  <div className="tr-taskchips">
                    {GROUPS.map((g) => (
                      <div className="tr-tcgroup" key={g.label}>
                        <span className="tr-tclabel">{g.label}</span>
                        <span className="tr-tclist">
                          {g.tasks.map((t) => (
                            <span className="tr-tc" key={t.slug}>{t.name}</span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="tr-shelf-graph">
                  <p className="tr-shelf-graph-label">レベルは {TOTAL_LEVELS} 段階（対象年齢のめやす）</p>
                  <div className="lvgraph-wrap"><LevelGraph /></div>
                </div>
              </div>
            </div>

            {/* 特長2・3: 設計図公開／印刷 */}
            <div className="tr-feat-pair">
              <div className="tr-feat tr-feat--card">
                <div className="tr-feat-lead">
                  <span className="tr-feat-no">2</span>
                  <h3 className="tr-feat-name">買う前に、全部読める専門店。</h3>
                </div>
                <div className="tr-feat-visual">
                  {FEAT_OPEN_IMG
                    ? <img src={FEAT_OPEN_IMG} alt="商品ページのイメージ。実際の問題・盤面・この巻の特徴・対象目安まで買う前に読める" />
                    : <FeatOpenSvg />}
                </div>
                <p className="tr-feat-point">
                  どんな形を、どのくらいの線で、どの盤面に書くのか。実際の問題も、対象の目安も、
                  買う前にぜんぶ読めます。だから、はじめての一枚を外しません。
                </p>
                <a className="tr-feat-cta" href="/products">全 {TOTAL_VOL} 巻の中身を見る →</a>
              </div>
              <div className="tr-feat tr-feat--card">
                <div className="tr-feat-lead">
                  <span className="tr-feat-no">3</span>
                  <h3 className="tr-feat-name">大きく 1 問も、ぎっしり 12 問も。</h3>
                </div>
                <div className="tr-feat-visual">
                  {FEAT_PRINT_IMG
                    ? <img src={FEAT_PRINT_IMG} alt="用紙サイズ・向き・1枚あたりの問題数を選べる印刷設定のイメージ" />
                    : <FeatPrintSvg />}
                </div>
                <p className="tr-feat-point">
                  同じ一枚を、A4 でも A3 でも。たて・よこ、1 枚に何問入れるかまで、
                  お子さんの手と机に合わせて刷れます。
                </p>
              </div>
            </div>

            <p className="tr-feat-bridge">
              ↓ {TOTAL_KINDS} 種類それぞれの中身は、すぐ下の「3 つの力」で実演します
            </p>
          </div>
        </section>

        {/* ===================== ③ 品ぞろえ（Brilliant 型・力ピル×タスク実演） ===================== */}
        <CoverageStudio />

        {/* ===================== ⑤ 家庭での続け方（縦タイムライン・案B） ===================== */}
        <section className="tr-sec">
          <div className="wrap">
            <div className="tr-sec-head">
              <p className="tr-sec-kicker">家庭での続け方</p>
              <h2>いつからでも、休んでも。続け方は、家庭ごとでいい。</h2>
            </div>
            <div className="flowB">
              {STEPS.map((s) => {
                const Ic = s.Ic;
                return (
                  <div className="flowB-step" key={s.n}>
                    <span className="flowB-dot">{s.n}</span>
                    <div className="flowB-head">
                      <Ic />
                      <p className="flow-title">{s.t}</p>
                    </div>
                    <p className="flow-desc">{s.d}</p>
                  </div>
                );
              })}
            </div>
            <p className="steps-memo">
              <b>「毎日続いていますか」と聞かれることがあります。</b>続いていなくても大丈夫です。
              1 週間休んだ後の一枚も、最初の一枚と同じ価値です。
            </p>
          </div>
        </section>

        {/* ===================== ⑥ 自分で作る（メーカー・従属的な補完） ===================== */}
        <section className="tr-sec tr-sec-alt">
          <div className="wrap wrap-narrow">
            <div className="tr-sec-head">
              <p className="tr-sec-kicker">自分で作る — メーカー</p>
              <h2>ぴったりが無ければ、自分で作る。</h2>
            </div>
            <p className="tr-lead">
              模写・鏡・移動・回転・欠け補完から、重ね・分解・折り重ねまで。
              {MAKER_KINDS} 種類のメーカーで、家庭の練習プリントを思いどおりに作って PDF 印刷できます。
              模写はいつでも無料。気に入ったメーカーだけ ¥980 の買い切りで。
            </p>
            <div className="tr-cta-row">
              <a className="tr-btn-primary" href="/makers">メーカーを見る →</a>
              <a className="tr-btn-ghost" href="/maker">無料で試す（模写）</a>
            </div>
          </div>
        </section>

        {/* ===================== ⑦ 感情的クロージング ===================== */}
        <section className="tr-close">
          <div className="wrap wrap-narrow">
            <h2>点と点が、つながるように。</h2>
            <p>
              まずは中身を見て、いまのレベルの一枚から。印刷して、机の上で。
              鉛筆で点と点をつなぐ数分が、図形を読む目を育てます。
            </p>
            <div className="tr-cta-row">
              <a className="tr-btn-primary" href="/level-guide">レベル選びガイドへ</a>
            </div>
          </div>
        </section>

        {/* ===================== ⑧ 記事 ===================== */}
        <ArticlesSection />
      </main>

      <SiteFooter />
    </>
  );
}
