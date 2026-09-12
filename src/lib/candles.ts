import { formatUnits, id, Interface } from "ethers";
import { getRpc } from "./rpc";
import { V2_PAIR_ABI } from "./uniswap";
import type { MemeEthMarket } from "./markets";

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volumeEth: number;
};

export type SwapTrade = {
  time: number;
  price: number;
  volEth: number;
  side: "buy" | "sell";
  txHash: string;
  blockNumber: number;
};

async function loadV2SwapTrades(
  market: MemeEthMarket,
  lookbackBlocks = 2000
): Promise<SwapTrade[]> {
  if (market.kind !== "v2") return [];
  const rpc = getRpc();
  const latest = await rpc.getBlockNumber();
  const fromBlock = Math.max(0, latest - lookbackBlocks);
  const latestBlock = await rpc.getBlock(latest);
  const latestTs = Number(
    latestBlock?.timestamp ?? Math.floor(Date.now() / 1000)
  );
  const fromBlk = await rpc.getBlock(fromBlock);
  const fromTs = Number(fromBlk?.timestamp ?? latestTs - lookbackBlocks);
  const spanBlocks = Math.max(1, latest - fromBlock);
  const secPerBlock = Math.max(0.1, (latestTs - fromTs) / spanBlocks);

  const iface = new Interface(V2_PAIR_ABI);
  const topic = id(
    "Swap(address,uint256,uint256,uint256,uint256,address)"
  );
  const logs = await rpc.getLogs({
    address: market.pool,
    fromBlock,
    toBlock: latest,
    topics: [topic],
  });

  const { Contract } = await import("ethers");
  const token0 = (
    await new Contract(market.pool, V2_PAIR_ABI, rpc).token0()
  ).toLowerCase();
  const tokenIs0 = token0 === market.token.toLowerCase();

  const trades: SwapTrade[] = [];

  for (const log of logs) {
    try {
      const parsed = iface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      if (!parsed) continue;
      const a0in = parsed.args.amount0In as bigint;
      const a1in = parsed.args.amount1In as bigint;
      const a0out = parsed.args.amount0Out as bigint;
      const a1out = parsed.args.amount1Out as bigint;
      let ethAmt = 0n;
      let tokAmt = 0n;
      let side: "buy" | "sell" = "buy";
      if (tokenIs0) {
        // token0=token, token1=WETH
        if (a1in > 0n && a0out > 0n) {
          // ETH in → token out = BUY
          ethAmt = a1in;
          tokAmt = a0out;
          side = "buy";
        } else if (a0in > 0n && a1out > 0n) {
          // token in → ETH out = SELL
          ethAmt = a1out;
          tokAmt = a0in;
          side = "sell";
        }
      } else {
        // token1=token, token0=WETH
        if (a0in > 0n && a1out > 0n) {
          ethAmt = a0in;
          tokAmt = a1out;
          side = "buy";
        } else if (a1in > 0n && a0out > 0n) {
          ethAmt = a0out;
          tokAmt = a1in;
          side = "sell";
        }
      }
      if (ethAmt === 0n || tokAmt === 0n) continue;
      const price =
        Number(formatUnits(ethAmt, 18)) /
        Number(formatUnits(tokAmt, market.decimals));
      if (!Number.isFinite(price) || price <= 0) continue;
      const t = Math.floor(
        fromTs + (Number(log.blockNumber) - fromBlock) * secPerBlock
      );
      trades.push({
        time: t,
        price,
        volEth: Number(formatUnits(ethAmt, 18)),
        side,
        txHash: log.transactionHash,
        blockNumber: Number(log.blockNumber),
      });
    } catch {
      /* skip */
    }
  }

  trades.sort((a, b) => a.time - b.time);
  return trades;
}

/** Build OHLCV from real Uniswap V2 Swap events (price in ETH per token). */
export async function candlesFromV2Swaps(
  market: MemeEthMarket,
  timeframeSec: number,
  lookbackBlocks = 2000
): Promise<Candle[]> {
  const trades = await loadV2SwapTrades(market, lookbackBlocks);
  if (trades.length === 0) {
    if (!(market.priceEth > 0)) return [];
    const now = Math.floor(Date.now() / 1000);
    return [
      {
        time: now,
        open: market.priceEth,
        high: market.priceEth,
        low: market.priceEth,
        close: market.priceEth,
        volumeEth: 0,
      },
    ];
  }

  const map = new Map<number, Candle>();
  const bucketSec = Math.max(1, timeframeSec);
  for (const tr of trades) {
    const bucket = tr.time - (tr.time % bucketSec);
    const c = map.get(bucket);
    if (!c) {
      map.set(bucket, {
        time: bucket,
        open: tr.price,
        high: tr.price,
        low: tr.price,
        close: tr.price,
        volumeEth: tr.volEth,
      });
    } else {
      c.high = Math.max(c.high, tr.price);
      c.low = Math.min(c.low, tr.price);
      c.close = tr.price;
      c.volumeEth += tr.volEth;
    }
  }
  return [...map.values()].sort((a, b) => a.time - b.time);
}

export async function tradesFromV2Swaps(
  market: MemeEthMarket,
  lookbackBlocks = 2000,
  limit = 40
): Promise<SwapTrade[]> {
  const trades = await loadV2SwapTrades(market, lookbackBlocks);
  return trades.slice(-limit).reverse();
}
