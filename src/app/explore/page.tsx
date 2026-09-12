"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageTransition } from "@/components/PageTransition";
import type { CollectionRecord } from "@/lib/types";
import { shortAddr } from "@/lib/format";
import { Compass } from "lucide-react";

export default function ExplorePage() {
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/collections")
      .then((r) => r.json())
      .then((d) => setCollections(d.collections || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <div className="mb-6 flex items-center gap-3">
        <Compass className="text-[#00e88f]" size={26} />
        <div>
          <h1 className="text-2xl font-bold text-[#e8eee9]">Explore</h1>
          <p className="text-sm text-[#e8eee9]/55">
            NFT collections launched via king.fun on Robinhood Chain
          </p>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-[#e8eee9]/50">Loading collections…</p>
      )}

      {!loading && collections.length === 0 && (
        <div className="king-panel p-8 text-center text-sm text-[#e8eee9]/55">
          No collections yet.{" "}
          <Link href="/launch" className="text-[#00e88f] underline">
            Launch the first one
          </Link>
          .
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => (
          <Link
            key={c.address}
            href={`/collection/${c.address}`}
            className="king-panel king-glow-card block overflow-hidden transition hover:border-emerald-400/40"
          >
            <div className="relative aspect-square bg-[#001a10]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.image || "/logo.png"}
                alt={c.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-[#e8eee9]">
                {c.name}{" "}
                <span className="text-[#00e88f]">${c.symbol}</span>
              </h3>
              <p className="mt-1 text-xs text-[#e8eee9]/50">
                {c.mintPriceEth} ETH · supply {c.maxSupply} · creator{" "}
                {shortAddr(c.creator)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </PageTransition>
  );
}
