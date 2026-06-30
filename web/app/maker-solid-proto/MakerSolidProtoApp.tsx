"use client";

/* =========================================================================
   立体模写メーカー — C案プロトタイプ（/maker-solid-proto・本番未連携）
   ---------------------------------------------------------------------------
   ★点描写プリントとして再構成版★
   平面模写メーカー（正方ドット格子＋線）の「立体版」。紙は等角の三角ドット格子
   （アイソメトリック・ドットペーパー）で、立体は面塗りソリッドではなく
   「点と点を結ぶ稜線の線画」で描く＝これが点描写。

   組み立て手段は C案（アイソメ直接配置）を維持：
     ・床マスをタップ        → z=0 にブロックを置く
     ・ブロックの天面をタップ → その上（z+1）に積む
     ・ブロックの側面をタップ → その向きの隣（同じ高さ）に置く ＝ 橋・張り出し
     ・「消す」モード          → どの面でも、そのブロックを消す
     ・視点回転（◀▶）         → 90°ずつ。奥に隠れたブロックを出して触る

   出力イメージ＝平面模写と同じ「お手本／かくマス」2ペイン（線画＋空白格子）。
   隠れ線トグル＝裏の稜線を点線で見せる（難易度ドライバー）。

   本番方針との切り分け：保存・PDF 書き出し・所有ゲート・自動カタログ化は未配線。
   ここで確かめるのは「C案で点描写の立体お手本が破綻なく作れるか」だけ。
   ========================================================================= */

import { useEffect, useMemo, useState } from "react";

// ---- 投影定数（2:1 アイソメ）。i,j は格子頂点（0..N）、k は段（0..GRIDH）---------
const HW = 26; // 格子の半幅（i-j 方向）
const HH = 15; // 格子の半高（i+j 方向）
const CH = 30; // 1 段の高さ（k 方向）
const PAD = 18;
const GRIDH = 5; // ドット格子の段数（紙面に出す点の高さ範囲）
const ZCAP = 6;

const INK = "#3A424E";
const ACCENT = "#2C6E7F"; // teal＝完成形/解答（rev.5：到達のみ）
const DOT = "rgba(58,66,78,0.34)";

type Vox = { x: number; y: number; z: number };
const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
const parse = (k: string): Vox => {
  const [x, y, z] = k.split(",").map(Number);
  return { x, y, z };
};

// footprint 回転：正準 (x,y) ⇔ 表示 (dx,dy)
function rot(x: number, y: number, n: number, r: number): [number, number] {
  switch (((r % 4) + 4) % 4) {
    case 1: return [y, n - 1 - x];
    case 2: return [n - 1 - x, n - 1 - y];
    case 3: return [n - 1 - y, x];
    default: return [x, y];
  }
}
function invRot(dx: number, dy: number, n: number, r: number): [number, number] {
  switch (((r % 4) + 4) % 4) {
    case 1: return [n - 1 - dy, dx];
    case 2: return [n - 1 - dx, n - 1 - dy];
    case 3: return [dy, n - 1 - dx];
    default: return [dx, dy];
  }
}

type Tri = [number, number, number]; // 格子頂点 [i,j,k]
type Edge = [Tri, Tri];

