"use client";

/* モバイル用ハンバーガーメニュー（≤720px で表示）。カートはこのメニューの外＝
   ヘッダ右に残す（SiteHeader 側）。ドロワーはヘッダ直下に全幅で開く。
   中身は catalog GROUPS 駆動で「すべてのプリント＋3群×タスク＋主要リンク」。
   開閉は display トグル（環境依存のアニメ凍結を回避）。 */

import { useEffect, useRef, useState } from "react";
import type { MenuGroup } from "./PrintsMenu";

type NavLink = { href: string; label: string };

export default function MobileNav({
  groups, kinds, vol, links, currentNav,
}: { groups: MenuGroup[]; kinds: number; vol: number; links: NavLink[]; currentNav?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const close = () => setOpen(false);

  return (
    <div className={`mnav${open ? " is-open" : ""}`} ref={ref}>
      <button
        type="button"
        className="nav-burger"
        aria-label={open ? "メニューを閉じる" : "メニューを開く"}
        aria-expanded={open}
        aria-controls="mobile-drawer"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="nav-burger-bars" aria-hidden="true" />
      </button>

      <div id="mobile-drawer" className="nav-drawer" role="menu" aria-label="メニュー">
        <a className="nav-drawer-all" href="/products" role="menuitem" onClick={close}>
          <span className="nav-drawer-all-t">すべてのプリント</span>
          <span className="nav-drawer-all-s">{kinds} 種 ・ 全 {vol} 巻 ・ ¥200</span>
        </a>
        {groups.map((g) => (
          <div className="nav-drawer-group" key={g.label}>
            <p className="nav-drawer-h">{g.label}</p>
            <div className="nav-drawer-tasks">
              {g.tasks.map((t) => (
                <a key={t.slug} href={`/products/${t.slug}`} role="menuitem" onClick={close}>
                  {t.name}
                </a>
              ))}
            </div>
          </div>
        ))}
        <div className="nav-drawer-links">
          {links.map((l) => (
            <a key={l.label} href={l.href} role="menuitem"
              aria-current={l.label === currentNav ? "page" : undefined}
              onClick={close}>
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
