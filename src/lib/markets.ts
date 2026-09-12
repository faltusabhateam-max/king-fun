import { Contract, formatUnits, parseUnits } from "ethers";
import {
  ERC20_ABI,
  UNISWAP_V2_FACTORY,
  UNISWAP_V2_ROUTER,
  UNISWAP_V3_FACTORY,
  UNISWAP_V3_SWAP_ROUTER,
  V2_FACTORY_ABI,
  V2_PAIR_ABI,
  V2_ROUTER_ABI,
  V3_FACTORY_ABI,
  V3_POOL_ABI,
  V3_FEES,
  WETH,
  isEthQuote,
} from "./uniswap";
import { getRpc } from "./rpc";

export type PoolKind = "v2" | "v3";

export type MemeEthMarket = {
  token: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  pool: string;
  kind: PoolKind;
  fee?: number;
  reserveToken: string;
  reserveEth: string;
  priceEth: number;
  liquidityEth: number;
};

function isAddress(a: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(a);
}

export async function loadErc20(token: string) {
  if (!isAddress(token)) throw new Error("Invalid contract address");
  const rpc = getRpc();
  const c = new Contract(token, ERC20_ABI, rpc);
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    c.name().catch(() => "Unknown"),
    c.symbol().catch(() => "???"),
    c.decimals().catch(() => 18),
    c.totalSupply().catch(() => 0n),
  ]);
  return {
    token: token.toLowerCase(),
    name: String(name),
    symbol: String(symbol),
    decimals: Number(decimals),
    totalSupply: totalSupply.toString(),
  };
}

async function findV2Pool(token: string): Promise<string | null> {
  const rpc = getRpc();
  const factory = new Contract(UNISWAP_V2_FACTORY, V2_FACTORY_ABI, rpc);
  const pair: string = await factory.getPair(token, WETH);
  if (!pair || pair === "0x0000000000000000000000000000000000000000") return null;
  return pair;
}

async function findV3Pool(
  token: string
): Promise<{ pool: string; fee: number } | null> {
  const rpc = getRpc();
  const factory = new Contract(UNISWAP_V3_FACTORY, V3_FACTORY_ABI, rpc);
  let best: { pool: string; fee: number; liq: bigint } | null = null;
  for (const fee of V3_FEES) {
    const pool: string = await factory.getPool(token, WETH, fee);
    if (!pool || pool === "0x0000000000000000000000000000000000000000") continue;
    const p = new Contract(pool, V3_POOL_ABI, rpc);
    const liq: bigint = await p.liquidity().catch(() => 0n);
    if (!best || liq > best.liq) best = { pool, fee, liq };
  }
  return best ? { pool: best.pool, fee: best.fee } : null;
}

export async function resolveMemeEthMarket(
  tokenIn: string
): Promise<MemeEthMarket> {
  const token = tokenIn.trim();
  if (isEthQuote(token) || token.toLowerCase() === WETH.toLowerCase()) {
    throw new Error("Paste a meme token CA — quote is always ETH");
  }
  const meta = await loadErc20(token);
  const rpc = getRpc();

  const v2 = await findV2Pool(token);
  if (v2) {
    const pair = new Contract(v2, V2_PAIR_ABI, rpc);
    const [token0, reserves] = await Promise.all([
      pair.token0() as Promise<string>,
      pair.getReserves() as Promise<{
        reserve0: bigint;
        reserve1: bigint;
      }>,
    ]);
    const tokenIs0 = token0.toLowerCase() === token.toLowerCase();
    const reserveToken = tokenIs0 ? reserves.reserve0 : reserves.reserve1;
    const reserveEth = tokenIs0 ? reserves.reserve1 : reserves.reserve0;
    if (reserveEth === 0n || reserveToken === 0n) {
      throw new Error("TOKEN/ETH pool has zero liquidity");
    }
    const priceEth =
      Number(formatUnits(reserveEth, 18)) /
      Number(formatUnits(reserveToken, meta.decimals));
    return {
      ...meta,
      pool: v2,
      kind: "v2",
      reserveToken: reserveToken.toString(),
      reserveEth: reserveEth.toString(),
      priceEth,
      liquidityEth: Number(formatUnits(reserveEth, 18)) * 2,
    };
  }

  const v3 = await findV3Pool(token);
  if (v3) {
    const pool = new Contract(v3.pool, V3_POOL_ABI, rpc);
    const [slot0, liq] = await Promise.all([
      pool.slot0() as Promise<{ sqrtPriceX96: bigint }>,
      pool.liquidity() as Promise<bigint>,
    ]);
    if (liq === 0n) throw new Error("TOKEN/ETH V3 pool has zero liquidity");
    const sqrt = Number(slot0.sqrtPriceX96) / 2 ** 96;
    const raw = sqrt * sqrt; // token1 per token0
    const token0: string = await pool.token0();
    const tokenIs0 = token0.toLowerCase() === token.toLowerCase();
    // price of token in ETH
    let priceEth: number;
    if (tokenIs0) {
      // token1 is WETH: raw = WETH per token (adjusted by decimals)
      priceEth = raw * 10 ** (meta.decimals - 18);
    } else {
      priceEth = (1 / raw) * 10 ** (meta.decimals - 18);
    }
    if (!Number.isFinite(priceEth) || priceEth <= 0) {
      throw new Error("Could not price TOKEN/ETH pool");
    }
    return {
      ...meta,
      pool: v3.pool,
      kind: "v3",
      fee: v3.fee,
      reserveToken: "0",
      reserveEth: "0",
      priceEth,
      liquidityEth: 0,
    };
  }

  throw new Error(
    "No TOKEN/ETH pool on Uniswap V2/V3. Token may be V4-only or have no ETH pair."
  );
}

