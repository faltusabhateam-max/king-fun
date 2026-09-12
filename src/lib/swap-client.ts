"use client";

import {
  BrowserProvider,
  Contract,
  MaxUint256,
  parseUnits,
  type Eip1193Provider,
} from "ethers";
import {
  ERC20_ABI,
  UNISWAP_V2_ROUTER,
  UNISWAP_V3_SWAP_ROUTER,
  V2_ROUTER_ABI,
  V3_ROUTER_ABI,
  WETH,
} from "./uniswap";
import { ensureRobinhoodChain } from "./wallet-evm";
import type { PoolKind } from "./markets";

async function providerFrom(eip1193: Eip1193Provider) {
  const browser = new BrowserProvider(eip1193);
  await ensureRobinhoodChain(browser);
  const signer = await browser.getSigner();
  return { browser, signer };
}

export async function swapBuyWithEth(params: {
  eip1193: Eip1193Provider;
  token: string;
  ethAmount: string;
  amountOutMin: bigint;
  kind: PoolKind;
  fee?: number;
}) {
  const { signer } = await providerFrom(params.eip1193);
  const to = await signer.getAddress();
  const value = parseUnits(params.ethAmount, 18);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

  if (params.kind === "v2") {
    const router = new Contract(UNISWAP_V2_ROUTER, V2_ROUTER_ABI, signer);
    const path = [WETH, params.token];
    const tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
      params.amountOutMin,
      path,
      to,
      deadline,
      { value }
    );
    return tx.wait();
  }

  // V3 exactInputSingle via SwapRouter02 (no deadline field in some versions)
  const router = new Contract(UNISWAP_V3_SWAP_ROUTER, V3_ROUTER_ABI, signer);
  const tx = await router.exactInputSingle(
    {
      tokenIn: WETH,
      tokenOut: params.token,
      fee: params.fee ?? 3000,
      recipient: to,
      amountIn: value,
      amountOutMinimum: params.amountOutMin,
      sqrtPriceLimitX96: 0,
    },
    { value }
  );
  return tx.wait();
}

export async function swapSellForEth(params: {
  eip1193: Eip1193Provider;
  token: string;
  tokenAmount: string;
  decimals: number;
  amountOutMin: bigint;
  kind: PoolKind;
  fee?: number;
}) {
  const { signer } = await providerFrom(params.eip1193);
  const to = await signer.getAddress();
  const amountIn = parseUnits(params.tokenAmount, params.decimals);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const erc20 = new Contract(params.token, ERC20_ABI, signer);

  if (params.kind === "v2") {
    const allowance: bigint = await erc20.allowance(to, UNISWAP_V2_ROUTER);
    if (allowance < amountIn) {
      const txA = await erc20.approve(UNISWAP_V2_ROUTER, MaxUint256);
      await txA.wait();
    }
    const router = new Contract(UNISWAP_V2_ROUTER, V2_ROUTER_ABI, signer);
    const path = [params.token, WETH];
    const tx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
      amountIn,
      params.amountOutMin,
      path,
      to,
      deadline
    );
    return tx.wait();
  }

  const allowance: bigint = await erc20.allowance(to, UNISWAP_V3_SWAP_ROUTER);
  if (allowance < amountIn) {
    const txA = await erc20.approve(UNISWAP_V3_SWAP_ROUTER, MaxUint256);
    await txA.wait();
  }
  const router = new Contract(UNISWAP_V3_SWAP_ROUTER, V3_ROUTER_ABI, signer);
  // exactInputSingle outputs WETH — unwrap via multicall if router supports
  const iface = router.interface;
  const swapData = iface.encodeFunctionData("exactInputSingle", [
    {
      tokenIn: params.token,
      tokenOut: WETH,
      fee: params.fee ?? 3000,
      recipient: UNISWAP_V3_SWAP_ROUTER,
      amountIn,
      amountOutMinimum: params.amountOutMin,
      sqrtPriceLimitX96: 0,
    },
  ]);
  const unwrapData = iface.encodeFunctionData("unwrapWETH9", [
    params.amountOutMin,
    to,
  ]);
  const tx = await router.multicall([swapData, unwrapData]);
  return tx.wait();
}
