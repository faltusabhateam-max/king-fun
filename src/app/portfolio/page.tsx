"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { PageTransition } from "@/components/PageTransition";
import { formatSol, formatNumber, shortAddr } from "@/lib/format";
import { Wallet } from "lucide-react";

interface PortfolioData {
  sol: number;
  tokens: Array<{
    mint: string;
    amount: number;
    decimals: number;
    name?: string;
    symbol?: string;
    image?: string;
  }>;
}

export default function PortfolioPage() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setData(null);
      return;
    }
    setLoading(true);
    fetch(`/api/portfolio?address=${address}`)
      .then((r) => r.json())
      .then((d) => setData({ sol: d.sol ?? 0, tokens: d.tokens ?? [] }))
      .catch(() => setData({ sol: 0, tokens: [] }))
      .finally(() => setLoading(false));
  }, [address]);

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#e8eee9]">Portfolio</h1>
        <p className="mt-2 text-[#e8eee9]/55">
          Live Solana balances for your connected wallet
        </p>
      </div>

      {!isConnected || !address ? (
        <div className="king-panel flex flex-col items-center gap-4 p-12 text-center">
          <Wallet className="text-[#00e88f]" size={36} />
          <p className="text-[#e8eee9]/70">Connect a wallet to view balances</p>
          <button type="button" className="king-btn-primary" onClick={() => open()}>
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          <div className="king-panel mb-6 p-5">
            <div className="text-xs uppercase tracking-wider text-[#e8eee9]/40">
              Wallet
            </div>
            <div className="mt-1 font-mono text-sm text-[#00e88f]">
              {shortAddr(address, 6)}
            </div>
            <div className="mt-4 text-3xl font-bold text-[#e8eee9]">
              {loading ? "…" : formatSol(data?.sol ?? 0)}
            </div>
            <div className="text-sm text-[#e8eee9]/45">SOL balance</div>
          </div>

          <h2 className="mb-3 text-lg font-semibold">Token holdings</h2>
          {loading ? (
            <div className="king-panel h-24 animate-pulse" />
          ) : !data?.tokens?.length ? (
            <div className="king-panel p-8 text-center text-[#e8eee9]/50">
              0 tokens — empty portfolio is fine. Launch or explore to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {data.tokens.map((t) => (
                <Link
                  key={t.mint}
                  href={`/token/${t.mint}`}
                  className="king-panel king-glow-card flex items-center gap-3 p-4"
                >
                  <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-emerald-400/20 bg-[#00140c]">
                    {t.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[#00e88f]">
                        $
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {t.name || shortAddr(t.mint)}
                    </div>
                    <div className="text-xs text-[#e8eee9]/45">
                      {t.symbol || "TOKEN"}
                    </div>
                  </div>
                  <div className="text-right font-semibold">
                    {formatNumber(t.amount)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </PageTransition>
  );
}
