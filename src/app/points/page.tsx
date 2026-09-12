"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import { useEffect, useState } from "react";
import { getRpc } from "@/lib/rpc";

/**
 * Points from real on-chain activity: count txs from connected wallet on RH.
 * No fake XP inflation — shows explorer-backed tx count when readable.
 */
export default function PointsPage() {
  const { address, isConnected } = useAppKitAccount();
  const [txCount, setTxCount] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    (async () => {
      try {
        const rpc = getRpc();
        const n = await rpc.getTransactionCount(address);
        setTxCount(n);
        setErr(null);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "RPC error");
      }
    })();
  }, [address]);

  const xp = txCount != null ? txCount * 10 : 0;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-black">Points</h1>
      <div className="kf-panel space-y-2 p-5 text-sm">
        {!isConnected ? (
          <p className="text-[var(--muted)]">Connect wallet to read on-chain tx count.</p>
        ) : (
          <>
            <p>
              Wallet nonce (tx count):{" "}
              <span className="font-mono text-[var(--accent)]">
                {txCount ?? "…"}
              </span>
            </p>
            <p>
              Simple XP = nonce × 10:{" "}
              <span className="font-mono">{xp}</span>
            </p>
            <p className="text-xs text-[var(--muted)]">
              Honest placeholder until a real indexer attributes Uniswap swap
              volume. No fabricated leaderboards.
            </p>
          </>
        )}
        {err && <p className="text-rose-300">{err}</p>}
      </div>
    </div>
  );
}
