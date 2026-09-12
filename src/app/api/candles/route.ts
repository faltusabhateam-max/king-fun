import { NextRequest, NextResponse } from "next/server";
import { resolveMemeEthMarket } from "@/lib/markets";
import { candlesFromV2Swaps } from "@/lib/candles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TF: Record<string, number> = {
  "1s": 1,
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1D": 86400,
};

export async function GET(req: NextRequest) {
  const ca = req.nextUrl.searchParams.get("ca")?.trim();
  const tf = req.nextUrl.searchParams.get("tf") || "1m";
  if (!ca) {
    return NextResponse.json({ error: "Missing ca" }, { status: 400 });
  }
  try {
    const market = await resolveMemeEthMarket(ca);
    const sec = TF[tf] || 60;
    // More blocks for coarser TF
    const lookback =
      sec <= 1 ? 800 : sec <= 60 ? 3000 : sec <= 300 ? 8000 : 12000;
    const candles =
      market.kind === "v2"
        ? await candlesFromV2Swaps(market, Math.max(sec, 1), lookback)
        : [
            {
              time: Math.floor(Date.now() / 1000),
              open: market.priceEth,
              high: market.priceEth,
              low: market.priceEth,
              close: market.priceEth,
              volumeEth: 0,
            },
          ];
    return NextResponse.json({
      ok: true,
      source:
        market.kind === "v2"
          ? "uniswap-v2-swap-logs"
          : "uniswap-v3-mark-only",
      quote: "ETH",
      timeframe: tf,
      market,
      candles,
      note:
        market.kind === "v3"
          ? "V3 historical candles need denser event indexing — showing live mark from pool slot0"
          : "Candles from on-chain Swap events priced in ETH",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Candles failed" },
      { status: 400 }
    );
  }
}
