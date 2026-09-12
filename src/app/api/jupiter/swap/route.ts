import { NextRequest, NextResponse } from "next/server";
import { getJupiterSwapTx, type JupiterQuote } from "@/lib/jupiter";

export async function POST(req: NextRequest) {
  try {
    const { quoteResponse, userPublicKey } = await req.json();
    if (!quoteResponse || !userPublicKey) {
      return NextResponse.json(
        { error: "quoteResponse and userPublicKey required" },
        { status: 400 }
      );
    }

    const result = await getJupiterSwapTx({
      quoteResponse: quoteResponse as JupiterQuote,
      userPublicKey,
    });

    if (!result?.swapTransaction) {
      return NextResponse.json({ error: "Failed to build swap tx" }, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Swap error" },
      { status: 500 }
    );
  }
}
