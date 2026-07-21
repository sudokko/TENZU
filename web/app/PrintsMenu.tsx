"use client";

/* ヘッダ「プリントを探す」プルダウン（catalog GROUPS 駆動）。
   PC: ホバー＋クリックで開閉／モバイル: タップで開閉（CSS で全幅展開）。
   データ（群・タスク）は SiteHeader（サーバー）が GROUPS から渡す＝SSOT 維持・
   Fig 関数はクライアント境界に載せない。 */

import { useEffect, useRef, useState } from "react";

export type MenuGroup = { label: string; tasks: { slug: string; name: string; desc: string }[] };

export default function PrintsMenu({
  groups, kinds, vol, active,
}: { groups: MenuGroup[]; kinds: number; vol: number; active?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 開くたびに、画面右端をはみ出す分だけパネルを左へずらす（トリガー直下を維持したまま溢れ防止）
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (!open || window.innerWidth <= 720) { panel.style.left = ""; return; }
    panel.style.left = "0px";
    const margin = 16;
    const overflow = panel.getBoundingClientRect().right - (window.innerWidth - margin);
    if (overflow > 0) panel.style.left = `${-overflow}px`;
  }, [open]);

  return (
    <div
      className={`pmenu${open ? " is-open" : ""}`}
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="pmenu-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-current={active ? "page" : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        プリントを探す
        <span className="pmenu-caret" aria-hidden="true" />
      </button>

      <div className="pmenu-panel" role="menu" aria-label="プリントを探す" ref={panelRef}>
        <a className="pmenu-all" href="/products" role="menuitem">
          <span className="pmenu-all-t">すべてのプリント</span>
          <span className="pmenu-all-s">{kinds} 種 ・ 全 {vol} 巻 ・ ¥200 一律</span>
        </a>
        <div className="pmenu-cols">
          {groups.map((g) => (
            <div className="pmenu-col" key={g.label}>
              <p className="pmenu-h">{g.label}</p>
              {g.tasks.map((t) => (
                <a className="pmenu-tk" href={`/products/${t.slug}`} role="menuitem" key={t.slug}>
                  <span className="pmenu-nm">{t.name}</span>
                  <span className="pmenu-ds">{t.desc}</span>
                </a>
              ))}
            </div>
          ))}
        </div>
        <a className="pmenu-mk" href="/makers" role="menuitem">
          ぴったりが無ければ、<b>自分で作る → メーカー</b>
        </a>
      </div>
    </div>
  );
}
