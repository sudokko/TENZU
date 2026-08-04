/* =========================================================================
   立体模写ジェネレータ（v1＝ボクセル方式・seed 決定的）
   「線を引く」のではなく「立体を組む」：単位立方体（ボクセル）で 3D 形状を
   構成 → 斜投影（キャビネット図・奥行き＝右上 45°・1 マス＝格子 1 マス）で
   点格子へ落とし、面が折れる稜線だけを線分化 → 隠線判定（見える＝実線／
   隠れる＝点線）→ 同一直線をマージして SolidEdge 列にする。
   実在する立体しか描けないため、内部線・閉じない面・投影不整合・隠れ辺の
   誤りが構造的に起きない（作問 QA 10 項の①〜⑤を生成段階で保証）。

   幾何の要点（すべて単位格子＋45°のため厳密に決まる）：
   - 投影: sc = x + y ／ su = z + y（su は上向き。盤面 r へは反転して配置）
   - 可視性の遷移は単位辺の内部では起きない＝単位辺は「全部見える／全部隠れる」
     のどちらか。中点 1 点（×2 整数演算）の被覆判定で厳密に決まる。
   - 被覆面（前・上・右の外向き面）は閉区間で判定し、深度は strict 比較。
     同一平面・自面は深度タイで自然に除外される。縁と重なる奥の辺は
     いったん点線になり、実線と同一スクリーン線分なら破棄（実線優先）。
   隠れ辺は巻ポリシーで出し分け：Lv.3・Lv.4＝出さない／Lv.5＝フル
   （"some"＝1〜2 本のレジームは実装として残すが、現行の巻では未使用・decisions §3.100）。
   ========================================================================= */

import type { Problem, SolidEdge } from "../schema";
import { computeSolidMetrics } from "./metrics";
import { baseDifficulty } from "./difficulty";
import { SOLID_LADDER_JSON } from "./ladder";
import { pick, randInt, seededRng, type Rng } from "./rng";

export const SOLID_GENERATOR_VERSION = "1";

/* ---- 巻パラメータ ----
   ladder.json（SSOT・atelier「レベル定義を編集」で可変）が hidden レジームと D 窓を持ち、
   生成固有パラメータ（ボクセル空間・形族・盤面レンジ等）はレジーム別 GEN_PROFILES が補完する。
   → atelier で D 窓を較正すると生成器が追従する／Vol 追加も ladder.json 追記だけで生成可能になる */

export type SolidHiddenPolicy = "none" | "some" | "full";

/* ladder.json の solid エントリ（ladder-schema.ts LADDER_FIELDS.solid と一致） */
export type SolidLadderEntry = { hidden?: SolidHiddenPolicy; D?: [number, number] };

export type FamilyKey =
  | "box"      // 直方体 1 個（入門の型）
  | "stack"    // 箱の積み上げ（2〜4 段・段ごとに縮む/ずれる）
  | "steps"    // 階段（昇り・降り・山型）
  | "poly"     // ポリオミノ床面の押し出し（L/T/U/十字/S）＋部分二段化
  | "wall"     // 壁面ポリオミノ（xz 面の形を薄く押し出す・十字/H など）
  | "carve"    // 直方体から角/縁を削る（凹み・門∏）
  | "compose"  // 複合（基壇＋塔・双塔＋基壇・隣接ビル）
  | "multi"    // 大複合（基壇＋塔群＋門/橋＝城砦風・XL/XXL の主力）
  | "grow";    // ランダム成長ポリキューブ（有機的な組み木）

export type SolidGenProfile = {
  board: [number, number];  // 盤面（cols/rows とも）の下限・上限（上限は 15 まで）
  lines: [number, number];  // マージ後の総線分本数帯（実線＋点線）
  vox: { x: number; y: number; z: number; n: [number, number] }; // ボクセル空間上限・個数帯
  families: FamilyKey[];
  overhang: boolean;        // 張り出し（真下が空）を許すか
  symmetry: number;         // 左右対称化を試みる確率
  minHeight: number;        // z 方向の最小高さ（発展巻で平板を出さない）
  boxQuota: number;         // 完全直方体（退化形）を巻内に許す数（入門の「はこ」枠）
  hiddenRatioMax: number;   // 点線/実線 本数比の上限（隠れ辺フルの濁り防止）
  coincidenceMax: number;   // 視線整列（異なる稜線が同一スクリーン線分）の許容数。
                            // 大型・塔もの（XL/XXL）は整列ゼロが物理的にほぼ不可能なため緩める
                            // （overlap-drop＝実線優先で描画整合は保たれる・高密度パズルでは普通の見え方）
  famShare: number;         // 族クォータの分母（famCap = count/famShare）。大型は届く族が絞られるため小さく
};

export type SolidParams = SolidGenProfile & {
  hidden: SolidHiddenPolicy;
  D: [number, number];      // 難易度窓（= baseDifficulty + 3·隠れ辺）
};

