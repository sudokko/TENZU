import CartBadge from "./cart/CartBadge";
import PrintsMenu, { type MenuGroup } from "./PrintsMenu";
import MobileNav from "./MobileNav";
import { GROUPS, TOTAL_KINDS, TOTAL_VOL } from "./catalog";

type NavKey = "プリントを探す" | "メーカー" | "記事" | "レベル選び" | "About" | "お問い合わせ";

const NAV_LINKS: { href: string; label: Exclude<NavKey, "プリントを探す"> }[] = [
  { href: "/makers",   label: "メーカー" },
  { href: "/articles", label: "記事" },
  { href: "/level-guide", label: "レベル選び" },
  { href: "/articles/tenzu-concept", label: "About" },
  { href: "/contact", label: "お問い合わせ" },
];

export default function SiteHeader({ currentNav }: { currentNav?: NavKey }) {
  const menu: MenuGroup[] = GROUPS.map((g) => ({
    label: g.label,
    tasks: g.tasks.map((t) => ({ slug: t.slug, name: t.name, desc: t.desc })),
  }));
  return (
    <header className="site">
      <div className="wrap header-inner">
        <a className="logo-cluster" href="/" aria-label="TENZU ホーム">
          <img className="logo-img" src="/assets/logo-horizontal.png" alt="TENZU" />
          <p className="ident">点図形（点描写）<br />プリントの専門店</p>
        </a>
        <nav className="nav-main" aria-label="主要ナビゲーション">
          <PrintsMenu groups={menu} kinds={TOTAL_KINDS} vol={TOTAL_VOL}
            active={currentNav === "プリントを探す"} />
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href}
              aria-current={l.label === currentNav ? "page" : undefined}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="header-right">
          <CartBadge />
          <MobileNav groups={menu} kinds={TOTAL_KINDS} vol={TOTAL_VOL}
            links={NAV_LINKS} currentNav={currentNav} />
        </div>
      </div>
    </header>
  );
}
