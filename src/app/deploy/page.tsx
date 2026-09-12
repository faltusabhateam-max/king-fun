"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { ContractFactory, parseEther } from "ethers";
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
  DEFAULT_CREATE_FEE_ETH,
  DEFAULT_PLATFORM_FEE_BPS,
} from "@/lib/robinhood";
import FactoryArtifact from "@/lib/abi/KingNFTFactory.json";
import { Factory, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function DeployPage() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  const [treasury, setTreasury] = useState("");
  const [createFeeEth, setCreateFeeEth] = useState(DEFAULT_CREATE_FEE_ETH);
  const [feeBps, setFeeBps] = useState(DEFAULT_PLATFORM_FEE_BPS);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [deployed, setDeployed] = useState<{
    address: string;
    txHash: string;
  } | null>(null);
  const [existing, setExisting] = useState<string>("");

  useEffect(() => {
    if (address && !treasury) setTreasury(address);
  }, [address, treasury]);

  useEffect(() => {
    fetch("/api/deployments")
      .then((r) => r.json())
      .then((d) => {
        const fa = d?.deployments?.factoryAddress;
        if (fa && fa !== "0x0000000000000000000000000000000000000000") {
          setExisting(fa);
        }
      })
      .catch(() => {});
  }, []);

  const feePct = useMemo(() => (feeBps / 100).toFixed(2), [feeBps]);

  const estimateGas = useCallback(async () => {
    if (!isConnected || !address) return;
    try {
      const provider = await getBrowserProvider();
      if (!provider) return;
      await ensureRobinhoodChain(provider);
      const signer = await provider.getSigner();
      const factory = new ContractFactory(
        FactoryArtifact.abi,
        FactoryArtifact.bytecode,
        signer
      );
      const createFeeWei = parseEther(createFeeEth || "0");
      const deployTx = await factory.getDeployTransaction(
        treasury || address,
        feeBps,
        createFeeWei
      );
      const gas = await provider.estimateGas({
        ...deployTx,
        from: address,
      });
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? BigInt(0);
      const cost = gas * gasPrice;
      setGasEstimate(
        `~${gas.toString()} gas · ~${formatEth(cost, 8)} ETH (cheap on RH Chain; ~$5 ETH buffer is plenty)`
      );
    } catch (e) {
      setGasEstimate(
        `Could not estimate yet: ${e instanceof Error ? e.message : "error"}. Ensure you are on Robinhood Chain and have ETH.`
      );
    }
  }, [isConnected, address, treasury, createFeeEth, feeBps]);

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
    if (!treasury || !/^0x[a-fA-F0-9]{40}$/.test(treasury)) {
      setStatus("Enter a valid platform treasury address (0x…).");
      return;
    }
    if (feeBps < 0 || feeBps > 2500) {
      setStatus("Platform fee bps must be 0–2500 (max 25%).");
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

      setStatus("Confirm Deploy Factory in your wallet…");
      const createFeeWei = parseEther(createFeeEth || "0");
      const factory = new ContractFactory(
        FactoryArtifact.abi,
        FactoryArtifact.bytecode,
        signer
      );
      const contract = await factory.deploy(treasury, feeBps, createFeeWei);
      setStatus("Waiting for confirmation…");
      await contract.waitForDeployment();
      const factoryAddress = await contract.getAddress();
      const tx = contract.deploymentTransaction();
      const txHash = tx?.hash || "";

      setStatus("Saving factory address…");
      await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factoryAddress,
          deployer: address,
          createFeeWei: createFeeWei.toString(),
          platformFeeBps: feeBps,
          platformTreasury: treasury,
          txHash,
          chainId: ROBINHOOD_CHAIN_ID,
        }),
      });

      setDeployed({ address: factoryAddress, txHash });
      setExisting(factoryAddress);
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
          <Factory className="text-[#00e88f]" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-[#e8eee9] sm:text-3xl">
              Deploy Factory
            </h1>
            <p className="text-sm text-[#e8eee9]/55">
              Robinhood Chain · Chain ID 4663 · You sign — no private keys stored
            </p>
          </div>
        </div>

        <div className="king-panel mb-4 border-emerald-400/30 p-4">
          <p className="text-sm font-semibold text-[#00e88f]">
            You earn launch fees + {feePct}% of all mint volume
          </p>
          <p className="mt-1 text-xs text-[#e8eee9]/55">
            <strong>createFee</strong> (ETH) is pushed 100% to your treasury on
            every collection launch. On every NFT mint,{" "}
            <strong>{feePct}%</strong> of the mint payment goes to treasury; the
            rest goes to the creator. Fees are sent directly (push) — no
            custody in the factory.
          </p>
        </div>

        {existing && (
          <div className="king-panel mb-4 flex flex-wrap items-center gap-2 p-4 text-sm">
            <CheckCircle2 className="text-[#00e88f]" size={18} />
            <span className="text-[#e8eee9]/70">Factory on file:</span>
            <a
              href={explorerAddress(existing)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[#00e88f] hover:underline"
            >
              {existing.slice(0, 10)}…{existing.slice(-8)}
            </a>
            <Link href="/launch" className="king-btn-ghost ml-auto text-xs">
              Launch NFT →
            </Link>
          </div>
        )}

        <div className="king-panel space-y-4 p-5">
          <label className="block text-sm">
            <span className="text-[#e8eee9]/70">Platform treasury</span>
            <input
              className="king-input mt-1 w-full font-mono text-sm"
              value={treasury}
              onChange={(e) => setTreasury(e.target.value)}
              placeholder="0x… (defaults to your wallet)"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-[#e8eee9]/70">createFee (ETH)</span>
              <input
                className="king-input mt-1 w-full"
                value={createFeeEth}
                onChange={(e) => setCreateFeeEth(e.target.value)}
                placeholder="0.0001"
              />
            </label>
            <label className="block text-sm">
              <span className="text-[#e8eee9]/70">
                defaultPlatformFeeBps ({feePct}%)
              </span>
              <input
                type="number"
                className="king-input mt-1 w-full"
                value={feeBps}
                min={0}
                max={2500}
                onChange={(e) => setFeeBps(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-100/80">
            <div className="mb-1 flex items-center gap-2 font-semibold text-amber-200">
              <AlertTriangle size={14} /> Gas & funds
            </div>
            <p>
              You need a little ETH on Robinhood Chain for deploy gas. RH gas is
              cheap — about <strong>~$5 of ETH</strong> is a comfortable buffer
              for factory deploy + a few collection creates.
            </p>
            {gasEstimate && (
              <p className="mt-2 font-mono text-[11px] text-[#e8eee9]/60">
                {gasEstimate}
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
              {busy ? "Deploying…" : "Deploy Factory"}
            </button>
          )}

          {status && (
            <p className="text-sm text-[#e8eee9]/70">{status}</p>
          )}

          {deployed && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm">
              <p className="font-semibold text-[#00e88f]">Factory deployed!</p>
              <p className="mt-2 break-all font-mono text-xs">
                {deployed.address}
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
                <Link href="/launch" className="text-[#00e88f] hover:underline">
                  Create a collection →
                </Link>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-[#e8eee9]/40">
          Constructor:{" "}
          <code className="text-[#e8eee9]/55">
            (platformTreasury, defaultPlatformFeeBps, createFee)
          </code>
          . Paste an existing factory in{" "}
          <Link href="/settings" className="text-[#00e88f]">
            Settings
          </Link>
          .
        </p>
      </div>
    </PageTransition>
  );
}