/* 隠れ辺レジーム別の生成プロファイル（レジームが巻の性格を決める・§3.57） */
const GEN_PROFILES: Record<SolidHiddenPolicy, SolidGenProfile> = {
  none: {
    board: [7, 10], lines: [7, 18],
    vox: { x: 4, y: 3, z: 3, n: [2, 12] },
    families: ["box", "stack", "steps", "poly", "carve", "grow"],
    overhang: false, symmetry: 0.35, minHeight: 1, boxQuota: 3, hiddenRatioMax: 1, coincidenceMax: 0, famShare: 3,
  },
  some: {
    board: [8, 12], lines: [11, 26],
    vox: { x: 5, y: 3, z: 4, n: [4, 20] },
    families: ["stack", "steps", "poly", "carve", "compose", "grow"],
    overhang: false, symmetry: 0.3, minHeight: 2, boxQuota: 0, hiddenRatioMax: 1, coincidenceMax: 0, famShare: 3,
  },
  full: {
    board: [9, 15], lines: [16, 44],
    vox: { x: 6, y: 4, z: 5, n: [8, 40] },
    families: ["stack", "steps", "poly", "wall", "carve", "compose", "grow"],
    overhang: true, symmetry: 0.3, minHeight: 2, boxQuota: 0, hiddenRatioMax: 0.65, coincidenceMax: 0, famShare: 3,
  },
};

/* D 窓の上限に応じて full プロファイルを増築する（XL/XXL）。
   Lv は外向け 5 段階固定のまま、Vol.＝D 窓の積み上げで複雑さの天井を上げる設計
   （brand「Vol. で細かさ吸収」）＝ ladder.json に D 窓の高い Vol を追記するだけで
   生成器が自動で大型形状に切り替わる。 */
function profileFor(hidden: SolidHiddenPolicy, D: [number, number]): SolidGenProfile {
  const base = GEN_PROFILES[hidden];
  if (hidden !== "full") return base;
  const top = D[1];
  if (top <= 130) return base;
  if (top <= 220) {
    return { // XL（二棟・大複合）
      board: [11, 15], lines: [24, 70],
      vox: { x: 8, y: 4, z: 6, n: [16, 80] },
      families: ["stack", "steps", "poly", "wall", "carve", "compose", "multi", "grow"],
      overhang: true, symmetry: 0.3, minHeight: 3, boxQuota: 0, hiddenRatioMax: 0.95, coincidenceMax: 10, famShare: 2,
    };
  }
  return { // XXL（最大盤面・大建築）。D 上位帯へ届く「特徴量産」族に絞る
    board: [13, 15], lines: [34, 110],
    vox: { x: 10, y: 4, z: 8, n: [30, 130] },
    families: ["steps", "carve", "multi", "grow"],
    overhang: true, symmetry: 0.35, minHeight: 4, boxQuota: 0, hiddenRatioMax: 1.2, coincidenceMax: 999, famShare: 2,
  };
}

/* ladder.json の巻一覧 × レジーム・D窓別プロファイル ＝ 生成パラメータの完成形 */
export const SOLID_LADDER: Record<string, SolidParams> = Object.fromEntries(
  Object.entries(SOLID_LADDER_JSON).map(([sku, e]) => {
    const hidden = e.hidden ?? "none";
    const D = e.D ?? [9, 15];
    return [sku, { ...profileFor(hidden, D), hidden, D }];
  }),
);

/* symmetrize が形を「治して」しまう族（欠き・高低差が対称化で消える）には適用しない */
const SYMMETRIZE_OK: readonly FamilyKey[] = ["steps", "poly", "grow", "wall", "stack", "multi"];

/* =========================================================================
   ボクセル集合
   座標系: x=右・y=奥・z=上（すべて非負整数・セルは [v, v+1] の単位立方体）
   ========================================================================= */

type V3 = { x: number; y: number; z: number };
type VoxSet = Set<string>;

const K = (x: number, y: number, z: number) => `${x},${y},${z}`;
const parseK = (k: string): V3 => {
  const [x, y, z] = k.split(",").map(Number);
  return { x, y, z };
};

function addBox(cells: VoxSet, x0: number, y0: number, z0: number, w: number, d: number, h: number) {
  for (let x = x0; x < x0 + w; x++)
    for (let y = y0; y < y0 + d; y++)
      for (let z = z0; z < z0 + h; z++) cells.add(K(x, y, z));
}

function removeBox(cells: VoxSet, x0: number, y0: number, z0: number, w: number, d: number, h: number) {
  for (let x = x0; x < x0 + w; x++)
    for (let y = y0; y < y0 + d; y++)
      for (let z = z0; z < z0 + h; z++) cells.delete(K(x, y, z));
}

/* 原点へ正規化（min を 0 に平行移動） */
function normalizeVox(vox: VoxSet): VoxSet {
  let mx = Infinity, my = Infinity, mz = Infinity;
  for (const k of vox) {
    const v = parseK(k);
    mx = Math.min(mx, v.x); my = Math.min(my, v.y); mz = Math.min(mz, v.z);
  }
  const out: VoxSet = new Set();
  for (const k of vox) {
    const v = parseK(k);
    out.add(K(v.x - mx, v.y - my, v.z - mz));
  }
  return out;
}

function voxBounds(vox: VoxSet): V3 {
  let x = 0, y = 0, z = 0;
  for (const k of vox) {
    const v = parseK(k);
    x = Math.max(x, v.x + 1); y = Math.max(y, v.y + 1); z = Math.max(z, v.z + 1);
  }
  return { x, y, z };
}

/* 面隣接（6 近傍）で単一連結か */
function isConnected(vox: VoxSet): boolean {
  const first = vox.values().next().value;
  if (!first) return false;
  const seen = new Set<string>([first]);
  const stack = [first];
  while (stack.length) {
    const { x, y, z } = parseK(stack.pop()!);
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
      const nk = K(x + dx, y + dy, z + dz);
      if (vox.has(nk) && !seen.has(nk)) { seen.add(nk); stack.push(nk); }
    }
  }
  return seen.size === vox.size;
}

