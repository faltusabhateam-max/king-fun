"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Contract, parseEther, formatEther, Interface } from "ethers";
import { PageTransition } from "@/components/PageTransition";
import { ensureRobinhoodChain, getBrowserProvider } from "@/lib/wallet-evm";
import { explorerAddress } from "@/lib/robinhood";
import FactoryArtifact from "@/lib/abi/KingNFTFactory.json";
import { Rocket, Upload, X } from "lucide-react";

const STOCK_OPTIONS = ["", "NVDA", "GOOGL", "AAPL"] as const;
const MAX_PFP_BYTES = 900_000;
const MAX_PFPS = 24;

export default function LaunchPage() {
  const router = useRouter();
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  const [factoryAddress, setFactoryAddress] = useState("");
  const [createFeeWei, setCreateFeeWei] = useState("0");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [maxSupply, setMaxSupply] = useState(1000);
  const [mintPriceEth, setMintPriceEth] = useState("0.01");
  const [baseURI, setBaseURI] = useState("ipfs://");
  const [pfps, setPfps] = useState<string[]>([]);
  const [stockPair, setStockPair] = useState<string>("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/deployments")
      .then((r) => r.json())
      .then(async (d) => {
        const fa = d?.deployments?.factoryAddress;
        if (fa) {
          setFactoryAddress(fa);
          setCreateFeeWei(d.deployments.createFeeWei || "0");
          try {
            const provider = await getBrowserProvider();
            if (provider && fa) {
              const c = new Contract(fa, FactoryArtifact.abi, provider);
              const fee = await c.createFee();
              setCreateFeeWei(fee.toString());
            }
          } catch {
            /* offline */
          }
        }
      })
      .catch(() => {});
  }, []);

  async function onPfps(files: FileList | null) {
    if (!files?.length) return;
    const next = [...pfps];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_PFPS) {
        setStatus(`Max ${MAX_PFPS} PFPs per collection.`);
        break;
      }
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_PFP_BYTES) {
        setStatus(`${file.name} too large (max ~0.9MB each).`);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      next.push(dataUrl);
    }
    setPfps(next);
  }

  function removePfp(i: number) {
    setPfps((p) => p.filter((_, idx) => idx !== i));
  }

  async function handleLaunch(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected || !address) {
      open();
      return;
    }
    if (!factoryAddress) {
      setStatus("Factory not ready yet. Try again shortly.");
      return;
    }
    if (!name.trim() || !symbol.trim()) {
      setStatus("Name and symbol required.");
      return;
    }
    if (pfps.length === 0) {
      setStatus("Upload at least one PFP from your gallery.");
      return;
    }
    if (maxSupply < 1) {
      setStatus("Total supply must be at least 1.");
      return;
    }

    setBusy(true);
    setStatus("Preparing createCollection…");
    try {
      const provider = await getBrowserProvider();
      if (!provider) throw new Error("No wallet provider");
      await ensureRobinhoodChain(provider);
      const signer = await provider.getSigner();
      const factory = new Contract(factoryAddress, FactoryArtifact.abi, signer);

      let fee = 0n;
      try {
        fee = BigInt(await factory.createFee());
      } catch {
        fee = BigInt(createFeeWei || "0");
      }

      const mintPriceWei = parseEther(mintPriceEth || "0");
      setStatus("Confirm createCollection in your wallet…");
      const tx = await factory.createCollection(
        name.trim(),
        symbol.trim().toUpperCase(),
        maxSupply,
        mintPriceWei,
        baseURI,
        0,
        { value: fee }
      );
      setStatus("Waiting for confirmation…");
      const receipt = await tx.wait();

      let collectionAddr = "";
      const iface = new Interface(FactoryArtifact.abi);
      for (const log of receipt.logs || []) {
        try {
          const parsed = iface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (parsed?.name === "CollectionCreated") {
            collectionAddr = parsed.args.collection as string;
            break;
          }
        } catch {
          /* skip */
        }
      }
      if (!collectionAddr) {
        throw new Error("CollectionCreated event not found");
      }

      let platformFeeBps = 250;
      try {
        platformFeeBps = Number(await factory.defaultPlatformFeeBps());
      } catch {
        /* default */
      }

      await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: collectionAddr,
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
          description,
          image: pfps[0],
          pfps,
          stockPair: stockPair || undefined,
          creator: address,
          maxSupply,
          mintPriceWei: mintPriceWei.toString(),
          mintPriceEth,
          baseURI,
          platformFeeBps,
          txHash: receipt.hash,
          factoryAddress,
        }),
      });

      setStatus(`Created ${collectionAddr}`);
      router.push(`/collection/${collectionAddr}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Launch failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-xl">
        <h1 className="mb-2 text-2xl font-black sm:text-3xl">Launch collection</h1>
        <p className="mb-6 text-sm text-[var(--muted)]">
          One creator profile. Upload PFPs. Set total supply across the set.
          {createFeeWei !== "0" && (
            <>
              {" "}
              Create fee:{" "}
              <span className="font-bold text-[var(--accent)]">
                {formatEther(BigInt(createFeeWei || "0"))} ETH
              </span>
              .
            </>
          )}
        </p>

        {!factoryAddress && (
          <div className="paper-panel mb-4 p-4 text-sm text-amber-100/80">
            Factory address loading… If this stays empty, refresh in a minute.
          </div>
        )}

        <form onSubmit={handleLaunch} className="paper-panel space-y-4 p-5">
          <label className="block text-sm">
            <span className="king-label">Name</span>
            <input
              className="king-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={64}
              placeholder="Creator profile / collection"
            />
          </label>
          <label className="block text-sm">
            <span className="king-label">Symbol</span>
            <input
              className="king-input"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
              maxLength={16}
            />
          </label>
          <label className="block text-sm">
            <span className="king-label">Bio</span>
            <textarea
              className="king-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short English bio"
            />
          </label>

          <div>
            <span className="king-label">PFP gallery</span>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--cut)] bg-[var(--paper-deep)] p-5 text-sm text-[var(--muted)] hover:border-[var(--accent)]">
              <Upload size={20} className="text-[var(--accent)]" />
              <span className="font-bold text-[var(--ink)]">
                Pick images from gallery
              </span>
              <span className="text-xs">Multi-select · max {MAX_PFPS} · ~0.9MB each</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onPfps(e.target.files)}
              />
            </label>
            {pfps.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {pfps.map((src, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg border-2 border-[var(--cut)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`PFP ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePfp(i)}
                      className="absolute right-1 top-1 rounded bg-black/70 p-0.5 text-white"
                      aria-label="Remove"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="king-label">Total supply</span>
              <input
                type="number"
                className="king-input"
                value={maxSupply}
                min={1}
                max={100000}
                onChange={(e) => setMaxSupply(Number(e.target.value))}
              />
              <span className="mt-1 block text-[10px] text-[var(--muted)]">
                Mints across all PFPs in this collection
              </span>
            </label>
            <label className="block text-sm">
              <span className="king-label">Mint price (ETH)</span>
              <input
                className="king-input"
                value={mintPriceEth}
                onChange={(e) => setMintPriceEth(e.target.value)}
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="king-label">Stock pair (optional)</span>
            <select
              className="king-input"
              value={stockPair}
              onChange={(e) => setStockPair(e.target.value)}
            >
              <option value="">None</option>
              {STOCK_OPTIONS.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="king-label">Base URI</span>
            <input
              className="king-input font-mono text-xs"
              value={baseURI}
              onChange={(e) => setBaseURI(e.target.value)}
              placeholder="ipfs://… or https://…"
            />
          </label>

          <button
            type="submit"
            className="king-btn-primary w-full py-3"
            disabled={busy || !factoryAddress}
          >
            <Rocket size={18} />
            {busy ? "Creating…" : isConnected ? "Create collection" : "Connect & create"}
          </button>
          {status && <p className="text-sm text-[var(--muted)]">{status}</p>}
        </form>

        {factoryAddress && (
          <p className="mt-3 text-xs text-[var(--muted)]">
            Factory:{" "}
            <a
              href={explorerAddress(factoryAddress)}
              className="text-[var(--accent)]"
              target="_blank"
              rel="noreferrer"
            >
              {factoryAddress.slice(0, 10)}…
            </a>
          </p>
        )}
      </div>
    </PageTransition>
  );
}
