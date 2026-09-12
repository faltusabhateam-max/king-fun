import { WETH } from "./uniswap";

export type DiscoverPair = {
  chainId: string;
  pairAddress: string;
  dexId: string;
  baseToken: { address: string; symbol: string; name: string };
  quoteToken: { address: string; symbol: string; name: string };
  priceNative: string;
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
  pairCreatedAt?: number;
  url?: string;
};

function isEthQuote(p: DiscoverPair): boolean {
  const sym = (p.quoteToken?.symbol || "").toUpperCase();
  const addr = (p.quoteToken?.address || "").toLowerCase();
  return (
    sym === "ETH" ||
    sym === "WETH" ||
    addr === WETH.toLowerCase() ||
    addr === "0x0000000000000000000000000000000000000000"
  );
}

export async function fetchRobinhoodEthPairs(
  query = "ETH"
): Promise<{ pairs: DiscoverPair[]; source: string; error?: string }> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 30 } }
    );
    if (!res.ok) {
      return {
        pairs: [],
        source: "dexscreener",
        error: `DexScreener HTTP ${res.status} — try again or paste a CA`,
      };
    }
    const data = await res.json();
    const all: DiscoverPair[] = data?.pairs || [];
    const pairs = all
      .filter((p) => p.chainId === "robinhood" && isEthQuote(p))
      .sort(
        (a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0)
      );
    return { pairs, source: "dexscreener" };
  } catch (e) {
    return {
      pairs: [],
      source: "dexscreener",
      error: e instanceof Error ? e.message : "Discover unavailable",
    };
  }
}

export async function fetchTokenEthPairs(
  token: string
): Promise<DiscoverPair[]> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/token-pairs/v1/robinhood/${token}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 20 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const pairs: DiscoverPair[] = Array.isArray(data) ? data : [];
    return pairs.filter(isEthQuote);
  } catch {
    return [];
  }
}