/* 重力支持: z>0 の全セルの真下が占有されている（overhang=false の巻の制約） */
function isSupported(vox: VoxSet): boolean {
  for (const k of vox) {
    const v = parseK(k);
    if (v.z > 0 && !vox.has(K(v.x, v.y, v.z - 1))) return false;
  }
  return true;
}

/* 完全直方体（バウンディングボックスを全充填）＝退化形の検出。
   grow の密集収束や carve+対称化の埋め戻しで生まれる「ただの箱」を数える */
function isFullBox(vox: VoxSet): boolean {
  const b = voxBounds(vox);
  return vox.size === b.x * b.y * b.z;
}

/* 左右対称化（x 反転を union）。読みやすく美しい形になりやすい */
function symmetrize(vox: VoxSet): VoxSet {
  const b = voxBounds(vox);
  const out: VoxSet = new Set(vox);
  for (const k of vox) {
    const v = parseK(k);
    out.add(K(b.x - 1 - v.x, v.y, v.z));
  }
  return out;
}

/* =========================================================================
   形状ファミリ（すべて seed 決定的・正規化済みで返す）
   ========================================================================= */

function fBox(rng: Rng, P: SolidParams): VoxSet {
  const w = randInt(rng, 2, P.vox.x);
  const d = randInt(rng, 1, P.vox.y);
  const h = randInt(rng, 1, P.vox.z);
  if (w * d * h < 2 || (w === 1 && d === 1) ) return new Set();
  const cells: VoxSet = new Set();
  addBox(cells, 0, 0, 0, w, d, h);
  return cells;
}

function fStack(rng: Rng, P: SolidParams): VoxSet {
  const cells: VoxSet = new Set();
  let w = randInt(rng, 2, P.vox.x);
  let d = randInt(rng, 1, P.vox.y);
  let x = 0, y = 0, z = 0;
  const tiers = randInt(rng, 2, P.vox.z >= 6 ? 4 : 3); // 大型空間では段数も増やす
  for (let t = 0; t < tiers && z < P.vox.z; t++) {
    const h = randInt(rng, 1, Math.max(1, Math.min(P.vox.z >= 6 ? 3 : 2, P.vox.z - z)));
    addBox(cells, x, y, z, w, d, h);
    z += h;
    // 次の段は縮めてずらす（真上に置く＝支持を保つ）
    const nw = Math.max(1, w - randInt(rng, 1, 2));
    const nd = Math.max(1, d - randInt(rng, 0, 1));
    x += randInt(rng, 0, w - nw);
    y += randInt(rng, 0, d - nd);
    w = nw; d = nd;
    if (w * d <= 0) break;
  }
  return normalizeVox(cells);
}

function fSteps(rng: Rng, P: SolidParams): VoxSet {
  const cells: VoxSet = new Set();
  const d = randInt(rng, 1, Math.min(2, P.vox.y));
  const kind = pick(rng, ["up", "mountain"] as const);
  if (kind === "up") {
    const n = randInt(rng, 2, Math.min(6, P.vox.x, P.vox.z));
    for (let i = 0; i < n; i++) addBox(cells, i, 0, 0, 1, d, i + 1);
  } else {
    // 山型（上がって下がる・左右対称の段々ピラミッド）
    const n = randInt(rng, 1, Math.min(3, P.vox.z, Math.floor((P.vox.x - 1) / 2)));
    const w = 2 * n + (rng() < 0.5 ? 1 : 2);
    for (let i = 0; i <= n; i++) {
      const span = w - 2 * i;
      if (span <= 0) break;
      addBox(cells, i, 0, 0, span, d, i === 0 ? 1 : 1);
      if (i > 0) addBox(cells, i, 0, i, span, d, 1);
    }
    // 積み直し: 各段を高さ方向に伸ばして階段状に
    cells.clear();
    for (let i = 0; i <= n; i++) {
      const span = w - 2 * i;
      if (span <= 0) break;
      addBox(cells, i, 0, 0, span, d, i + 1);
    }
  }
  return normalizeVox(cells);
}

/* 床面ポリオミノ（xy）を z へ押し出し。一部を二段化して высот差を作る */
function fPoly(rng: Rng, P: SolidParams): VoxSet {
  const a = randInt(rng, 2, Math.max(2, P.vox.x - 1)); // 主腕の長さ
  const b = randInt(rng, 2, Math.max(2, P.vox.y + 1)); // 直交腕（y は投影で嵩むので控えめ）
  const t = Math.min(randInt(rng, 1, 2), P.vox.y);     // 腕の太さ
  const foot: [number, number][] = [];
  const rect = (x0: number, y0: number, w: number, d: number) => {
    for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + d; y++) foot.push([x, y]);
  };
  const shape = pick(rng, ["L", "T", "U", "plus", "S"] as const);
  const bd = Math.min(b, P.vox.y); // y 方向の腕は空間上限まで
  if (shape === "L") { rect(0, 0, a + 1, t); rect(0, t, t, bd); }
  else if (shape === "T") { rect(0, 0, a + 2, t); rect(Math.floor((a + 2 - t) / 2), t, t, bd); }
  else if (shape === "U") { rect(0, 0, a + 2, t); rect(0, t, t, bd); rect(a + 2 - t, t, t, bd); }
  else if (shape === "plus") { rect(0, Math.floor(bd / 2) , a + 2, t); rect(Math.floor((a + 2 - t) / 2), 0, t, bd + t); }
  else { rect(0, 0, a, t); rect(a - t, t, a, t); } // S/Z 風
  const h = randInt(rng, 1, Math.max(1, P.vox.z - 1));
  const cells: VoxSet = new Set();
  for (const [x, y] of foot) addBox(cells, x, y, 0, 1, 1, h);
  // 一部の領域を隆起（二段化）: 端の腕 1 本を +1〜2。床面ポリオミノは斜投影だと
  // 「曲がった板」に潰れて読みにくいため、高さ差でほぼ必ず立体感を作る
  if (rng() < 0.85 && h < P.vox.z) {
    const lift = randInt(rng, 1, Math.min(2, P.vox.z - h));
    const xs = foot.map(([x]) => x);
    const cut = pick(rng, [Math.min(...xs), Math.max(...xs)]);
    for (const [x, y] of foot) if (x === cut) addBox(cells, x, y, h, 1, 1, lift);
  }
  return normalizeVox(cells);
}

