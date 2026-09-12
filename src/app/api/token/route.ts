import { NextRequest, NextResponse } from "next/server";
import { resolveMemeEthMarket } from "@/lib/markets";
import { fetchTokenEthPairs } from "@/lib/dex-discover";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ca = req.nextUrl.searchParams.get("ca")?.trim();
  if (!ca) {
    return NextResponse.json({ error: "Missing ca" }, { status: 400 });
  }
  try {
    const market = await resolveMemeEthMarket(ca);
    const dex = await fetchTokenEthPairs(market.token).catch(() => []);
    return NextResponse.json({
      ok: true,
      market,
      dexPairs: dex.slice(0, 5),
      quote: "ETH",
      note: "Any meme CA vs ETH — Uniswap on Robinhood Chain",
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Token load failed",
      },
      { status: 404 }
    );
  }
}
