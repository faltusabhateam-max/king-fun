import type { ExploreToken } from "./types";

const BASE = "https://api.dexscreener.com";

export async function fetchBoostedSolana(): Promise<ExploreToken[]> {
  try {
    const res = await fetch(`${BASE}/token-boosts/top/v1`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      chainId: string;
      tokenAddress: string;
      icon?: string;
      description?: string;
      url?: string;
    }>;

    const solana = data.filter((d) => d.chainId === "solana").slice(0, 40);
    const addresses = solana.map((s) => s.tokenAddress).join(",");
    if (!addresses) return [];

    const pairsRes = await fetch(`${BASE}/tokens/v1/solana/${addresses}`, {
      next: { revalidate: 30 },
    });
    if (!pairsRes.ok) {
      return solana.map((s) => ({
        address: s.tokenAddress,
        name: s.tokenAddress.slice(0, 6),
        symbol: "???",
        imageUrl: s.icon,
        url: s.url,
        source: "dexscreener" as const,
      }));
    }

    const pairs = (await pairsRes.json()) as Array<{
      chainId: string;
      pairAddress: string;
      dexId: string;
      url: string;
      baseToken: { address: string; name: string; symbol: string };
      priceUsd?: string;
      liquidity?: { usd?: number };
      volume?: { h24?: number };
      priceChange?: { h24?: number };
      info?: { imageUrl?: string };
    }>;

    const byAddr = new Map<string, ExploreToken>();
    for (const p of pairs) {
      if (p.chainId !== "solana") continue;
      const addr = p.baseToken.address;
      const existing = byAddr.get(addr);
      const liq = p.liquidity?.usd ?? 0;
      if (existing && (existing.liquidityUsd ?? 0) >= liq) continue;
      const boost = solana.find((s) => s.tokenAddress === addr);
      byAddr.set(addr, {
        address: addr,
        name: p.baseToken.name,
        symbol: p.baseToken.symbol,
        imageUrl: p.info?.imageUrl || boost?.icon,
        priceUsd: p.priceUsd ? Number(p.priceUsd) : undefined,
        liquidityUsd: liq,
        volume24h: p.volume?.h24,
        priceChange24h: p.priceChange?.h24,
        pairAddress: p.pairAddress,
        dexId: p.dexId,
        url: p.url,
        source: "dexscreener",
      });
    }
    return Array.from(byAddr.values());
  } catch (e) {
    console.error("dexscreener boosted error", e);
    return [];
  }
}

export async function fetchTokenPairs(mint: string) {
  try {
    const res = await fetch(`${BASE}/token-pairs/v1/solana/${mint}`, {
      next: { revalidate: 15 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function searchPairs(query: string): Promise<ExploreToken[]> {
  try {
    const res = await fetch(
      `${BASE}/latest/dex/search?q=${encodeURIComponent(query)}`,
      { next: { revalidate: 20 } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      pairs?: Array<{
        chainId: string;
        pairAddress: string;
        dexId: string;
        url: string;
        baseToken: { address: string; name: string; symbol: string };
        priceUsd?: string;
        liquidity?: { usd?: number };
        volume?: { h24?: number };
        priceChange?: { h24?: number };
        info?: { imageUrl?: string };
      }>;
    };
    return (data.pairs || [])
      .filter((p) => p.chainId === "solana")
      .slice(0, 30)
      .map((p) => ({
        address: p.baseToken.address,
        name: p.baseToken.name,
        symbol: p.baseToken.symbol,
        imageUrl: p.info?.imageUrl,
        priceUsd: p.priceUsd ? Number(p.priceUsd) : undefined,
        liquidityUsd: p.liquidity?.usd,
        volume24h: p.volume?.h24,
        priceChange24h: p.priceChange?.h24,
        pairAddress: p.pairAddress,
        dexId: p.dexId,
        url: p.url,
        source: "dexscreener" as const,
      }));
  } catch {
    return [];
  }
}