/* 壁面ポリオミノ（xz の形を y に薄く押し出す）: 十字・H・T の「立て看板」。
   腕が宙に浮く＝overhang 前提（Lv.5 系） */
function fWall(rng: Rng, P: SolidParams): VoxSet {
  // 壁面の形は薄い＝線が少なく D が伸びないため、大ぶりに作る（Lv.5 の隠れ辺フル前提）
  const cells: VoxSet = new Set();
  const d = randInt(rng, 1, Math.min(2, P.vox.y));
  const shape = pick(rng, ["plus", "H", "T"] as const);
  const arm = randInt(rng, 2, Math.min(4, Math.floor((P.vox.x + 1) / 2))); // 空間に応じて腕を伸ばす
  const t = randInt(rng, 1, 2); // 棒の太さ
  if (shape === "plus") {
    const c = arm; // 中心オフセット
    addBox(cells, 0, 0, c, 2 * arm + t, d, t);                    // 横棒
    addBox(cells, c, 0, 0, t, d, 2 * arm + t);                    // 縦棒
  } else if (shape === "H") {
    const h = randInt(rng, 4, Math.max(4, Math.min(8, P.vox.z)));
    const gap = randInt(rng, 1, 2);
    addBox(cells, 0, 0, 0, t, d, h);
    addBox(cells, t + gap, 0, 0, t, d, h);
    addBox(cells, t, 0, Math.floor(h / 2) - 1, gap, d, randInt(rng, 1, 2)); // 横桁
  } else {
    const h = randInt(rng, 3, Math.max(3, Math.min(7, P.vox.z)));
    const w = 2 * arm + t;
    addBox(cells, arm, 0, 0, t, d, h);                            // 幹
    addBox(cells, 0, 0, h, w, d, t);                              // 笠
  }
  return normalizeVox(cells);
}

function fCarve(rng: Rng, P: SolidParams): VoxSet {
  const w = randInt(rng, 3, Math.max(3, P.vox.x));
  const d = randInt(rng, 1, P.vox.y);
  const h = randInt(rng, 2, Math.max(2, P.vox.z));
  const cells: VoxSet = new Set();
  addBox(cells, 0, 0, 0, w, d, h);
  const gate = P.overhang && w >= 3 && h >= 2 && rng() < 0.45;
  if (gate) {
    // 門∏: 底面中央を貫通で抜く（Lv.5 の空洞）
    const gw = randInt(rng, 1, w - 2);
    const gh = randInt(rng, 1, h - 1);
    removeBox(cells, randInt(rng, 1, w - 1 - gw), 0, 0, gw, d, gh);
  } else {
    // 角・縁の欠き取り。大型空間では多数ノッチ＝折れ目を量産（D は体積でなく特徴数で伸びる）
    const notches = randInt(rng, 1, P.vox.x >= 9 ? 6 : P.vox.x >= 7 ? 3 : 2);
    for (let i = 0; i < notches; i++) {
      const nw = randInt(rng, 1, Math.max(1, Math.min(3, w - 2)));
      const nd = d; // 奥行きは貫通で欠く（斜投影で欠きが読みやすい）
      const nh = randInt(rng, 1, Math.max(1, Math.min(3, h - 1)));
      // 大型（張り出し可）は上下どちらの縁も・中腹も欠ける。小型は上側の角のみ（支持を壊さない）
      const nx = P.vox.x >= 9 ? randInt(rng, 0, w - nw) : pick(rng, [0, w - nw]);
      const nz = P.overhang && rng() < 0.4 ? 0 : h - nh;
      removeBox(cells, nx, 0, nz, nw, nd, nh);
    }
  }
  return normalizeVox(cells);
}

