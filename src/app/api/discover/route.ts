import { NextResponse } from "next/server";
import { fetchRobinhoodEthPairs } from "@/lib/dex-discover";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Prefer meme-related searches; filter ETH quote only
  const a = await fetchRobinhoodEthPairs("robinhood");
  const b = await fetchRobinhoodEthPairs("ETH");
  const map = new Map<string, (typeof a.pairs)[0]>();
  for (const p of [...a.pairs, ...b.pairs]) {
    const key = (p.baseToken?.address || p.pairAddress || "").toLowerCase();
    if (!key) continue;
    const prev = map.get(key);
    if (!prev || (p.volume?.h24 || 0) > (prev.volume?.h24 || 0)) map.set(key, p);
  }
  const pairs = [...map.values()];
  const error = pairs.length ? undefined : a.error || b.error;
  return NextResponse.json({
    ok: pairs.length > 0,
    quote: "ETH",
    source: "dexscreener",
    pairs,
    error,
    note: "Only TOKEN/ETH pairs (ETH quote) on Robinhood Chain. Empty = indexer rate-limit or no pairs matched.",
  });
}
