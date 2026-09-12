"use client";

import { useEffect, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Contract, JsonRpcProvider } from "ethers";
import { PageTransition } from "@/components/PageTransition";
import { ROBINHOOD_RPC } from "@/lib/robinhood";
import CollectionArtifact from "@/lib/abi/KingNFTCollection.json";
import type { CollectionRecord } from "@/lib/types";
import { shortAddr } from "@/lib/format";
import Link from "next/link";
import { Wallet } from "lucide-react";

interface Holding {
  collection: CollectionRecord;
  balance: number;
  tokenIds: number[];
}

export default function PortfolioPage() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setHoldings([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/collections");
        const data = await res.json();
        const collections: CollectionRecord[] = data.collections || [];
        const provider = new JsonRpcProvider(ROBINHOOD_RPC);
        const next: Holding[] = [];
        for (const col of collections) {
          try {
            const c = new Contract(
              col.address,
              CollectionArtifact.abi,
              provider
            );
            const bal: bigint = await c.balanceOf(address);
            if (bal === BigInt(0)) continue;
            const tokenIds: number[] = [];
            const n = Number(bal);
            for (let i = 0; i < Math.min(n, 50); i++) {
              const id: bigint = await c.tokenOfOwnerByIndex(address, i);
              tokenIds.push(Number(id));
            }
            next.push({ collection: col, balance: n, tokenIds });
          } catch {
            /* skip broken */
          }
        }
        if (!cancelled) setHoldings(next);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConnected, address]);

  return (
    <PageTransition>
      <div className="mb-6 flex items-center gap-3">
        <Wallet className="text-[#00e88f]" size={26} />
        <div>
          <h1 className="text-2xl font-bold text-[#e8eee9]">Portfolio</h1>
          <p className="text-sm text-[#e8eee9]/55">
            NFTs you own on Robinhood Chain (from known king.fun collections)
          </p>
        </div>
      </div>

      {!isConnected ? (
        <div className="king-panel p-8 text-center">
          <p className="mb-4 text-sm text-[#e8eee9]/55">
            Connect a wallet to view your NFTs.
          </p>
          <button type="button" className="king-btn-primary" onClick={() => open()}>
            Connect Wallet
          </button>
        </div>
      ) : loading ? (
        <p className="text-sm text-[#e8eee9]/50">Scanning collections…</p>
      ) : error ? (
        <p className="text-sm text-amber-200">{error}</p>
      ) : holdings.length === 0 ? (
        <div className="king-panel p-8 text-center text-sm text-[#e8eee9]/55">
          No NFTs found for {shortAddr(address || "")}.{" "}
          <Link href="/explore" className="text-[#00e88f] underline">
            Explore collections
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {holdings.map((h) => (
            <Link
              key={h.collection.address}
              href={`/collection/${h.collection.address}`}
              className="king-panel flex items-center gap-4 p-4 transition hover:border-emerald-400/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={h.collection.image || "/logo.png"}
                alt=""
                className="h-16 w-16 rounded-xl object-cover"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-[#e8eee9]">
                  {h.collection.name}
                </h3>
                <p className="text-xs text-[#e8eee9]/50">
                  Balance {h.balance} · tokens [
                  {h.tokenIds.slice(0, 8).join(", ")}
                  {h.tokenIds.length > 8 ? "…" : ""}]
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