function fCompose(rng: Rng, P: SolidParams): VoxSet {
  const cells: VoxSet = new Set();
  const kind = pick(rng, ["tower-on-base", "twin", "side"] as const);
  if (kind === "tower-on-base") {
    const bw = randInt(rng, 3, P.vox.x);
    const bd = randInt(rng, 1, P.vox.y);
    const bh = randInt(rng, 1, 2);
    addBox(cells, 0, 0, 0, bw, bd, bh);
    const tw = randInt(rng, 1, Math.max(1, bw - 2));
    const td = randInt(rng, 1, bd);
    const th = randInt(rng, 1, Math.max(1, P.vox.z - bh));
    addBox(cells, randInt(rng, 0, bw - tw), randInt(rng, 0, bd - td), bh, tw, td, th);
  } else if (kind === "twin") {
    const bd = randInt(rng, 1, P.vox.y);
    const t1 = randInt(rng, 1, 2), t2 = randInt(rng, 1, 2);
    const gap = randInt(rng, 1, 2);
    const h1 = randInt(rng, 2, P.vox.z), h2 = randInt(rng, 2, P.vox.z);
    addBox(cells, 0, 0, 0, t1 + t2 + gap, bd, 1);                 // 基壇でつなぐ
    addBox(cells, 0, 0, 1, t1, bd, h1 - 1);
    addBox(cells, t1 + gap, 0, 1, t2, bd, h2 - 1);
  } else {
    const d = randInt(rng, 1, P.vox.y);
    const w1 = randInt(rng, 1, 3), w2 = randInt(rng, 1, 3);
    const h1 = randInt(rng, 1, P.vox.z), h2 = randInt(rng, 1, P.vox.z);
    if (h1 === h2) return new Set(); // 同高の隣接は единый箱と同じ＝退屈
    addBox(cells, 0, 0, 0, w1, d, h1);
    addBox(cells, w1, 0, 0, w2, d, h2);
  }
  return normalizeVox(cells);
}

/* 大複合（城砦風）: 基壇＋塔群＋胸壁＋門/橋。XL/XXL（D 窓の高い Vol）の主力。
   D＝折れ目の数で決まる（体積では増えない：大きな箱はマージで長い数本になる）ため、
   小さな部材・刻みを重ねて「特徴」を量産するのが高難度巻の作り方。 */
function fMulti(rng: Rng, P: SolidParams): VoxSet {
  const cells: VoxSet = new Set();
  const big = P.vox.x >= 9; // XXL
  const bw = randInt(rng, Math.min(6, P.vox.x - 1), P.vox.x);
  const bd = randInt(rng, 2, P.vox.y);
  const bh = randInt(rng, 1, 2);
  addBox(cells, 0, 0, 0, bw, bd, bh); // 基壇
  const towers: { tx: number; tw: number; th: number }[] = [];
  const nTowers = randInt(rng, 2, big ? 5 : 3);
  for (let i = 0; i < nTowers; i++) {
    const tw = randInt(rng, 1, 2);
    const td = randInt(rng, 1, bd);
    const th = randInt(rng, 2, Math.max(2, P.vox.z - bh));
    const tx = randInt(rng, 0, bw - tw);
    addBox(cells, tx, randInt(rng, 0, bd - td), bh, tw, td, th);
    towers.push({ tx, tw, th });
  }
  // 胸壁（基壇前縁の刻み壁＝1 マスおきの低ブロック。折れ目を量産する城壁ディテール）
  if (big && rng() < 0.65) {
    for (let x = randInt(rng, 0, 1); x < bw; x += 2) addBox(cells, x, 0, bh, 1, 1, 1);
  }
  // 門（基壇の下層だけ貫通で抜く＝上層がまぐさとして残り連結を保つ）
  if (bh >= 2 && bw >= 5 && rng() < 0.5) {
    const gw = randInt(rng, 1, 2);
    removeBox(cells, randInt(rng, 1, bw - 1 - gw), 0, 0, gw, bd, bh - 1);
  }
  // 橋（隣り合う 2 塔の頂をつなぐ・張り出し前提）
  if (towers.length >= 2 && rng() < 0.45) {
    const [a, b] = towers.slice(0, 2).sort((p, q) => p.tx - q.tx);
    const gap = b.tx - (a.tx + a.tw);
    if (gap >= 1 && gap <= 3) {
      const bz = bh + Math.min(a.th, b.th) - 1;
      addBox(cells, a.tx + a.tw, 0, bz, gap, 1, 1);
    }
  }
  return normalizeVox(cells);
}

function fGrow(rng: Rng, P: SolidParams): VoxSet {
  const target = randInt(rng, P.vox.n[0], P.vox.n[1]);
  const cells: VoxSet = new Set([K(0, 0, 0)]);
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;
  let guard = target * 30;
  while (cells.size < target && guard-- > 0) {
    // 既存セルの隣接空きセルから、接触面数の多い場所を優先して足す（コンパクト化）
    const cand: { k: string; w: number }[] = [];
    for (const ck of cells) {
      const c = parseK(ck);
      for (const [dx, dy, dz] of dirs) {
        const x = c.x + dx, y = c.y + dy, z = c.z + dz;
        if (x < 0 || y < 0 || z < 0 || x >= P.vox.x || y >= P.vox.y || z >= P.vox.z) continue;
        const k = K(x, y, z);
        if (cells.has(k)) continue;
        if (!P.overhang && z > 0 && !cells.has(K(x, y, z - 1))) continue;
        let touch = 0;
        for (const [ex, ey, ez] of dirs) if (cells.has(K(x + ex, y + ey, z + ez))) touch++;
        cand.push({ k, w: touch }); // 弱い密集バイアス（強くすると直方体へ収束して退屈）
      }
    }
    if (cand.length === 0) break;
    const total = cand.reduce((s, c) => s + c.w, 0);
    let roll = rng() * total;
    let chosen = cand[0].k;
    for (const c of cand) { roll -= c.w; if (roll <= 0) { chosen = c.k; break; } }
    cells.add(chosen);
  }
  // ヒゲ除去: 接触面 1 のセルを外す（葉の除去＝連結は壊れない）
  for (let pass = 0; pass < 2; pass++) {
    for (const ck of [...cells]) {
      if (cells.size <= P.vox.n[0]) break;
      const c = parseK(ck);
      let touch = 0;
      for (const [dx, dy, dz] of dirs) if (cells.has(K(c.x + dx, c.y + dy, c.z + dz))) touch++;
      if (touch <= 1) cells.delete(ck);
    }
  }
  return normalizeVox(cells);
}

