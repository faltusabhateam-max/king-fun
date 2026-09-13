"use client";

import {
  BrowserProvider,
  Contract,
  formatEther,
  parseUnits,
  Interface,
  type Eip1193Provider,
  type ContractTransactionResponse,
} from "ethers";
import { ADDRESSES } from "./robinhood";
import { ensureRobinhoodChain } from "./wallet-evm";
import vaultJson from "./abi/KingMarginVault.json";
import type { InterfaceAbi } from "ethers";

const VAULT_ABI = (vaultJson as { abi: InterfaceAbi }).abi;
const ERROR_IFACE = new Interface(["function Error(string)"]);
const CLOSE_GAS_FALLBACK = 900_000n;

export type VaultPosition = {
  id: number;
  token: string;
  tokenAmount: string;
  marginEth: string;
  debtEth: string;
  openedAt: number;
  underwater: boolean;
};

export type ClosePreflight = {
  ok: boolean;
  underwater: boolean;
  reason?: string;
};

function vaultAddress(): string {
  const address = ADDRESSES.marginVault;
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    throw new Error("Margin vault not configured");
  }
  return address;
}

async function vaultContract(eip1193: Eip1193Provider) {
  const browser = new BrowserProvider(eip1193);
  await ensureRobinhoodChain(browser);
  const signer = await browser.getSigner();
  const address = vaultAddress();
  const vault = new Contract(address, VAULT_ABI, signer);
  return { browser, signer, vault, address };
}

