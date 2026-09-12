"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { LaunchCard } from "@/components/LaunchCard";
import type { ExploreToken } from "@/lib/types";

export default function ExplorePage() {
  const [tokens, setTokens] = useState<ExploreToken[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const url = q
          ? `/api/dexscreener?q=${encodeURIComponent(q)}`
          : "/api/dexscreener";
        const res = await fetch(url);
        const data = await res.json();
        setTokens(data.tokens || []);
      } catch {
        setTokens([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#e8eee9]">Explore</h1>
        <p className="mt-2 text-[#e8eee9]/55">
          King Curve launches + DexScreener Solana boosted memes
        </p>
      </div>

      <div className="relative mb-6">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#e8eee9]/40"
          size={18}
        />
        <input
          className="king-input pl-11"
          placeholder="Search name, symbol, or mint…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="king-panel h-36 animate-pulse bg-emerald-400/5"
            />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <div className="king-panel p-10 text-center text-[#e8eee9]/50">
          No tokens found. Try another search or launch the first meme.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tokens.map((t) => (
            <LaunchCard key={t.address} token={t} />
          ))}
        </div>
      )}
    </PageTransition>
  );
}