const FAMILY_BUILDERS: Record<FamilyKey, (rng: Rng, P: SolidParams) => VoxSet> = {
  box: fBox, stack: fStack, steps: fSteps, poly: fPoly, wall: fWall,
  carve: fCarve, compose: fCompose, multi: fMulti, grow: fGrow,
};

/* =========================================================================
   稜線抽出 → 隠線判定 → スクリーン線分化
   ========================================================================= */

type UnitEdge = { p: V3; axis: 0 | 1 | 2 }; // p から p+e_axis への単位辺（格子点座標）

function unitEdges(vox: VoxSet): UnitEdge[] {
  const seen = new Set<string>();
  const out: UnitEdge[] = [];
  const push = (axis: 0 | 1 | 2, x: number, y: number, z: number) => {
    const ek = `${axis}:${x},${y},${z}`;
    if (seen.has(ek)) return;
    seen.add(ek);
    out.push({ axis, p: { x, y, z } });
  };
  for (const k of vox) {
    const { x, y, z } = parseK(k);
    push(0, x, y, z); push(0, x, y + 1, z); push(0, x, y, z + 1); push(0, x, y + 1, z + 1);
    push(1, x, y, z); push(1, x + 1, y, z); push(1, x, y, z + 1); push(1, x + 1, y, z + 1);
    push(2, x, y, z); push(2, x + 1, y, z); push(2, x, y + 1, z); push(2, x + 1, y + 1, z);
  }
  return out;
}

/* 面が折れる辺だけ描く：周囲 4 セルの占有が 1（凸）/ 3（凹）/ 対角 2（鞍）。
   隣接 2＝平面継続・0/4＝面なし/内部 → 線にしない（内部線ゼロの保証）。 */
function isCrease(vox: VoxSet, e: UnitEdge): boolean {
  const { x, y, z } = e.p;
  let cells: [number, number, number][];
  if (e.axis === 0) cells = [[x, y - 1, z - 1], [x, y, z - 1], [x, y - 1, z], [x, y, z]];
  else if (e.axis === 1) cells = [[x - 1, y, z - 1], [x, y, z - 1], [x - 1, y, z], [x, y, z]];
  else cells = [[x - 1, y - 1, z], [x, y - 1, z], [x - 1, y, z], [x, y, z]];
  const occ = cells.map(([cx, cy, cz]) => vox.has(K(cx, cy, cz)));
  const n = occ.filter(Boolean).length;
  if (n === 1 || n === 3) return true;
  if (n === 2) return (occ[0] && occ[3]) || (occ[1] && occ[2]); // 対角＝鞍
  return false;
}

/* 視点側を向く表面（前 -y・上 +z・右 +x）＝オクルーダ。×2 整数で厳密比較する。 */
type OccFace =
  | { kind: 0; scMin2: number; scMax2: number; suMin2: number; suMax2: number; depth2: number } // front
  | { kind: 1; suMin2: number; suMax2: number; xMin2: number; xMax2: number; zTop2: number }    // top
  | { kind: 2; yMin2: number; yMax2: number; zMin2: number; zMax2: number; xR2: number };       // right

function buildOccluders(vox: VoxSet): OccFace[] {
  const faces: OccFace[] = [];
  for (const k of vox) {
    const { x, y, z } = parseK(k);
    if (!vox.has(K(x, y - 1, z))) {
      faces.push({ kind: 0, scMin2: 2 * (x + y), scMax2: 2 * (x + y) + 2, suMin2: 2 * (z + y), suMax2: 2 * (z + y) + 2, depth2: 2 * y });
    }
    if (!vox.has(K(x, y, z + 1))) {
      const zTop2 = 2 * (z + 1);
      faces.push({ kind: 1, suMin2: zTop2 + 2 * y, suMax2: zTop2 + 2 * y + 2, xMin2: 2 * x, xMax2: 2 * x + 2, zTop2 });
    }
    if (!vox.has(K(x + 1, y, z))) {
      faces.push({ kind: 2, yMin2: 2 * y, yMax2: 2 * y + 2, zMin2: 2 * z, zMax2: 2 * z + 2, xR2: 2 * (x + 1) });
    }
  }
  return faces;
}

/* 点（×2 座標）がどれかのオクルーダに strict に隠されるか（被覆＝閉区間・深度＝strict）。 */
function isHiddenPoint(faces: OccFace[], sc2: number, su2: number, depth2: number): boolean {
  for (const f of faces) {
    if (f.kind === 0) {
      if (f.depth2 < depth2 && sc2 >= f.scMin2 && sc2 <= f.scMax2 && su2 >= f.suMin2 && su2 <= f.suMax2) return true;
    } else if (f.kind === 1) {
      if (su2 >= f.suMin2 && su2 <= f.suMax2) {
        const d2 = su2 - f.zTop2;               // 面上の深度（y×2）
        const x2 = sc2 - d2;
        if (d2 < depth2 && x2 >= f.xMin2 && x2 <= f.xMax2) return true;
      }
    } else {
      const y2 = sc2 - f.xR2;                   // 面上の深度（y×2）
      if (y2 < depth2 && y2 >= f.yMin2 && y2 <= f.yMax2) {
        const z2 = su2 - y2;
        if (z2 >= f.zMin2 && z2 <= f.zMax2) return true;
      }
    }
  }
  return false;
}