export default function MakerSolidProtoApp() {
  const [n, setN] = useState<number>(4);
  const [voxels, setVoxels] = useState<Set<string>>(
    () => new Set([key(1, 1, 0), key(2, 1, 0), key(1, 2, 0), key(1, 1, 1)]),
  );
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [view, setView] = useState<number>(0);
  const [answerColor, setAnswerColor] = useState<boolean>(false);
  const [showHidden, setShowHidden] = useState<boolean>(false);
  const [history, setHistory] = useState<string[][]>([]);

  useEffect(() => {
    document.body.classList.add("maker-page");
    return () => document.body.classList.remove("maker-page");
  }, []);

  function changeN(next: number) {
    if (next === n) return;
    setHistory((h) => [...h, [...voxels]]);
    setN(next);
    setVoxels(new Set());
  }
  function mutate(fn: (s: Set<string>) => void) {
    setVoxels((prev) => {
      const next = new Set(prev);
      fn(next);
      if (next.size === prev.size && [...next].every((k) => prev.has(k))) return prev;
      setHistory((h) => [...h, [...prev]]);
      return next;
    });
  }
  const inFoot = (x: number, y: number) => x >= 0 && x < n && y >= 0 && y < n;
  const addAt = (x: number, y: number, z: number) =>
    mutate((s) => { if (inFoot(x, y) && z >= 0 && z <= ZCAP) s.add(key(x, y, z)); });
  const removeAt = (x: number, y: number, z: number) =>
    mutate((s) => { s.delete(key(x, y, z)); });

  // 表示(dx,dy) → 正準へ戻して追加
  const addDisplay = (dx: number, dy: number, z: number) => {
    const [x, y] = invRot(dx, dy, n, view);
    addAt(x, y, z);
  };
  function onTop(dx: number, dy: number, z: number) {
    if (mode === "remove") return removeAt(...invRot(dx, dy, n, view), z);
    addDisplay(dx, dy, z + 1);
  }
  function onSide(dx: number, dy: number, z: number, dir: "left" | "right") {
    if (mode === "remove") return removeAt(...invRot(dx, dy, n, view), z);
    if (dir === "left") addDisplay(dx, dy + 1, z);
    else addDisplay(dx + 1, dy, z);
  }
  function onFloor(dx: number, dy: number) {
    if (mode === "remove") return;
    addDisplay(dx, dy, 0);
  }
  function undo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      setVoxels(new Set(h[h.length - 1]));
      return h.slice(0, -1);
    });
  }
  function clearAll() {
    if (voxels.size === 0) return;
    setHistory((h) => [...h, [...voxels]]);
    setVoxels(new Set());
  }

  // ---- ビューボックス -------------------------------------------------------
  const OX = n * HW + PAD;
  const OY = GRIDH * CH + PAD;
  const VBW = 2 * n * HW + 2 * PAD;
  const VBH = OY + 2 * n * HH + PAD;
  const P = (i: number, j: number, k: number): [number, number] =>
    [OX + (i - j) * HW, OY + (i + j) * HH - k * CH];

  // ---- 表示座標のボクセル集合（回転を吸収）--------------------------------
  const dset = useMemo(() => {
    const s = new Set<string>();
    voxels.forEach((k) => {
      const { x, y, z } = parse(k);
      const [dx, dy] = rot(x, y, n, view);
      s.add(key(dx, dy, z));
    });
    return s;
  }, [voxels, n, view]);

  // ---- ドット格子（点描写の「点」）----------------------------------------
  const dots = useMemo(() => {
    const seen = new Set<string>();
    const out: [number, number][] = [];
    for (let k = 0; k <= GRIDH; k++)
      for (let i = 0; i <= n; i++)
        for (let j = 0; j <= n; j++) {
          const [px, py] = P(i, j, k);
          const id = `${px.toFixed(1)},${py.toFixed(1)}`;
          if (seen.has(id)) continue;
          seen.add(id);
          out.push([px, py]);
        }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  // ---- 稜線抽出（可視＝実線／全＝隠れ線用）--------------------------------
  const { vis, hiddenOnly } = useMemo(() => {
    const visM = new Map<string, Edge>();
    const allM = new Map<string, Edge>();
    const ekey = (a: Tri, b: Tri) => {
      const A = a.join("_"), B = b.join("_");
      return A < B ? `${A}|${B}` : `${B}|${A}`;
    };
    const corners: Tri[] = [
      [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
      [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
    ];
    const CE = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    dset.forEach((k) => {
      const { x: dx, y: dy, z } = parse(k);
      const V = (c: Tri): Tri => [dx + c[0], dy + c[1], z + c[2]];
      for (const [a, b] of CE) {
        const ca = V(corners[a]), cb = V(corners[b]);
        allM.set(ekey(ca, cb), [ca, cb]);
      }
      const faces: Tri[][] = [];
      if (!dset.has(key(dx, dy, z + 1))) faces.push([[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]); // 天面
      if (!dset.has(key(dx, dy + 1, z))) faces.push([[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]]); // 左面(+dy)
      if (!dset.has(key(dx + 1, dy, z))) faces.push([[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]]); // 右面(+dx)
      for (const f of faces)
        for (let i = 0; i < 4; i++) {
          const a = V(f[i] as Tri), b = V(f[(i + 1) % 4] as Tri);
          visM.set(ekey(a, b), [a, b]);
        }
    });
    const visKeys = new Set(visM.keys());
    const hidden: Edge[] = [];
    allM.forEach((e, k) => { if (!visKeys.has(k)) hidden.push(e); });
    return { vis: [...visM.values()], hiddenOnly: hidden };
  }, [dset, n, view]);

  // ---- クリック用の可視面（透明ポリゴン）。painter 順で手前を後に -------------
  const clickFaces = useMemo(() => {
    const arr = [...dset].map((k) => parse(k));
    arr.sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.z - b.z || a.x - b.x);
    const out: { pts: string; kind: "top" | "left" | "right"; dx: number; dy: number; z: number }[] = [];
    for (const { x: dx, y: dy, z } of arr) {
      const poly = (cs: Tri[]) =>
        cs.map((c) => P(dx + c[0], dy + c[1], z + c[2]).join(",")).join(" ");
      if (!dset.has(key(dx, dy, z + 1)))
        out.push({ kind: "top", dx, dy, z, pts: poly([[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]) });
      if (!dset.has(key(dx, dy + 1, z)))
        out.push({ kind: "left", dx, dy, z, pts: poly([[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]]) });
      if (!dset.has(key(dx + 1, dy, z)))
        out.push({ kind: "right", dx, dy, z, pts: poly([[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]]) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dset, n, view]);

  // 床マス（空セルに置く・最背面）
  const floor = useMemo(() => {
    const out: { dx: number; dy: number; pts: string }[] = [];
    for (let dx = 0; dx < n; dx++)
      for (let dy = 0; dy < n; dy++) {
        const pts = ([[0, 0], [1, 0], [1, 1], [0, 1]] as [number, number][])
          .map(([a, b]) => P(dx + a, dy + b, 0).join(",")).join(" ");
        out.push({ dx, dy, pts });
      }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  // ---- 立体メタ（難易度式の素地）------------------------------------------
  const meta = useMemo(() => {
    const count = voxels.size;
    let hidden = 0, floating = false, maxZ = 0;
    voxels.forEach((k) => {
      const { x, y, z } = parse(k);
      maxZ = Math.max(maxZ, z + 1);
      if (voxels.has(key(x + 1, y, z))) hidden++;
      if (voxels.has(key(x, y + 1, z))) hidden++;
      if (voxels.has(key(x, y, z + 1))) hidden++;
      if (z > 0 && !voxels.has(key(x, y, z - 1))) floating = true;
    });
    const lv = count <= 5 ? 3 : count <= 10 ? 4 : 5;
    return { count, hidden, floating, maxZ, lv };
  }, [voxels]);

  const lineColor = answerColor ? ACCENT : INK;
  const path = (e: Edge) => {
    const [a, b] = e;
    const pa = P(a[0], a[1], a[2]), pb = P(b[0], b[1], b[2]);
    return `M${pa[0]},${pa[1]} L${pb[0]},${pb[1]}`;
  };

  return (
    <>
      <header className="maker-header">
        <div className="logo-cluster">
          <span className="app-name">
            立体メーカー
            <span className="small">PROTO · 点描写 / C案 アイソメ直接</span>
          </span>
        </div>
        <a className="btn-medium" href="/maker-index">← メーカー一覧</a>
      </header>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "20px 16px 64px" }}>
        <p style={{ fontFamily: "var(--font-tier3-sans)", fontSize: 12.5, color: "var(--fg-3)", lineHeight: 1.6, margin: "0 0 16px" }}>
          本番未連携の検証用。平面模写の立体版＝<b>等角ドット格子に稜線を描く点描写</b>を、C案（アイソメ直接配置）で組む試作です（保存・PDF・所有ゲートは未配線）。
        </p>

        {/* 操作バー */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", padding: "12px 14px", border: "1px dashed var(--line-thin)", borderRadius: "var(--radius-soft)", background: "var(--bg-3)", marginBottom: 18 }}>
          <Ctl label="盤面">
            <div className="seg" style={{ minWidth: 132 }}>
              {[3, 4, 5].map((v) => (<button key={v} aria-pressed={n === v} onClick={() => changeN(v)}>{v}×{v}</button>))}
            </div>
          </Ctl>
          <Ctl label="モード">
            <div className="seg" style={{ minWidth: 132 }}>
              <button aria-pressed={mode === "add"} onClick={() => setMode("add")}>置く</button>
              <button aria-pressed={mode === "remove"} onClick={() => setMode("remove")}>消す</button>
            </div>
          </Ctl>
          <Ctl label="視点">
            <div style={{ display: "flex", gap: 6 }}>
              <button className="iconbtn labeled" onClick={() => setView((view + 3) % 4)}>◀</button>
              <span style={{ fontFamily: "var(--font-tier3-mono)", fontSize: 12, color: "var(--fg-2)", minWidth: 56, textAlign: "center", alignSelf: "center" }}>{view * 90}°</span>
              <button className="iconbtn labeled" onClick={() => setView((view + 1) % 4)}>▶</button>
            </div>
          </Ctl>
          <div style={{ flex: 1 }} />
          <button className="iconbtn labeled" onClick={undo} disabled={history.length === 0}><span className="lbl">戻す</span></button>
          <button className="iconbtn labeled danger" onClick={clearAll} disabled={voxels.size === 0}><span className="lbl">全消去</span></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 248px", gap: 20, alignItems: "start" }}>
          {/* 作図盤面（点描写：ドット格子＋稜線線画）*/}
          <div style={{ background: "#fff", border: "1px solid var(--line-thin)", borderRadius: "var(--radius-soft)", boxShadow: "var(--shadow-paper)", padding: 8, minWidth: 0, overflow: "hidden" }}>
            <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{ width: "100%", height: "auto", display: "block", touchAction: "manipulation" }}>
              {/* ドット格子（紙の点）*/}
              {dots.map(([px, py], i) => (<circle key={`d${i}`} cx={px} cy={py} r={1.7} fill={DOT} pointerEvents="none" />))}
              {/* 床マス（空セルに置く）*/}
              {floor.map((f) => (
                <polygon key={`f${f.dx}-${f.dy}`} points={f.pts} fill="rgba(58,66,78,0.012)"
                  style={{ cursor: mode === "add" ? "pointer" : "default" }} onClick={() => onFloor(f.dx, f.dy)} />
              ))}
              {/* クリック用の可視面（透明・painter 順で手前優先）*/}
              {clickFaces.map((f, i) => (
                <polygon key={`c${i}`} points={f.pts} fill="rgba(0,0,0,0)" style={{ cursor: "pointer" }}
                  onClick={() => f.kind === "top" ? onTop(f.dx, f.dy, f.z) : onSide(f.dx, f.dy, f.z, f.kind)} />
              ))}
              {/* 隠れ線（点線・トグル）*/}
              {showHidden && hiddenOnly.map((e, i) => (
                <path key={`h${i}`} d={path(e)} fill="none" stroke={lineColor} strokeOpacity={0.4}
                  strokeWidth={1.3} strokeDasharray="3 3" strokeLinecap="round" pointerEvents="none" />
              ))}
              {/* 可視稜線（実線・点描写の線）*/}
              {vis.map((e, i) => (
                <path key={`v${i}`} d={path(e)} fill="none" stroke={lineColor}
                  strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
              ))}
            </svg>
          </div>

          {/* メタ＋トグル */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ border: "1px solid var(--line-thin)", borderRadius: "var(--radius-soft)", background: "var(--bg)", padding: "14px 16px" }}>
              <h3 style={{ fontFamily: "var(--font-tier3-mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-3)", margin: "0 0 10px", fontWeight: 400 }}>立体メタ</h3>
              <Stat label="ブロック数" value={`${meta.count}`} />
              <Stat label="高さ（段）" value={`${meta.maxZ}`} />
              <Stat label="隠れ面（接合）" value={`${meta.hidden}`} />
              <Stat label="抜け構造" value={meta.floating ? "あり" : "なし"} accent={meta.floating} />
              <div style={{ borderTop: "1px dashed var(--line-thin)", margin: "10px 0", paddingTop: 10 }}>
                <Stat label="Lv 目安" value={`Lv.${meta.lv}`} accent />
              </div>
            </div>
            <Toggle checked={showHidden} onChange={setShowHidden} label="隠れ線を点線で見せる" />
            <Toggle checked={answerColor} onChange={setAnswerColor} label="完成形プレビュー（解答色）" />
            <div className="onboarding-memo" style={{ marginTop: 0 }}>
              <div className="ml">C案を触ってみて</div>
              <p className="mb">
                床→天面→側面の順に積めます。側面タップは「隣に置く」＝橋や張り出しも作れる代わり、
                奥行きを取り違えやすいのが C 案の弱点。隠れて押せないブロックは視点（◀▶）を回して。
              </p>
            </div>
          </aside>
        </div>

        {/* 印刷イメージ＝お手本／かくマス（点描写プリントの姿）*/}
        <h3 style={{ fontFamily: "var(--font-tier3-mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-3)", margin: "30px 0 12px", fontWeight: 400 }}>
          印刷イメージ（点描写プリント）
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 14, alignItems: "center", maxWidth: 720 }}>
          <PrintPane title="おてほん" dots={dots} edges={vis} P={P} VBW={VBW} VBH={VBH} />
          <span style={{ fontFamily: "var(--font-tier1-klee)", fontSize: 22, color: "var(--fg-3)" }}>→</span>
          <PrintPane title="かくマス" dots={dots} edges={[]} P={P} VBW={VBW} VBH={VBH} />
        </div>
        <p style={{ fontFamily: "var(--font-tier2-pencil)", fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.8, margin: "10px 0 0", maxWidth: 720 }}>
          左の稜線（点をつないだ線）を見て、右の空白ドット格子に同じ立体を写す。これが立体の点描写プリント。PDF 書き出しは平面メーカーの仕組みを流用予定（このプロトでは未配線）。
        </p>
      </div>
    </>
  );
}

function PrintPane({ title, dots, edges, P, VBW, VBH }: {
  title: string; dots: [number, number][]; edges: Edge[];
  P: (i: number, j: number, k: number) => [number, number]; VBW: number; VBH: number;
}) {
  const d = (e: Edge) => {
    const a = P(e[0][0], e[0][1], e[0][2]), b = P(e[1][0], e[1][1], e[1][2]);
    return `M${a[0]},${a[1]} L${b[0]},${b[1]}`;
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
      <span style={{ fontFamily: "var(--font-tier3-sans)", fontSize: 12, fontWeight: 500, color: "var(--fg-2)" }}>{title}</span>
      <div style={{ width: "100%", background: "#fff", border: "1px solid var(--line-thin)", borderRadius: 2, boxShadow: "var(--shadow-paper)" }}>
        <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{ width: "100%", height: "auto", display: "block" }}>
          {dots.map(([px, py], i) => (<circle key={i} cx={px} cy={py} r={1.6} fill="rgba(58,66,78,0.32)" />))}
          {edges.map((e, i) => (<path key={i} d={d(e)} fill="none" stroke="#3A424E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />))}
        </svg>
      </div>
    </div>
  );
}

function Ctl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: "var(--font-tier3-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-3)" }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-tier3-sans)", fontSize: 13, color: "var(--fg-2)", border: "1px solid var(--line-thin)", borderRadius: "var(--radius-soft)", padding: "10px 12px" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: ACCENT }} />
      {label}
    </label>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "3px 0" }}>
      <span style={{ fontFamily: "var(--font-tier3-sans)", fontSize: 13, color: "var(--fg-2)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-tier3-mono)", fontSize: 14, color: accent ? ACCENT : "var(--fg)", fontWeight: accent ? 600 : 400 }}>{value}</span>
    </div>
  );
}
