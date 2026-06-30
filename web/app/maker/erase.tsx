"use client";

/* =========================================================================
   消す（消しゴム）モード — 全メーカー共通部品
   各メーカーの PaperSVG は「点クリックで線を引く」自前実装だが、線の削除手段が
   undo しかなかった。消すモードでは「線をクリック＝その1本を削除」できる。
   - EdgeHitLayer: 辺の上に重ねる透明クリックレイヤ（点ヒットより上＝消すモード時のみ描画）
   - ModeToggle:   quickbar 用の「描く / 消す」トグル（qb-group）
   ホバー時の赤帯予告は maker.css の .erase-hit:hover（.maker-page 配下）で付ける。
   ========================================================================= */

type Pt2 = { c: number; r: number };
type HasAB = { a: Pt2; b: Pt2 };

// 辺の上に重ねる透明な太線。消すモードのときだけ親が描画する。
// pos: 格子座標(c,r)→SVG座標。step を渡すと格子間隔に応じてヒット幅を調整（密な盤面向け）。
export function EdgeHitLayer<E extends HasAB>({
  edges, pos, onErase, step,
}: {
  edges: E[];
  pos: (c: number, r: number) => { x: number; y: number };
  onErase: (index: number) => void;
  step?: number;
}) {
  const w = step && step > 0 ? Math.max(6, step * 0.7) : 9;
  return (
    <>
      {edges.map((e, i) => {
        const a = pos(e.a.c, e.a.r), b = pos(e.b.c, e.b.r);
        return (
          <line key={`eh${i}`} className="erase-hit"
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke="transparent" strokeWidth={w} strokeLinecap="round"
            style={{ cursor: "pointer" }}
            onClick={() => onErase(i)}
          />
        );
      })}
    </>
  );
}

// quickbar の「描く / 消す」モードトグル。erase=true で消すモード。
export function ModeToggle({
  erase, onChange, disabled,
}: {
  erase: boolean;
  onChange: (erase: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="qb-group">
      <span className="qb-label">モード</span>
      <div className="seg qb-seg modeseg" role="group" aria-label="モード">
        <button type="button" aria-pressed={!erase} disabled={disabled}
          onClick={() => onChange(false)}>描く</button>
        <button type="button" aria-pressed={erase} disabled={disabled}
          onClick={() => onChange(true)}>消す</button>
      </div>
    </div>
  );
}