/* スクリーン単位線分（sc,su は投影格子・su 上向き）。
   h＝x 辺（横）・v＝z 辺（縦）・d＝y 辺（右上 45°） */
type Dir = "h" | "v" | "d";

type Projected = {
  units: Map<string, { solid: boolean; dashed: boolean; depths: Set<number> }>;
};

function projectEdges(vox: VoxSet): Projected {
  const faces = buildOccluders(vox);
  const units: Projected["units"] = new Map();
  for (const e of unitEdges(vox)) {
    if (!isCrease(vox, e)) continue;
    const { x, y, z } = e.p;
    // 中点 ×2（辺軸の成分だけ奇数になる）
    const m2: V3 = { x: 2 * x + (e.axis === 0 ? 1 : 0), y: 2 * y + (e.axis === 1 ? 1 : 0), z: 2 * z + (e.axis === 2 ? 1 : 0) };
    const sc2 = m2.x + m2.y, su2 = m2.z + m2.y, depth2 = m2.y;
    const hidden = isHiddenPoint(faces, sc2, su2, depth2);
    const dir: Dir = e.axis === 0 ? "h" : e.axis === 2 ? "v" : "d";
    const sc = x + y, su = z + y;
    const key = `${dir}:${sc},${su}`;
    let u = units.get(key);
    if (!u) { u = { solid: false, dashed: false, depths: new Set() }; units.set(key, u); }
    if (hidden) u.dashed = true; else u.solid = true;
    u.depths.add(depth2);
  }
  return { units };
}

/* 同一直線・同スタイルの連続単位をマージして最終線分へ */
type ScreenSeg = { a: [number, number]; b: [number, number]; style: "solid" | "dashed" };

function mergeUnits(units: Projected["units"]): { segs: ScreenSeg[]; coincidence: number } {
  // 実線優先の overlap-drop（同一スクリーン単位に実線と点線が重なったら実線だけ残す）
  let coincidence = 0;
  const byLine = new Map<string, { pos: number; sc: number; su: number }[]>();
  for (const [key, u] of units) {
    if (u.depths.size > 1) coincidence++;
    const [dir, rest] = key.split(":") as [Dir, string];
    const [sc, su] = rest.split(",").map(Number);
    const style = u.solid ? "solid" : "dashed";
    const lineId = dir === "h" ? `h:${su}` : dir === "v" ? `v:${sc}` : `d:${su - sc}`;
    const pos = dir === "v" ? su : sc;
    const gk = `${style}|${lineId}`;
    if (!byLine.has(gk)) byLine.set(gk, []);
    byLine.get(gk)!.push({ pos, sc, su });
  }
  const segs: ScreenSeg[] = [];
  for (const [gk, arr] of byLine) {
    const [style, lineId] = gk.split("|") as ["solid" | "dashed", string];
    const dir = lineId[0] as Dir;
    arr.sort((p, q) => p.pos - q.pos);
    let run: typeof arr = [];
    const flush = () => {
      if (run.length === 0) return;
      const s = run[0], t = run[run.length - 1];
      if (dir === "h") segs.push({ a: [s.sc, s.su], b: [t.sc + 1, t.su], style });
      else if (dir === "v") segs.push({ a: [s.sc, s.su], b: [t.sc, t.su + 1], style });
      else segs.push({ a: [s.sc, s.su], b: [t.sc + 1, t.su + 1], style });
      run = [];
    };
    for (const p of arr) {
      if (run.length && p.pos !== run[run.length - 1].pos + 1) flush();
      run.push(p);
    }
    flush();
  }
  return { segs, coincidence };
}

/* =========================================================================
   生成本体
   ========================================================================= */

const sortPair = (a: [number, number], b: [number, number]): [[number, number], [number, number]] =>
  a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]) ? [a, b] : [b, a];

/* 形シグネチャ（平行移動不変・スタイル込み）＝巻内かぶり検出 */
function solidSignature(edges: SolidEdge[]): string {
  let mc = Infinity, mr = Infinity;
  for (const e of edges) { mc = Math.min(mc, e.a.c, e.b.c); mr = Math.min(mr, e.a.r, e.b.r); }
  return edges
    .map((e) => {
      const [p, q] = sortPair([e.a.c - mc, e.a.r - mr], [e.b.c - mc, e.b.r - mr]);
      return `${p[0]},${p[1]}-${q[0]},${q[1]}:${e.style === "dashed" ? "x" : "o"}`;
    })
    .sort()
    .join(";");
}

