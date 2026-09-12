import { NextRequest, NextResponse } from "next/server";
import { fetchTokenPairs } from "@/lib/dexscreener";
import { fetchOhlcv } from "@/lib/gecko";
import { getLaunch, getTrades } from "@/lib/launches-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint");
  if (!mint) {
    return NextResponse.json({ error: "mint required" }, { status: 400 });
  }

  const pairs = await fetchTokenPairs(mint);
  const best = Array.isArray(pairs)
    ? [...pairs].sort(
        (a: { liquidity?: { usd?: number } }, b: { liquidity?: { usd?: number } }) =>
          (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
      )[0]
    : null;

  let candles: number[][] = [];
  if (best?.pairAddress) {
    candles = await fetchOhlcv(best.pairAddress, "hour");
  }

  // Fallback: build crude candles from local King Curve trades
  if (candles.length === 0) {
    const launch = await getLaunch(mint);
    if (launch) {
      const trades = await getTrades(mint);
      if (trades.length > 0) {
        candles = trades
          .slice()
          .reverse()
          .map((t) => {
            const p = t.priceSol || 0.00001;
            const ts = Math.floor(t.timestamp / 1000);
            return [ts, p, p * 1.01, p * 0.99, p, t.solAmount];
          });
      }
    }
  }

  return NextResponse.json({
    candles,
    pair: best || null,
  });
}
