import { NextRequest, NextResponse } from "next/server";
import { resolveMemeEthMarket } from "@/lib/markets";
import { tradesFromV2Swaps } from "@/lib/candles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ca = req.nextUrl.searchParams.get("ca")?.trim();
  const limit = Math.min(
    80,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 40))
  );
  if (!ca) {
    return NextResponse.json({ error: "Missing ca" }, { status: 400 });
  }
  try {
    const market = await resolveMemeEthMarket(ca);
    if (market.kind !== "v2") {
      return NextResponse.json({
        ok: true,
        trades: [],
        market,
        empty: true,
        note: "Live trades tape needs a Uniswap V2 TOKEN/ETH pool. No fake prints.",
      });
    }
    const trades = await tradesFromV2Swaps(market, 3000, limit);
    return NextResponse.json({
      ok: true,
      trades,
      market,
      empty: trades.length === 0,
      note:
        trades.length === 0
          ? "No recent Swap events for this pool."
          : "Buys/sells from on-chain Swap events.",
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Trades failed",
        trades: [],
        empty: true,
      },
      { status: 400 }
    );
  }
}
