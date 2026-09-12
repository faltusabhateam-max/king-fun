"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Pair = {
  pairAddress: string;
  dexId: string;
  baseToken: { address: string; symbol: string; name: string };
  priceNative: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  url?: string;
};

export default function DiscoverPage() {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/discover");
        const data = await res.json();
        setPairs(data.pairs || []);
        setError(data.error || (!data.ok ? "No MEME/ETH pairs returned" : null));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Discover failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">Discover</h1>
        <p className="text-sm text-[var(--muted)]">
          Real MEME/ETH pairs on Robinhood (DexScreener). No fake boards.
        </p>
      </div>
      {loading && <p className="text-sm text-[var(--muted)]">Loading…</p>}
      {error && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {error}. Paste a CA on Trade to load from chain.
        </p>
      )}
      <div className="overflow-x-auto kf-panel">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--cut)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2">Token</th>
              <th className="px-3 py-2">Price (ETH)</th>
              <th className="px-3 py-2">Vol 24h</th>
              <th className="px-3 py-2">Liq USD</th>
              <th className="px-3 py-2">DEX</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((p) => (
              <tr key={p.pairAddress} className="border-b border-[var(--cut)]/50">
                <td className="px-3 py-2 font-bold">
                  {p.baseToken.symbol}
                  <div className="text-[10px] font-normal text-[var(--muted)]">
                    {p.baseToken.name}
                  </div>
                </td>
                <td className="px-3 py-2 font-mono">
                  {Number(p.priceNative).toPrecision(6)}
                </td>
                <td className="px-3 py-2">{p.volume?.h24?.toFixed?.(0) ?? "—"}</td>
                <td className="px-3 py-2">{p.liquidity?.usd?.toFixed?.(0) ?? "—"}</td>
                <td className="px-3 py-2">{p.dexId}</td>
                <td className="px-3 py-2">
                  <Link
                    className="text-[var(--accent)] underline"
                    href={`/?ca=${p.baseToken.address}`}
                  >
                    Trade
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && pairs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[var(--muted)]">
                  No pairs loaded — indexer unavailable or empty.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
