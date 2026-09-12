"use client";

import { useEffect, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { Contract, formatEther, JsonRpcProvider } from "ethers";
import { PageTransition } from "@/components/PageTransition";
import {
  ROBINHOOD_RPC,
  explorerAddress,
  DEFAULT_PLATFORM_FEE_BPS,
} from "@/lib/robinhood";
import FactoryArtifact from "@/lib/abi/KingNFTFactory.json";
import CollectionArtifact from "@/lib/abi/KingNFTCollection.json";
import type { CollectionRecord } from "@/lib/types";
import { shortAddr } from "@/lib/format";
import { Crown, ExternalLink } from "lucide-react";
import Link from "next/link";

interface FactoryStats {
  platformTreasury: string;
  createFee: bigint;
  defaultPlatformFeeBps: bigint;
  totalVolumeEth: bigint;
  totalPlatformFeesEth: bigint;
  totalCreateFeesEth: bigint;
  collectionsCount: bigint;
}

export default function FeesPage() {
  const { address } = useAppKitAccount();
  const [factoryAddress, setFactoryAddress] = useState("");
  const [stats, setStats] = useState<FactoryStats | null>(null);
  const [creatorCols, setCreatorCols] = useState<
    { col: CollectionRecord; volume: string; fees: string; creatorProceeds: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetch("/api/deployments").then((r) => r.json());
        const fa = d?.deployments?.factoryAddress;
        if (!fa) {
          setError("No factory deployed yet.");
          return;
        }
        setFactoryAddress(fa);
        const provider = new JsonRpcProvider(ROBINHOOD_RPC);
        const factory = new Contract(fa, FactoryArtifact.abi, provider);
        const [
          platformTreasury,
          createFee,
          defaultPlatformFeeBps,
          totalVolumeEth,
          totalPlatformFeesEth,
          totalCreateFeesEth,
          collectionsCount,
        ] = await Promise.all([
          factory.platformTreasury(),
          factory.createFee(),
          factory.defaultPlatformFeeBps(),
          factory.totalVolumeEth(),
          factory.totalPlatformFeesEth(),
          factory.totalCreateFeesEth(),
          factory.collectionsCount(),
        ]);
        setStats({
          platformTreasury,
          createFee,
          defaultPlatformFeeBps,
          totalVolumeEth,
          totalPlatformFeesEth,
          totalCreateFeesEth,
          collectionsCount,
        });
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Could not read factory (RPC may be unreachable)"
        );
      }
    })();
  }, []);

  useEffect(() => {
    if (!address) {
      setCreatorCols([]);
      return;
    }
    (async () => {
      try {
        const data = await fetch("/api/collections").then((r) => r.json());
        const mine: CollectionRecord[] = (data.collections || []).filter(
          (c: CollectionRecord) =>
            c.creator.toLowerCase() === address.toLowerCase()
        );
        const provider = new JsonRpcProvider(ROBINHOOD_RPC);
        const rows = [];
        for (const col of mine) {
          try {
            const c = new Contract(
              col.address,
              CollectionArtifact.abi,
              provider
            );
            const [volume, fees, proceeds] = await Promise.all([
              c.totalVolumeEth(),
              c.totalPlatformFeesEth(),
              c.totalCreatorProceedsEth(),
            ]);
            rows.push({
              col,
              volume: formatEther(volume),
              fees: formatEther(fees),
              creatorProceeds: formatEther(proceeds),
            });
          } catch {
            rows.push({
              col,
              volume: "—",
              fees: "—",
              creatorProceeds: "—",
            });
          }
        }
        setCreatorCols(rows);
      } catch {
        /* ignore */
      }
    })();
  }, [address]);

  const bps = stats
    ? Number(stats.defaultPlatformFeeBps)
    : DEFAULT_PLATFORM_FEE_BPS;
  const feePct = (bps / 100).toFixed(2);

  return (
    <PageTransition>
      <div className="mb-6 flex items-center gap-3">
        <Crown className="text-[#00e88f]" size={26} />
        <div>
          <h1 className="text-2xl font-bold text-[#e8eee9]">Fees & earnings</h1>
          <p className="text-sm text-[#e8eee9]/55">
            Platform treasury earns createFee + {feePct}% of mint volume (push
            model — paid on each tx)
          </p>
        </div>
      </div>

      {!factoryAddress && (
        <div className="king-panel mb-4 p-4 text-sm">
          {error || "No factory yet."}{" "}
          <Link href="/deploy" className="text-[#00e88f] underline">
            Deploy Factory
          </Link>
        </div>
      )}

      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="king-panel p-4">
            <p className="text-xs uppercase tracking-wide text-[#e8eee9]/45">
              Platform treasury
            </p>
            <a
              href={explorerAddress(stats.platformTreasury)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 font-mono text-sm text-[#00e88f]"
            >
              {shortAddr(stats.platformTreasury, 6)} <ExternalLink size={12} />
            </a>
          </div>
          <div className="king-panel p-4">
            <p className="text-xs uppercase tracking-wide text-[#e8eee9]/45">
              createFee
            </p>
            <p className="mt-1 text-lg font-semibold text-[#e8eee9]">
              {formatEther(stats.createFee)} ETH
            </p>
          </div>
          <div className="king-panel p-4">
            <p className="text-xs uppercase tracking-wide text-[#e8eee9]/45">
              Mint platform fee
            </p>
            <p className="mt-1 text-lg font-semibold text-[#00e88f]">
              {feePct}%
            </p>
          </div>
          <div className="king-panel p-4">
            <p className="text-xs uppercase tracking-wide text-[#e8eee9]/45">
              Collections
            </p>
            <p className="mt-1 text-lg font-semibold text-[#e8eee9]">
              {stats.collectionsCount.toString()}
            </p>
          </div>
          <div className="king-panel p-4">
            <p className="text-xs uppercase tracking-wide text-[#e8eee9]/45">
              Platform fees (create + reported)
            </p>
            <p className="mt-1 text-lg font-semibold text-[#00e88f]">
              {formatEther(stats.totalPlatformFeesEth)} ETH
            </p>
          </div>
          <div className="king-panel p-4">
            <p className="text-xs uppercase tracking-wide text-[#e8eee9]/45">
              Create fees collected
            </p>
            <p className="mt-1 text-lg font-semibold text-[#e8eee9]">
              {formatEther(stats.totalCreateFeesEth)} ETH
            </p>
          </div>
        </div>
      )}

      <div className="king-panel mb-6 p-5 text-sm text-[#e8eee9]/65">
        <h2 className="mb-2 font-semibold text-[#e8eee9]">How it works</h2>
        <ul className="list-disc space-y-1 pl-5 text-[#e8eee9]/55">
          <li>
            <strong className="text-[#e8eee9]/80">Launch:</strong> creator pays
            createFee → 100% pushed to platformTreasury.
          </li>
          <li>
            <strong className="text-[#e8eee9]/80">Mint:</strong> buyer pays
            mintPrice × qty → platformFeeBps to treasury, remainder to creator
            (both pushed in the same tx). Emits MintWithFees.
          </li>
          <li>
            Creators do not need a withdraw — proceeds arrive in their wallet
            automatically. Platform owner can setCreateFee /
            setDefaultPlatformFeeBps / setPlatformTreasury on the factory.
          </li>
          <li>
            king.fun never holds custody of mint funds and never asks for seed
            phrases.
          </li>
        </ul>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-[#e8eee9]">
        Your creator collections
      </h2>
      {!address ? (
        <p className="text-sm text-[#e8eee9]/45">
          Connect wallet to see your creator earnings.
        </p>
      ) : creatorCols.length === 0 ? (
        <p className="text-sm text-[#e8eee9]/45">
          No collections created from this wallet yet.{" "}
          <Link href="/launch" className="text-[#00e88f]">
            Launch one
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-3">
          {creatorCols.map((r) => (
            <Link
              key={r.col.address}
              href={`/collection/${r.col.address}`}
              className="king-panel block p-4 hover:border-emerald-400/40"
            >
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-[#e8eee9]">
                  {r.col.name}
                </span>
                <span className="text-sm text-[#00e88f]">
                  {r.creatorProceeds} ETH earned
                </span>
              </div>
              <p className="mt-1 text-xs text-[#e8eee9]/45">
                Volume {r.volume} ETH · platform fees {r.fees} ETH
              </p>
            </Link>
          ))}
        </div>
      )}

      {error && factoryAddress && (
        <p className="mt-4 text-xs text-amber-200/80">{error}</p>
      )}
    </PageTransition>
  );
}
