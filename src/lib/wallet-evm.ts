"use client";

import { BrowserProvider, type Eip1193Provider } from "ethers";
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_CHAIN_ID_HEX,
  robinhoodWalletAddParams,
} from "./robinhood";

export async function getEip1193Provider(): Promise<Eip1193Provider | null> {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
  return eth ?? null;
}

export async function getBrowserProvider(): Promise<BrowserProvider | null> {
  const eth = await getEip1193Provider();
  if (!eth) return null;
  return new BrowserProvider(eth);
}

export async function ensureRobinhoodChain(
  provider: BrowserProvider
): Promise<void> {
  const network = await provider.getNetwork();
  if (Number(network.chainId) === ROBINHOOD_CHAIN_ID) return;

  const eth = await getEip1193Provider();
  if (!eth) throw new Error("No EIP-1193 wallet found");

  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ROBINHOOD_CHAIN_ID_HEX }],
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4902 || code === -32603) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [robinhoodWalletAddParams],
      });
      return;
    }
    throw err;
  }
}

export function formatEth(wei: bigint, digits = 6): string {
  const neg = wei < BigInt(0);
  const v = neg ? -wei : wei;
  const base = BigInt(10) ** BigInt(18);
  const whole = v / base;
  const frac = v % base;
  const fracStr = frac
    .toString()
    .padStart(18, "0")
    .slice(0, digits)
    .replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${fracStr ? `.${fracStr}` : ""}`;
}
