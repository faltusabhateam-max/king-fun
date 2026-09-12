import { NextRequest, NextResponse } from "next/server";
import { getJupiterQuote, SOL_MINT } from "@/lib/jupiter";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export async function POST(req: NextRequest) {
  try {
    const { mint, side, amount } = await req.json();
    if (!mint || !amount) {
      return NextResponse.json({ error: "mint and amount required" }, { status: 400 });
    }

    const isBuy = side !== "sell";
    const inputMint = isBuy ? SOL_MINT : mint;
    const outputMint = isBuy ? mint : SOL_MINT;

    // amount: buy = SOL UI, sell = token UI (assume 6 decimals for unknown)
    const rawAmount = isBuy
      ? Math.floor(Number(amount) * LAMPORTS_PER_SOL)
      : Math.floor(Number(amount) * 1e6);

    const quote = await getJupiterQuote({
      inputMint,
      outputMint,
      amount: rawAmount,
      slippageBps: 100,
    });

    if (!quote) {
      return NextResponse.json(
        { error: "No Jupiter route (token may not be tradable yet)" },
        { status: 404 }
      );
    }

    const outDecimals = isBuy ? 6 : 9;
    const outAmountUi = Number(quote.outAmount) / 10 ** outDecimals;

    return NextResponse.json({
      quote,
      outAmountUi,
      priceImpactPct: Number(quote.priceImpactPct),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Quote error" },
      { status: 500 }
    );
  }
}
