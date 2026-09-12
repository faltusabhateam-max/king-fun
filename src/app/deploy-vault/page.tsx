"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { ContractFactory } from "ethers";
import { PageTransition } from "@/components/PageTransition";
import {
  ensureRobinhoodChain,
  getBrowserProvider,
  formatEth,
} from "@/lib/wallet-evm";
import {
  ROBINHOOD_CHAIN_ID,
  explorerAddress,
  explorerTx,
} from "@/lib/robinhood";
import { UNISWAP_V2_ROUTER } from "@/lib/uniswap";
import VaultArtifact from "@/lib/abi/KingMarginVault.json";
import { Vault, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function DeployVaultPage() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [gasEth, setGasEth] = useState<string | null>(null);
  const [deployed, setDeployed] = useState<{
    address: string;
    txHash: string;
  } | null>(null);
  const [existing, setExisting] = useState<string>("");

  useEffect(() => {
    fetch("/api/deployments")
      .then((r) => r.json())
      .then((d) => {
        const va = d?.deployments?.marginVault;
        if (va && va !== "0x0000000000000000000000000000000000000000") {
          setExisting(va);
        }
      })
      .catch(() => {});
  }, []);

  const estimateGas = useCallback(async () => {
    if (!isConnected || !address) return;
    try {
      const provider = await getBrowserProvider();
      if (!provider) return;
      await ensureRobinhoodChain(provider);
      const signer = await provider.getSigner();
      const factory = new ContractFactory(
        VaultArtifact.abi,
        VaultArtifact.bytecode,
        signer
      );
      const deployTx = await factory.getDeployTransaction(UNISWAP_V2_ROUTER);
      const gas = await provider.estimateGas({
        ...deployTx,
        from: address,
      });
      const feeData = await provider.getFeeData();
      // Prefer network gasPrice / feeData — do not inflate
      const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? BigInt(0);
      const cost = gas * gasPrice;
      const ethStr = formatEth(cost, 10);
      setGasEth(ethStr);
      setGasEstimate(
        `~${gas.toString()} gas · ~${ethStr} ETH · Low gas on Robinhood Chain`
      );
    } catch (e) {
      setGasEstimate(
        `Could not estimate yet: ${e instanceof Error ? e.message : "error"}. Connect wallet on Robinhood Chain with a little ETH.`
      );
      setGasEth(null);
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (isConnected && address) {
      const t = setTimeout(() => estimateGas(), 400);
      return () => clearTimeout(t);
    }
  }, [isConnected, address, estimateGas]);

  async function handleDeploy() {
    if (!isConnected || !address) {
      open();
      return;
    }

    setBusy(true);
    setStatus("Switching to Robinhood Chain if needed…");
    try {
      const provider = await getBrowserProvider();
      if (!provider) throw new Error("No browser wallet (EIP-1193) found");
      await ensureRobinhoodChain(provider);
      const signer = await provider.getSigner();
      const net = await provider.getNetwork();
      if (Number(net.chainId) !== ROBINHOOD_CHAIN_ID) {
        throw new Error(`Wrong chain ${net.chainId}; need ${ROBINHOOD_CHAIN_ID}`);
      }

      setStatus("Confirm Deploy Margin Vault in your wallet…");
      const factory = new ContractFactory(
        VaultArtifact.abi,
        VaultArtifact.bytecode,
        signer
      );

      // Use network feeData as-is (lowest practical gas). Optional gasLimit = estimate * 110%.
      const deployTx = await factory.getDeployTransaction(UNISWAP_V2_ROUTER);
      let gasLimit: bigint | undefined;
      try {
        const est = await provider.estimateGas({
          ...deployTx,
          from: address,
        });
        gasLimit = (est * BigInt(110)) / BigInt(100);
      } catch {
        /* wallet will estimate */
      }

      const feeData = await provider.getFeeData();
      const overrides: {
        gasLimit?: bigint;
        gasPrice?: bigint;
        maxFeePerGas?: bigint;
        maxPriorityFeePerGas?: bigint;
      } = {};
      if (gasLimit) overrides.gasLimit = gasLimit;
      // Prefer legacy gasPrice when present; else use feeData tips without inflating
      if (feeData.gasPrice != null) {
        overrides.gasPrice = feeData.gasPrice;
      } else if (feeData.maxFeePerGas != null) {
        overrides.maxFeePerGas = feeData.maxFeePerGas;
        overrides.maxPriorityFeePerGas =
          feeData.maxPriorityFeePerGas ?? BigInt(1);
      }

      const contract = await factory.deploy(UNISWAP_V2_ROUTER, overrides);
      setStatus("Waiting for confirmation…");
      await contract.waitForDeployment();
      const vaultAddress = await contract.getAddress();
      const tx = contract.deploymentTransaction();
      const txHash = tx?.hash || "";

      setStatus("Saving vault address…");
      await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marginVault: vaultAddress,
          deployer: address,
          txHash,
          chainId: ROBINHOOD_CHAIN_ID,
          router: UNISWAP_V2_ROUTER,
        }),
      }).catch(() => {});

      setDeployed({ address: vaultAddress, txHash });
      setExisting(vaultAddress);
      setStatus(null);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Vault className="text-[#00e88f]" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-[#e8eee9] sm:text-3xl">
              Deploy Margin Vault
            </h1>
            <p className="text-sm text-[#e8eee9]/55">
              Low gas on Robinhood Chain · Chain ID 4663 · You sign — no keys stored
            </p>
          </div>
        </div>

        <div className="king-panel mb-4 border-emerald-400/30 p-4">
          <p className="text-sm font-semibold text-[#00e88f]">
            Low gas on Robinhood Chain
          </p>
          <p className="mt-1 text-xs text-[#e8eee9]/55">
            Deploys <strong>KingMarginVault</strong> with Uniswap V2 router{" "}
            <code className="text-[#e8eee9]/70">{UNISWAP_V2_ROUTER}</code>. After
            deploy, seed liquidity by calling <code>depositLender()</code> with
            ETH (you can do that later).
          </p>
        </div>

        {existing && (
          <div className="king-panel mb-4 flex flex-wrap items-center gap-2 p-4 text-sm">
            <CheckCircle2 className="text-[#00e88f]" size={18} />
            <span className="text-[#e8eee9]/70">Vault on file:</span>
            <a
              href={explorerAddress(existing)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[#00e88f] hover:underline"
            >
              {existing.slice(0, 10)}…{existing.slice(-8)}
            </a>
            <Link href="/leverage" className="king-btn-ghost ml-auto text-xs">
              Leverage →
            </Link>
          </div>
        )}

        <div className="king-panel space-y-4 p-5">
          <label className="block text-sm">
            <span className="text-[#e8eee9]/70">Uniswap V2 router (constructor)</span>
            <input
              className="king-input mt-1 w-full font-mono text-sm"
              value={UNISWAP_V2_ROUTER}
              readOnly
            />
          </label>

          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-100/80">
            <div className="mb-1 flex items-center gap-2 font-semibold text-amber-200">
              <AlertTriangle size={14} /> Gas & funds
            </div>
            <p>
              RH gas is cheap — network <code>gasPrice</code> / feeData only (no
              inflate). A tiny ETH balance covers deploy.
            </p>
            {gasEstimate && (
              <p className="mt-2 font-mono text-[11px] text-[#e8eee9]/60">
                {gasEstimate}
              </p>
            )}
            {gasEth && (
              <p className="mt-1 text-[11px] text-[#00e88f]/80">
                Live estimate: ~{gasEth} ETH
              </p>
            )}
          </div>

          {!isConnected ? (
            <button
              type="button"
              className="king-btn-primary w-full py-3"
              onClick={() => open()}
            >
              Connect Wallet
            </button>
          ) : (
            <button
              type="button"
              className="king-btn-primary w-full py-3"
              disabled={busy}
              onClick={handleDeploy}
            >
              {busy ? "Deploying…" : "Deploy Margin Vault"}
            </button>
          )}

          {status && <p className="text-sm text-[#e8eee9]/70">{status}</p>}

          {deployed && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm">
              <p className="font-semibold text-[#00e88f]">Margin vault deployed!</p>
              <p className="mt-2 break-all font-mono text-xs">{deployed.address}</p>
              <p className="mt-2 text-xs text-[#e8eee9]/55">
                Paste this address into{" "}
                <code className="text-[#e8eee9]/70">NEXT_PUBLIC_MARGIN_VAULT</code>{" "}
                on Vercel if env is needed. Then seed with{" "}
                <code className="text-[#e8eee9]/70">depositLender()</code> + ETH.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  href={explorerAddress(deployed.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#00e88f] hover:underline"
                >
                  Explorer <ExternalLink size={12} />
                </a>
                {deployed.txHash && (
                  <a
                    href={explorerTx(deployed.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#e8eee9]/60 hover:underline"
                  >
                    Tx <ExternalLink size={12} />
                  </a>
                )}
                <Link href="/leverage" className="text-[#00e88f] hover:underline">
                  Open leverage →
                </Link>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-[#e8eee9]/40">
          Constructor:{" "}
          <code className="text-[#e8eee9]/55">(address router_)</code>. Seed note:
          after deploy call <code className="text-[#e8eee9]/55">depositLender()</code>{" "}
          with ETH when ready.
        </p>
      </div>
    </PageTransition>
  );
}
