"use client";

import { useEffect, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { PageTransition } from "@/components/PageTransition";
import { formatSol, shortAddr } from "@/lib/format";
import type { LaunchRecord, TradeRecord } from "@/lib/types";
import { Coins } from "lucide-react";

export default function FeesPage() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const [launches, setLaunches] = useState<LaunchRecord[]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!address) return;
    (async () => {
      const [lRes, tRes] = await Promise.all([
        fetch("/api/launches"),
        fetch("/api/trades"),
      ]);
      const lData = await lRes.json();
      const tData = await tRes.json();
      const mine = (lData.launches || []).filter(
        (l: LaunchRecord) =>
          l.creator.toLowerCase() === address.toLowerCase()
      ) as LaunchRecord[];
      const mints = new Set(mine.map((m) => m.mint));
      const myTrades = (tData.trades || []).filter((t: TradeRecord) =>
        mints.has(t.mint)
      ) as TradeRecord[];
      setLaunches(mine);
      setTrades(myTrades);
      setTotal(myTrades.reduce((s, t) => s + (t.creatorFeeSol || 0), 0));
    })();
  }, [address]);

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#e8eee9]">Creator Fees</h1>
        <p className="mt-2 text-[#e8eee9]/55">
          Fee % on your launches and estimated earnings from stored curve trades
        </p>
      </div>

      {!isConnected || !address ? (
        <div className="king-panel flex flex-col items-center gap-4 p-12 text-center">
          <Coins className="text-[#00e88f]" size={36} />
          <p className="text-[#e8eee9]/70">Connect to view your creator fees</p>
          <button type="button" className="king-btn-primary" onClick={() => open()}>
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          <div className="king-panel mb-6 grid gap-4 p-5 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase text-[#e8eee9]/40">Creator</div>
              <div className="mt-1 font-mono text-sm text-[#00e88f]">
                {shortAddr(address, 6)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-[#e8eee9]/40">Launches</div>
              <div className="mt-1 text-2xl font-bold">{launches.length}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-[#e8eee9]/40">
                Est. fees earned
              </div>
              <div className="mt-1 text-2xl font-bold text-[#00e88f]">
                {formatSol(total)}
              </div>
            </div>
          </div>

          <h2 className="mb-3 text-lg font-semibold">Your launches</h2>
          {launches.length === 0 ? (
            <div className="king-panel p-8 text-center text-[#e8eee9]/50">
              No launches yet — create one on the Launch page.
            </div>
          ) : (
            <div className="mb-8 space-y-3">
              {launches.map((l) => (
                <div key={l.id} className="king-panel flex items-center gap-3 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={l.image || "/logo.png"}
                    alt=""
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="font-medium">
                      {l.name}{" "}
                      <span className="text-[#e8eee9]/45">${l.symbol}</span>
                    </div>
                    <div className="text-xs text-[#e8eee9]/45">
                      Fee {(l.creatorFeeBps / 100).toFixed(2)}% ·{" "}
                      {l.onChainMint ? "On-chain mint" : "Recorded"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="mb-3 text-lg font-semibold">Recent fee events</h2>
          {trades.length === 0 ? (
            <div className="king-panel p-8 text-center text-[#e8eee9]/50">
              No trades on your curves yet.
            </div>
          ) : (
            <div className="overflow-x-auto king-panel">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-emerald-400/15 text-[#e8eee9]/45">
                  <tr>
                    <th className="p-3">Side</th>
                    <th className="p-3">Mint</th>
                    <th className="p-3">Fee</th>
                    <th className="p-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 40).map((t) => (
                    <tr key={t.id} className="border-b border-emerald-400/5">
                      <td className="p-3 capitalize">{t.side}</td>
                      <td className="p-3 font-mono text-xs">
                        {shortAddr(t.mint)}
                      </td>
                      <td className="p-3 text-[#00e88f]">
                        {formatSol(t.creatorFeeSol)}
                      </td>
                      <td className="p-3 text-[#e8eee9]/45">
                        {new Date(t.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </PageTransition>
  );
}
