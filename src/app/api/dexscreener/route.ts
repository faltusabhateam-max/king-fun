import { NextRequest, NextResponse } from "next/server";
import { fetchBoostedSolana, searchPairs } from "@/lib/dexscreener";
import { getLaunches } from "@/lib/launches-store";
import type { ExploreToken } from "@/lib/types";
import { spotPriceSol } from "@/lib/king-curve";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");

  const [boosted, launches] = await Promise.all([
    q ? searchPairs(q) : fetchBoostedSolana(),
    getLaunches(),
  ]);

  const local: ExploreToken[] = launches.map((l) => ({
    address: l.mint,
    name: l.name,
    symbol: l.symbol,
    imageUrl: l.image?.startsWith("data:") ? l.image : l.image,
    priceUsd: spotPriceSol(l) * 150, // rough SOL→USD for display
    liquidityUsd: l.realSolReserves * 150,
    volume24h: undefined,
    priceChange24h: undefined,
    source: "local" as const,
    creatorFeeBps: l.creatorFeeBps,
  }));

  // Prefer local launches first, then dexscreener (dedupe by address)
  const seen = new Set<string>();
  const merged: ExploreToken[] = [];
  for (const t of [...local, ...boosted]) {
    if (seen.has(t.address)) continue;
    if (q) {
      const qq = q.toLowerCase();
      if (
        !t.name.toLowerCase().includes(qq) &&
        !t.symbol.toLowerCase().includes(qq) &&
        !t.address.toLowerCase().includes(qq)
      ) {
        continue;
      }
    }
    seen.add(t.address);
    merged.push(t);
  }

  return NextResponse.json({ tokens: merged });
}
