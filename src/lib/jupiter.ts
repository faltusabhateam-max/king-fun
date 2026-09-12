const QUOTE_API = "https://quote-api.jup.ag/v6";
const SWAP_API = "https://quote-api.jup.ag/v6";

export const SOL_MINT = "So11111111111111111111111111111111111111112";

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  priceImpactPct: string;
  routePlan: unknown[];
}

export async function getJupiterQuote(params: {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
}): Promise<JupiterQuote | null> {
  const { inputMint, outputMint, amount, slippageBps = 100 } = params;
  const url = new URL(`${QUOTE_API}/quote`);
  url.searchParams.set("inputMint", inputMint);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", String(Math.floor(amount)));
  url.searchParams.set("slippageBps", String(slippageBps));

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as JupiterQuote;
}

export async function getJupiterSwapTx(params: {
  quoteResponse: JupiterQuote;
  userPublicKey: string;
}): Promise<{ swapTransaction: string } | null> {
  const res = await fetch(`${SWAP_API}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: params.quoteResponse,
      userPublicKey: params.userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as { swapTransaction: string };
}
