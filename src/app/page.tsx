import { TradeTerminal } from "@/components/terminal/TradeTerminal";

export default async function TradePage({
  searchParams,
}: {
  searchParams: Promise<{ ca?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-black tracking-tight sm:text-2xl">
            Trade <span className="text-[var(--accent)]">TOKEN/ETH</span>
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Paste any meme CA · Buy with ETH / Sell for ETH · Uniswap · no paper mode
          </p>
        </div>
      </div>
      <TradeTerminal initialCa={sp.ca || ""} />
    </div>
  );
}