export function generateSolidCandidates(
  sku: string,
  seed: number,
  count: number,
  existing: { solidEdges?: SolidEdge[] }[],
  linesOverride?: number,
): Problem[] {
  const P = SOLID_LADDER[sku];
  if (!P) return [];
  const rng = seededRng(`${sku}#${seed}`);
  const boardMax = Math.min(15, P.board[1]);
  const linesBand: [number, number] = linesOverride !== undefined
    ? [Math.max(P.lines[0], linesOverride - 1), Math.min(P.lines[1], linesOverride + 1)]
    : P.lines;

  const seen = new Set<string>();
  for (const c of existing) if (c.solidEdges?.length) seen.add(solidSignature(c.solidEdges));

  const famCount = new Map<FamilyKey, number>();
  const famCap = Math.max(2, Math.ceil(count / P.famShare));
  let boxCount = 0; // 完全直方体（退化形）の採用数（boxQuota まで）
  const accepted: { problem: Problem; D: number }[] = [];
  const maxAttempts = count * 150;

  for (let attempt = 0; attempt < maxAttempts && accepted.length < count; attempt++) {
    const family = pick(rng, P.families);
    if ((famCount.get(family) ?? 0) >= famCap) continue;

    let vox = FAMILY_BUILDERS[family](rng, P);
    if (vox.size < Math.max(2, P.vox.n[0])) continue;
    if (SYMMETRIZE_OK.includes(family) && rng() < P.symmetry) {
      const sym = symmetrize(vox);
      if (voxBounds(sym).x <= P.vox.x + 1) vox = sym;
    }
    vox = normalizeVox(vox);
    if (vox.size > P.vox.n[1] * 1.5) continue;
    if (voxBounds(vox).z < P.minHeight) continue; // 平板は「発展」にならない
    if (!isConnected(vox)) continue;
    if (!P.overhang && !isSupported(vox)) continue;
    // 退化＝ただの直方体。入門巻の「はこ」枠（boxQuota）だけに許す
    const fullBox = isFullBox(vox);
    if (fullBox && boxCount >= P.boxQuota) continue;

    // 投影 → 隠線 → マージ
    const { segs, coincidence } = mergeUnits(projectEdges(vox).units);
    if (coincidence > P.coincidenceMax) continue; // 視線整列で線が濁る形は捨てる（読みやすさ優先）

    // 隠れ辺ポリシー
    const solidSegs = segs.filter((s) => s.style === "solid");
    const dashedSegs = segs.filter((s) => s.style === "dashed");
    let kept = segs;
    if (P.hidden === "none") kept = solidSegs;
    else if (P.hidden === "some") {
      // 「すこし（1〜2本）」は脈絡なく浮かせない：実線の端点に両端が接続する点線を
      // 最優先し、2 本目は 1 本目と頂点を共有するもの（＝背面コーナーの L 字）を選ぶ
      const pk = (p: [number, number]) => `${p[0]},${p[1]}`;
      const anchors = new Set(solidSegs.flatMap((s) => [pk(s.a), pk(s.b)]));
      const score = (s: ScreenSeg) =>
        (anchors.has(pk(s.a)) ? 10 : 0) + (anchors.has(pk(s.b)) ? 10 : 0) +
        Math.abs(s.b[0] - s.a[0]) + Math.abs(s.b[1] - s.a[1]);
      const ranked = [...dashedSegs].sort((p, q) => score(q) - score(p));
      const chosen: ScreenSeg[] = [];
      if (ranked.length > 0) chosen.push(ranked[0]);
      if (ranked.length > 1 && randInt(rng, 1, 2) === 2) {
        const ends = new Set([pk(ranked[0].a), pk(ranked[0].b)]);
        const mate = ranked.slice(1).find((s) => ends.has(pk(s.a)) || ends.has(pk(s.b)));
        chosen.push(mate ?? ranked[1]);
      }
      kept = [...solidSegs, ...chosen];
    } else if (P.hidden === "full") {
      // 点線が実線を圧すと図が濁る（読みやすさ優先）
      if (solidSegs.length === 0 || dashedSegs.length / solidSegs.length > P.hiddenRatioMax) continue;
    }
    const visibleCount = kept.filter((s) => s.style === "solid").length;
    if (visibleCount < 6) continue; // 見える線が少なすぎる形は成立しない

    // 盤面配置（su は上向き→ r へ反転・中央寄せ）
    let minSc = Infinity, maxSc = -Infinity, minSu = Infinity, maxSu = -Infinity;
    for (const s of kept) {
      for (const [sc, su] of [s.a, s.b]) {
        minSc = Math.min(minSc, sc); maxSc = Math.max(maxSc, sc);
        minSu = Math.min(minSu, su); maxSu = Math.max(maxSu, su);
      }
    }
    const W = maxSc - minSc, H = maxSu - minSu;
    if (W + 1 > boardMax || H + 1 > boardMax) continue;
    if (W < 3 || H < 2) continue; // 平板・棒すぎる形は退屈
    const cols = Math.max(P.board[0], W + 1);
    const rows = Math.max(P.board[0], H + 1);
    const offC = Math.floor((cols - 1 - W) / 2);
    const offR = Math.floor((rows - 1 - H) / 2);
    const edges: SolidEdge[] = kept.map((s) => ({
      a: { c: offC + (s.a[0] - minSc), r: offR + (maxSu - s.a[1]) },
      b: { c: offC + (s.b[0] - minSc), r: offR + (maxSu - s.b[1]) },
      style: s.style,
    }));

    // メトリクス・難易度窓・かぶり
    const metrics = computeSolidMetrics(edges);
    if (metrics.lines < linesBand[0] || metrics.lines > linesBand[1]) continue;
    const D = baseDifficulty(metrics) + 3 * (metrics.hiddenLines ?? 0);
    if (D < P.D[0] || D > P.D[1]) continue;
    const sig = solidSignature(edges);
    if (seen.has(sig)) continue;
    seen.add(sig);
    famCount.set(family, (famCount.get(family) ?? 0) + 1);
    if (fullBox) boxCount++;

    accepted.push({
      D,
      problem: {
        id: `${sku}-s${seed}-${String(accepted.length + 1).padStart(2, "0")}`,
        grid: { type: "solid", cols, rows },
        edges: [],
        solidEdges: edges,
        metrics,
        gen: {
          kind: "auto", generator: "solid-voxel", version: SOLID_GENERATOR_VERSION, seed,
          variant: family,
        },
      },
    });
  }

  return accepted.sort((a, b) => a.D - b.D).map((a) => a.problem);
}
