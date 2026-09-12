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
            Trade <span className="text-[var(--accent)]">MEME/ETH</span>
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Robinhood Chain · Uniswap · real wallet txs · no paper mode
          </p>
        </div>
      </div>
      <TradeTerminal initialCa={sp.ca || ""} />
    </div>
  );
}
