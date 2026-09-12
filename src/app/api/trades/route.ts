import { NextRequest, NextResponse } from "next/server";
import { getLaunch, getTrades, saveTrade, updateLaunch } from "@/lib/launches-store";
import { quoteBuy, quoteSell, isGraduated } from "@/lib/king-curve";
import type { TradeRecord } from "@/lib/types";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint") || undefined;
  const trades = await getTrades(mint);
  return NextResponse.json({ trades });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mint, side, amount, trader, quoteOnly } = body as {
      mint: string;
      side: "buy" | "sell";
      amount: number;
      trader: string;
      quoteOnly?: boolean;
    };

    if (!mint || !side || !amount) {
      return NextResponse.json({ error: "mint, side, amount required" }, { status: 400 });
    }

    const launch = await getLaunch(mint);
    if (!launch) {
      return NextResponse.json({ error: "Launch not found" }, { status: 404 });
    }

    const state = {
      virtualSolReserves: launch.virtualSolReserves,
      virtualTokenReserves: launch.virtualTokenReserves,
      realSolReserves: launch.realSolReserves,
      realTokenReserves: launch.realTokenReserves,
    };

    if (side === "buy") {
      const q = quoteBuy(state, Number(amount), launch.creatorFeeBps);
      if (quoteOnly) {
        return NextResponse.json({
          tokensOut: q.tokensOut,
          creatorFeeSol: q.creatorFeeSol,
          priceImpact: q.priceImpact,
        });
      }
      await updateLaunch(launch.mint, {
        ...q.newState,
        status: isGraduated(q.newState) ? "graduated" : launch.status,
      });
      const trade: TradeRecord = {
        id: randomUUID(),
        mint: launch.mint,
        side: "buy",
        solAmount: Number(amount),
        tokenAmount: q.tokensOut,
        priceSol: q.tokensOut > 0 ? Number(amount) / q.tokensOut : 0,
        trader: trader || "unknown",
        creatorFeeSol: q.creatorFeeSol,
        timestamp: Date.now(),
        simulated: true,
      };
      await saveTrade(trade);
      return NextResponse.json({
        trade,
        tokensOut: q.tokensOut,
        creatorFeeSol: q.creatorFeeSol,
        priceImpact: q.priceImpact,
        note: "King Curve program not deployed yet — local curve state updated. Wallet message may have been signed.",
      });
    }

    const q = quoteSell(state, Number(amount), launch.creatorFeeBps);
    if (quoteOnly) {
      return NextResponse.json({
        solOut: q.solOut,
        creatorFeeSol: q.creatorFeeSol,
        priceImpact: q.priceImpact,
      });
    }
    await updateLaunch(launch.mint, { ...q.newState });
    const trade: TradeRecord = {
      id: randomUUID(),
      mint: launch.mint,
      side: "sell",
      solAmount: q.solOut,
      tokenAmount: Number(amount),
      priceSol: Number(amount) > 0 ? q.solOut / Number(amount) : 0,
      trader: trader || "unknown",
      creatorFeeSol: q.creatorFeeSol,
      timestamp: Date.now(),
      simulated: true,
    };
    await saveTrade(trade);
    return NextResponse.json({
      trade,
      solOut: q.solOut,
      creatorFeeSol: q.creatorFeeSol,
      priceImpact: q.priceImpact,
      note: "King Curve program not deployed yet — local curve state updated.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Trade error" },
      { status: 500 }
    );
  }
}
