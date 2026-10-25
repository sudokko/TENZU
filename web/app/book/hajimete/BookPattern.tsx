/** 受取ボタンとメーカー紹介で使う点図形の模式図。問題データとは分離する。 */
export default function BookPattern({ kind = "problem", label }: { kind?: "problem" | "answer" | "maker"; label?: string }) {
  return <svg className={`book-pattern book-pattern--${kind}`} viewBox="0 0 84 88"
    role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    {Array.from({ length: 16 }, (_, i) => <circle key={i} cx={12 + (i % 4) * 20} cy={12 + Math.floor(i / 4) * 20} r={1.5} fill="currentColor" />)}
    <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 72V32L32 12 72 52V72H12" />
      {kind === "problem" && <path d="M12 72 32 52 72 72" />}
      {kind !== "problem" && <path className="book-pattern-finished" d="M32 72V52H52V72" />}
      {kind === "maker" && <circle className="book-pattern-finished" cx={52} cy={52} r={5} strokeWidth={1} />}
    </g>
  </svg>;
}