export async function quoteBuyEthForTokens(
  token: string,
  ethAmount: string,
  kind: PoolKind,
  fee?: number
): Promise<{ amountOut: string; path: string[] }> {
  const rpc = getRpc();
  const amountIn = parseUnits(ethAmount || "0", 18);
  if (amountIn <= 0n) throw new Error("Enter ETH amount");

  if (kind === "v2") {
    const router = new Contract(UNISWAP_V2_ROUTER, V2_ROUTER_ABI, rpc);
    const path = [WETH, token];
    const amounts: bigint[] = await router.getAmountsOut(amountIn, path);
    return { amountOut: amounts[1].toString(), path };
  }

  // V3: use quoter if available; else estimate from slot0 roughly not for execution.
  // Prefer calling QuoterV2.
  const QUOTER = "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7";
  const quoterAbi = [
    "function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) view returns (uint256 amountOut,uint160,uint32,uint256)",
  ];
  const quoter = new Contract(QUOTER, quoterAbi, rpc);
  const res = await quoter.quoteExactInputSingle({
    tokenIn: WETH,
    tokenOut: token,
    amountIn,
    fee: fee ?? 3000,
    sqrtPriceLimitX96: 0,
  });
  const amountOut = (res.amountOut ?? res[0]) as bigint;
  return { amountOut: amountOut.toString(), path: [WETH, token] };
}

export async function quoteSellTokensForEth(
  token: string,
  tokenAmount: string,
  decimals: number,
  kind: PoolKind,
  fee?: number
): Promise<{ amountOut: string; path: string[] }> {
  const rpc = getRpc();
  const amountIn = parseUnits(tokenAmount || "0", decimals);
  if (amountIn <= 0n) throw new Error("Enter token amount");

  if (kind === "v2") {
    const router = new Contract(UNISWAP_V2_ROUTER, V2_ROUTER_ABI, rpc);
    const path = [token, WETH];
    const amounts: bigint[] = await router.getAmountsOut(amountIn, path);
    return { amountOut: amounts[1].toString(), path };
  }

  const QUOTER = "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7";
  const quoterAbi = [
    "function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) view returns (uint256 amountOut,uint160,uint32,uint256)",
  ];
  const quoter = new Contract(QUOTER, quoterAbi, rpc);
  const res = await quoter.quoteExactInputSingle({
    tokenIn: token,
    tokenOut: WETH,
    amountIn,
    fee: fee ?? 3000,
    sqrtPriceLimitX96: 0,
  });
  const amountOut = (res.amountOut ?? res[0]) as bigint;
  return { amountOut: amountOut.toString(), path: [token, WETH] };
}

export { UNISWAP_V2_ROUTER, UNISWAP_V3_SWAP_ROUTER, WETH };
