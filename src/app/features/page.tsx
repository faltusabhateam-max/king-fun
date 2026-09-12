import Link from "next/link";

const GROUPS = [
  {
    title: "Live now (on-chain)",
    items: [
      { href: "/trade", label: "TOKEN/ETH spot (any CA, Uniswap V2/V3)" },
      { href: "/trade", label: "Paste CA → chart → Buy with ETH / Sell for ETH" },
      { href: "/trade", label: "Live trades tape + B/S markers from Swap events" },
      { href: "/discover", label: "Discover TOKEN/ETH pairs" },
      { href: "/portfolio", label: "Wallet · CA search · holdings · risk badge" },
      { href: "/alerts", label: "Price alerts (up/down % on watchlist)" },
      { href: "/leverage", label: "KingMarginVault leverage" },
      { href: "/about", label: "About / risk" },
    ],
  },
  {
    title: "Roadmap",
    items: [
      { href: "/features", label: "Social copy-trading feed" },
      { href: "/features", label: "Multi-hop MEV-protected routing" },
      { href: "/features", label: "Funding-rate perps venue" },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-black">Features</h1>
      <p className="text-sm text-[var(--muted)]">
        Prefer fewer real features over fake boards. Everything listed is
        reachable; unavailable feeds say so explicitly.
      </p>
      {GROUPS.map((g) => (
        <section key={g.title} className="kf-panel p-4">
          <h2 className="mb-2 font-bold text-[var(--accent)]">{g.title}</h2>
          <ul className="space-y-1 text-sm">
            {g.items.map((it) => (
              <li key={it.label}>
                <Link href={it.href} className="hover:text-[var(--accent)]">
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
