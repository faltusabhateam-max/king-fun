"use client";

import {
  BrowserProvider,
  Contract,
  formatEther,
  parseUnits,
  type Eip1193Provider,
} from "ethers";
import { ADDRESSES } from "./robinhood";
import { ensureRobinhoodChain } from "./wallet-evm";
import vaultJson from "./abi/KingMarginVault.json";
import type { InterfaceAbi } from "ethers";

const VAULT_ABI = (vaultJson as { abi: InterfaceAbi }).abi;

async function vaultContract(eip1193: Eip1193Provider) {
  const browser = new BrowserProvider(eip1193);
  await ensureRobinhoodChain(browser);
  const signer = await browser.getSigner();
  const address = ADDRESSES.marginVault;
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    throw new Error("Margin vault not configured");
  }
  const vault = new Contract(address, VAULT_ABI, signer);
  return { browser, signer, vault, address };
}

export async function readVaultStats(eip1193?: Eip1193Provider) {
  const { JsonRpcProvider } = await import("ethers");
  const { ROBINHOOD_RPC } = await import("./robinhood");
  const provider = eip1193
    ? new BrowserProvider(eip1193)
    : new JsonRpcProvider(ROBINHOOD_RPC);
  const vault = new Contract(ADDRESSES.marginVault, VAULT_ABI, provider);
  const [totalLenderEth, totalDebtEth, maxLeverage, nextId, bal] =
    await Promise.all([
      vault.totalLenderEth() as Promise<bigint>,
      vault.totalDebtEth() as Promise<bigint>,
      vault.maxLeverage() as Promise<bigint>,
      vault.nextId() as Promise<bigint>,
      provider.getBalance(ADDRESSES.marginVault),
    ]);
  return {
    vault: ADDRESSES.marginVault,
    totalLenderEth: formatEther(totalLenderEth),
    totalDebtEth: formatEther(totalDebtEth),
    freeEth: formatEther(bal),
    maxLeverage: Number(maxLeverage),
    nextId: Number(nextId),
  };
}

export async function readLenderAccount(
  eip1193: Eip1193Provider | undefined,
  address: string
) {
  const { JsonRpcProvider } = await import("ethers");
  const { ROBINHOOD_RPC } = await import("./robinhood");
  const provider = eip1193
    ? new BrowserProvider(eip1193)
    : new JsonRpcProvider(ROBINHOOD_RPC);
  const vault = new Contract(ADDRESSES.marginVault, VAULT_ABI, provider);
  const [sharesBn, totalSharesBn, totalLenderEthBn, bal] = await Promise.all([
    vault.lenderShares(address) as Promise<bigint>,
    vault.totalShares() as Promise<bigint>,
    vault.totalLenderEth() as Promise<bigint>,
    provider.getBalance(ADDRESSES.marginVault),
  ]);
  const estimatedEthOutBn =
    totalSharesBn > 0n
      ? (sharesBn * totalLenderEthBn) / totalSharesBn
      : 0n;
  return {
    shares: sharesBn.toString(),
    totalShares: totalSharesBn.toString(),
    totalLenderEth: formatEther(totalLenderEthBn),
    estimatedEthOut: formatEther(estimatedEthOutBn),
    freeEth: formatEther(bal),
  };
}

export async function depositLender(params: {
  eip1193: Eip1193Provider;
  ethAmount: string;
}) {
  const { vault } = await vaultContract(params.eip1193);
  const value = parseUnits(params.ethAmount, 18);
  if (value <= 0n) throw new Error("Enter ETH amount to deposit");
  const tx = await vault.depositLender({ value });
  return tx.wait();
}

export async function withdrawLender(params: {
  eip1193: Eip1193Provider;
  shares: string;
}) {
  const { vault } = await vaultContract(params.eip1193);
  const shares = BigInt(params.shares);
  const tx = await vault.withdrawLender(shares);
  return tx.wait();
}

export async function openLong(params: {
  eip1193: Eip1193Provider;
  token: string;
  leverage: number;
  marginEth: string;
  amountOutMin: bigint;
}) {
  const { vault } = await vaultContract(params.eip1193);
  const lev = Math.max(2, Math.min(50, Math.floor(params.leverage)));
  const value = parseUnits(params.marginEth, 18);
  if (value <= 0n) throw new Error("Enter margin in ETH");
  const tx = await vault.openLong(
    params.token,
    lev,
    params.amountOutMin,
    { value }
  );
  return tx.wait();
}

export async function closeLong(params: {
  eip1193: Eip1193Provider;
  positionId: number | string;
  amountOutMinEth?: bigint;
}) {
  const { vault } = await vaultContract(params.eip1193);
  const tx = await vault.closeLong(
    BigInt(params.positionId),
    params.amountOutMinEth ?? 0n
  );
  return tx.wait();
}

export async function fetchOpenPositions(
  eip1193: Eip1193Provider | null,
  trader: string,
  lookback = 40
) {
  const { JsonRpcProvider } = await import("ethers");
  const { ROBINHOOD_RPC } = await import("./robinhood");
  const provider = eip1193
    ? new BrowserProvider(eip1193)
    : new JsonRpcProvider(ROBINHOOD_RPC);
  const vault = new Contract(ADDRESSES.marginVault, VAULT_ABI, provider);
  const nextId = Number(await vault.nextId());
  const out: {
    id: number;
    token: string;
    tokenAmount: string;
    marginEth: string;
    debtEth: string;
    openedAt: number;
  }[] = [];
  const start = Math.max(1, nextId - lookback);
  for (let id = nextId - 1; id >= start; id--) {
    try {
      const p = await vault.positions(id);
      if (!p.open) continue;
      if (String(p.trader).toLowerCase() !== trader.toLowerCase()) continue;
      out.push({
        id,
        token: String(p.token),
        tokenAmount: p.tokenAmount.toString(),
        marginEth: formatEther(p.marginEth),
        debtEth: formatEther(p.debtEth),
        openedAt: Number(p.openedAt),
      });
    } catch {
      /* skip */
    }
  }
  return out;
}
