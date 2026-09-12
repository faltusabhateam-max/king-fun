/** GeckoTerminal OHLCV for Solana pools */

export async function fetchOhlcv(poolAddress: string, timeframe = "hour") {
  try {
    const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=1&limit=100`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { attributes?: { ohlcv_list?: number[][] } };
    };
    // [timestamp, open, high, low, close, volume]
    return json.data?.attributes?.ohlcv_list ?? [];
  } catch {
    return [];
  }
}
