import Link from "next/link";

const GROUPS = [
  {
    title: "Live now (on-chain)",
    items: [
      { href: "/", label: "MEME/ETH spot trade (Uniswap V2/V3)" },
      { href: "/", label: "Paste CA → ERC20 + pool resolve" },
      { href: "/", label: "Quotes + wallet-signed swaps" },
      { href: "/", label: "Candles from V2 Swap logs" },
      { href: "/discover", label: "Discover MEME/ETH (DexScreener)" },
      { href: "/portfolio", label: "Wallet ETH + token balances" },
      { href: "/alerts", label: "Local alerts vs on-chain mark" },
      { href: "/calculators", label: "PnL / liq / fee calculators" },
      { href: "/points", label: "Points from wallet nonce" },
      { href: "/about", label: "About / risk" },
      { href: "/leverage", label: "Margin vault docs + deploy path" },
    ],
  },
  {
    title: "Needs indexer / infra",
    items: [
      { href: "/smart-money", label: "Smart money tracker" },
      { href: "/whales", label: "Whale boards" },
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
