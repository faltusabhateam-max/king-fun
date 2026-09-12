import { NextRequest, NextResponse } from "next/server";
import {
  quoteBuyEthForTokens,
  quoteSellTokensForEth,
  resolveMemeEthMarket,
} from "@/lib/markets";
import { formatUnits } from "ethers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const side = body.side === "sell" ? "sell" : "buy";
    const ca = String(body.ca || "");
    const amount = String(body.amount || "0");
    const market = await resolveMemeEthMarket(ca);
    if (side === "buy") {
      const q = await quoteBuyEthForTokens(
        market.token,
        amount,
        market.kind,
        market.fee
      );
      return NextResponse.json({
        ok: true,
        side,
        amountIn: amount,
        amountInSymbol: "ETH",
        amountOut: q.amountOut,
        amountOutFormatted: formatUnits(q.amountOut, market.decimals),
        amountOutSymbol: market.symbol,
        path: q.path,
        market,
      });
    }
    const q = await quoteSellTokensForEth(
      market.token,
      amount,
      market.decimals,
      market.kind,
      market.fee
    );
    return NextResponse.json({
      ok: true,
      side,
      amountIn: amount,
      amountInSymbol: market.symbol,
      amountOut: q.amountOut,
      amountOutFormatted: formatUnits(q.amountOut, 18),
      amountOutSymbol: "ETH",
      path: q.path,
      market,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Quote failed" },
      { status: 400 }
    );
  }
}