function collectErrorText(e: unknown): string {
  if (e == null) return "";
  if (typeof e === "string") return e;
  if (e instanceof Error) {
    const extra = e as Error & {
      reason?: string;
      shortMessage?: string;
      info?: { error?: { message?: string } };
      error?: { message?: string };
    };
    return [
      extra.reason,
      extra.shortMessage,
      extra.message,
      extra.info?.error?.message,
      extra.error?.message,
    ]
      .filter(Boolean)
      .join(" | ");
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function decodeRevertData(data: unknown): string | null {
  if (typeof data !== "string" || !data.startsWith("0x")) return null;
  if (data === "0x") return "execution reverted";
  try {
    const parsed = ERROR_IFACE.parseError(data);
    if (parsed?.args?.[0] != null) return String(parsed.args[0]);
  } catch {
    /* not Error(string) */
  }
  return null;
}

function extractRevertReason(e: unknown): string {
  if (e && typeof e === "object") {
    const err = e as {
      reason?: string;
      revert?: { args?: unknown[] };
      data?: unknown;
      info?: { error?: { data?: unknown } };
      error?: { data?: unknown };
    };
    if (err.reason) return err.reason;
    if (err.revert?.args?.[0] != null) return String(err.revert.args[0]);
    const decoded =
      decodeRevertData(err.data) ||
      decodeRevertData(err.info?.error?.data) ||
      decodeRevertData(err.error?.data);
    if (decoded) return decoded;
  }
  return collectErrorText(e);
}

function looksLikeNullGasResponse(text: string): boolean {
  return (
    /invalid BigNumberish/i.test(text) ||
    /argument=["']%response["']/i.test(text) ||
    /value=null/i.test(text)
  );
}

export function friendlyVaultError(e: unknown): Error {
  const raw = extractRevertReason(e);
  const blob = `${raw} ${collectErrorText(e)}`;
  if (looksLikeNullGasResponse(blob) || /underwater/i.test(blob)) {
    return new Error(
      "Position is underwater (sale proceeds < debt). Close is blocked — use Liquidate."
    );
  }
  if (/\bhealthy\b/i.test(blob)) {
    return new Error("Position is still healthy and cannot be liquidated.");
  }
  if (/\bpos\b/i.test(raw) && raw.length < 40) {
    return new Error("Not your open position (or already closed).");
  }
  if (/^closed$/i.test(raw.trim())) {
    return new Error("Position is already closed.");
  }
  if (/user rejected|denied|ACTION_REJECTED/i.test(blob)) {
    return e instanceof Error ? e : new Error(raw || "Rejected");
  }
  return new Error(raw || "Vault transaction failed");
}

async function runCloseStaticCall(
  vault: Contract,
  id: bigint,
  minOut: bigint,
  from?: string
): Promise<ClosePreflight> {
  try {
    if (from) {
      await vault.closeLong.staticCall(id, minOut, { from });
    } else {
      await vault.closeLong.staticCall(id, minOut);
    }
    return { ok: true, underwater: false };
  } catch (e) {
    const reason = extractRevertReason(e);
    const blob = `${reason} ${collectErrorText(e)}`;
    const underwater = /underwater/i.test(blob) || looksLikeNullGasResponse(blob);
    return {
      ok: false,
      underwater,
      reason: friendlyVaultError(e).message,
    };
  }
}

export async function preflightClose(params: {
  eip1193?: Eip1193Provider | null;
  positionId: number | string;
  amountOutMinEth?: bigint;
  from?: string;
}): Promise<ClosePreflight> {
  const { JsonRpcProvider } = await import("ethers");
  const { ROBINHOOD_RPC } = await import("./robinhood");
  const provider = params.eip1193
    ? new BrowserProvider(params.eip1193)
    : new JsonRpcProvider(ROBINHOOD_RPC);
  const vault = new Contract(vaultAddress(), VAULT_ABI, provider);
  let from = params.from;
  if (!from && params.eip1193) {
    try {
      const signer = await (provider as BrowserProvider).getSigner();
      from = await signer.getAddress();
    } catch {
      /* read-only */
    }
  }
  return runCloseStaticCall(
    vault,
    BigInt(params.positionId),
    params.amountOutMinEth ?? 0n,
    from
  );
}

async function sendVaultCall(
  browser: BrowserProvider,
  vault: Contract,
  method: "closeLong" | "liquidate",
  id: bigint,
  minOut: bigint
) {
  try {
    await vault[method].staticCall(id, minOut);
  } catch (e) {
    throw friendlyVaultError(e);
  }

  const feeData = await browser.getFeeData();
  let gasLimit = CLOSE_GAS_FALLBACK;
  try {
    const est = await vault[method].estimateGas(id, minOut);
    if (est != null && typeof est === "bigint" && est > 0n) {
      gasLimit = (est * 13n) / 10n;
    }
  } catch {
    gasLimit = CLOSE_GAS_FALLBACK;
  }

  const overrides: {
    gasLimit: bigint;
    gasPrice?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
  } = { gasLimit };

  if (feeData.gasPrice != null && feeData.gasPrice > 0n) {
    overrides.gasPrice = feeData.gasPrice;
  } else if (feeData.maxFeePerGas != null && feeData.maxFeePerGas > 0n) {
    overrides.maxFeePerGas = feeData.maxFeePerGas;
    if (feeData.maxPriorityFeePerGas != null) {
      overrides.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    }
  }

  try {
    const tx = (await vault[method](
      id,
      minOut,
      overrides
    )) as ContractTransactionResponse;
    return await tx.wait();
  } catch (e) {
    throw friendlyVaultError(e);
  }
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
    totalSharesBn > 0n ? (sharesBn * totalLenderEthBn) / totalSharesBn : 0n;
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
  const tx = await vault.openLong(params.token, lev, params.amountOutMin, {
    value,
  });
  return tx.wait();
}

export async function closeLong(params: {
  eip1193: Eip1193Provider;
  positionId: number | string;
  amountOutMinEth?: bigint;
}) {
  const { browser, vault } = await vaultContract(params.eip1193);
  return sendVaultCall(
    browser,
    vault,
    "closeLong",
    BigInt(params.positionId),
    params.amountOutMinEth ?? 0n
  );
}

export async function liquidate(params: {
  eip1193: Eip1193Provider;
  positionId: number | string;
  amountOutMinEth?: bigint;
}) {
  const { browser, vault } = await vaultContract(params.eip1193);
  return sendVaultCall(
    browser,
    vault,
    "liquidate",
    BigInt(params.positionId),
    params.amountOutMinEth ?? 0n
  );
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
  const out: VaultPosition[] = [];
  const start = Math.max(1, nextId - lookback);
  for (let id = nextId - 1; id >= start; id--) {
    try {
      const p = await vault.positions(id);
      if (!p.open) continue;
      if (String(p.trader).toLowerCase() !== trader.toLowerCase()) continue;
      const pf = await runCloseStaticCall(vault, BigInt(id), 0n, trader);
      out.push({
        id,
        token: String(p.token),
        tokenAmount: p.tokenAmount.toString(),
        marginEth: formatEther(p.marginEth),
        debtEth: formatEther(p.debtEth),
        openedAt: Number(p.openedAt),
        underwater: pf.underwater,
      });
    } catch {
      /* skip */
    }
  }
  return out;
}
