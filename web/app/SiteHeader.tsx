import CartBadge from "./cart/CartBadge";

type NavKey = "商品" | "メーカー" | "記事" | "レベル選び" | "About";

const NAV_LINKS: { href: string; label: NavKey }[] = [
  { href: "/products", label: "商品" },
  { href: "/makers",   label: "メーカー" },
  { href: "/articles", label: "記事" },
  { href: "/level-guide", label: "レベル選び" },
  { href: "#",       label: "About" },
];

export default function SiteHeader({ currentNav }: { currentNav?: NavKey }) {
  return (
    <header className="site">
      <div className="wrap header-inner">
        <a className="logo-cluster" href="/" aria-label="TENZU ホーム">
          <img className="logo-img" src="/assets/logo-horizontal.png" alt="TENZU" />
          <p className="ident">点図形（点描写）<br />プリントの専門店</p>
        </a>
        <nav className="nav-main" aria-label="主要ナビゲーション">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href}
              aria-current={l.label === currentNav ? "page" : undefined}>
              {l.label}
            </a>
          ))}
        </nav>
        <CartBadge />
      </div>
    </header>
  );
}
