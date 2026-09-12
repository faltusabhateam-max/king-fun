"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Contract, formatEther } from "ethers";
import { PageTransition } from "@/components/PageTransition";
import { ensureRobinhoodChain, getBrowserProvider } from "@/lib/wallet-evm";
import { explorerAddress, explorerTx } from "@/lib/robinhood";
import CollectionArtifact from "@/lib/abi/KingNFTCollection.json";
import type { CollectionRecord } from "@/lib/types";
import { shortAddr } from "@/lib/format";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface OnChainInfo {
  name: string;
  symbol: string;
  maxSupply: bigint;
  mintPrice: bigint;
  totalMinted: bigint;
  remaining: bigint;
  paused: boolean;
  creator: string;
  platformFeeBps: bigint;
  platformTreasury: string;
  totalVolumeEth: bigint;
  totalPlatformFeesEth: bigint;
}

export default function CollectionPage() {
  const params = useParams();
  const address = String(params.address || "");
  const { open } = useAppKit();
  const { address: wallet, isConnected } = useAppKitAccount();

  const [meta, setMeta] = useState<CollectionRecord | null>(null);
  const [info, setInfo] = useState<OnChainInfo | null>(null);
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<
    { minter: string; qty: number; paid: string; tx?: string; ts: number }[]
  >([]);

  const load = useCallback(async () => {
    if (!address) return;
    try {
      const r = await fetch(`/api/collections?address=${address}`);
      if (r.ok) {
        const d = await r.json();
        setMeta(d.collection);
      }
    } catch {
      /* ignore */
    }
    try {
      const provider = await getBrowserProvider();
      if (!provider) {
        // public RPC fallback via ethers JsonRpcProvider would need import —
        // try window ethereum only for now
        return;
      }
      const c = new Contract(address, CollectionArtifact.abi, provider);
      const [
        name,
        symbol,
        maxSupply,
        mintPrice,
        totalMinted,
        remaining,
        paused,
        creator,
        platformFeeBps,
        platformTreasury,
        totalVolumeEth,
        totalPlatformFeesEth,
      ] = await Promise.all([
        c.name(),
        c.symbol(),
        c.maxSupply(),
        c.mintPrice(),
        c.totalMinted(),
        c.remainingSupply(),
        c.mintingPaused(),
        c.creator(),
        c.platformFeeBps(),
        c.platformTreasury(),
        c.totalVolumeEth(),
        c.totalPlatformFeesEth(),
      ]);
      setInfo({
        name,
        symbol,
        maxSupply,
        mintPrice,
        totalMinted,
        remaining,
        paused,
        creator,
        platformFeeBps,
        platformTreasury,
        totalVolumeEth,
        totalPlatformFeesEth,
      });
    } catch (e) {
      setStatus(
        `On-chain read failed (switch to Robinhood Chain?): ${
          e instanceof Error ? e.message : "error"
        }`
      );
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleMint() {
    if (!isConnected || !wallet) {
      open();
      return;
    }
    setBusy(true);
    setStatus("Confirm mint in your wallet…");
    try {
      const provider = await getBrowserProvider();
      if (!provider) throw new Error("No wallet");
      await ensureRobinhoodChain(provider);
      const signer = await provider.getSigner();
      const c = new Contract(address, CollectionArtifact.abi, signer);
      const price: bigint = await c.mintPrice();
      const value = price * BigInt(qty);
      const tx = await c.mint(qty, { value });
      setStatus("Waiting for confirmation…");
      const receipt = await tx.wait();
      setActivity((prev) => [
        {
          minter: wallet,
          qty,
          paid: formatEther(value),
          tx: receipt.hash,
          ts: Date.now(),
        },
        ...prev,
      ]);
      setStatus(`Minted ${qty} NFT(s)!`);
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Mint failed");
    } finally {
      setBusy(false);
    }
  }

  const title = info?.name || meta?.name || "Collection";
  const symbol = info?.symbol || meta?.symbol || "";
  const mintPrice = info?.mintPrice ?? BigInt(meta?.mintPriceWei || "0");
  const totalCost = mintPrice * BigInt(qty);

  return (
    <PageTransition>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="paper-panel overflow-hidden">
            <div className="aspect-square max-h-[420px] bg-[var(--paper-deep)] sm:aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={meta?.image || "/logo.png"}
                alt={title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-5">
              <h1 className="text-2xl font-bold text-[var(--ink)]">
                {title}{" "}
                <span className="text-[var(--accent)]">${symbol}</span>
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {meta?.description || "NFT collection on Robinhood Chain"}
              </p>
              {meta?.stockPair && (
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
                  Stock pair · {meta.stockPair}
                </p>
              )}
              {meta?.pfps && meta.pfps.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {meta.pfps.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt={`PFP ${i + 1}`}
                      className="aspect-square rounded-lg border-2 border-[var(--cut)] object-cover"
                    />
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                <a
                  href={explorerAddress(address)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--accent)]"
                >
                  {shortAddr(address, 6)} <ExternalLink size={12} />
                </a>
                {info && (
                  <>
                    <span>
                      Creator {shortAddr(info.creator)}
                    </span>
                    <span>
                      Platform fee {(Number(info.platformFeeBps) / 100).toFixed(2)}%
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="paper-panel mt-4 p-5">
            <h2 className="mb-3 font-semibold text-[var(--ink)]">Activity</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No mints in this session yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {activity.map((a, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--paper-deep)] px-3 py-2"
                  >
                    <span>
                      {shortAddr(a.minter)} minted {a.qty} for {a.paid} ETH
                    </span>
                    {a.tx && (
                      <a
                        href={explorerTx(a.tx)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--accent)]"
                      >
                        tx
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="paper-panel h-fit space-y-4 p-5">
          <h2 className="font-semibold text-[var(--ink)]">Mint</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-[var(--paper-deep)] p-3">
              <p className="text-xs text-[var(--muted)]">Minted</p>
              <p className="text-lg font-semibold text-[var(--accent)]">
                {info ? info.totalMinted.toString() : "—"}
                <span className="text-sm text-[var(--muted)]">
                  /{info ? info.maxSupply.toString() : meta?.maxSupply || "—"}
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-[var(--paper-deep)] p-3">
              <p className="text-xs text-[var(--muted)]">Price</p>
              <p className="text-lg font-semibold text-[var(--ink)]">
                {formatEther(mintPrice)} ETH
              </p>
            </div>
          </div>

          {info?.paused && (
            <p className="text-xs text-amber-200">Minting is paused by owner.</p>
          )}

          <label className="block text-sm">
            <span className="text-[var(--muted)]">Quantity (1–20)</span>
            <input
              type="number"
              min={1}
              max={20}
              className="king-input mt-1 w-full"
              value={qty}
              onChange={(e) =>
                setQty(Math.min(20, Math.max(1, Number(e.target.value) || 1)))
              }
            />
          </label>
          <p className="text-xs text-[var(--muted)]">
            Total: {formatEther(totalCost)} ETH
            {info && (
              <>
                {" "}
                · platform cut{" "}
                {formatEther(
                  (totalCost * info.platformFeeBps) / BigInt(10000)
                )}{" "}
                ETH
              </>
            )}
          </p>

          <button
            type="button"
            className="king-btn-primary w-full py-3"
            disabled={busy || !!info?.paused}
            onClick={handleMint}
          >
            {busy ? "Minting…" : isConnected ? "Mint" : "Connect & mint"}
          </button>
          {status && <p className="text-xs text-[var(--muted)]">{status}</p>}

          {info && (
            <div className="border-t border-[var(--cut)] pt-3 text-xs text-[var(--muted)]">
              <p>Volume: {formatEther(info.totalVolumeEth)} ETH</p>
              <p>
                Platform fees paid:{" "}
                {formatEther(info.totalPlatformFeesEth)} ETH
              </p>
            </div>
          )}

          <Link href="/explore" className="block text-center text-xs text-[var(--accent)]">
            ← Back to explore
          </Link>
        </div>
      </div>
    </PageTransition>
  );
}
