"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Contract, parseEther, formatEther, Interface } from "ethers";
import { PageTransition } from "@/components/PageTransition";
import { ensureRobinhoodChain, getBrowserProvider } from "@/lib/wallet-evm";
import { explorerAddress } from "@/lib/robinhood";
import FactoryArtifact from "@/lib/abi/KingNFTFactory.json";
import { Rocket, Upload } from "lucide-react";
import Link from "next/link";

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
  const [image, setImage] = useState("/logo.png");
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
          // refresh live createFee from chain if possible
          try {
            const provider = await getBrowserProvider();
            if (provider && fa) {
              const c = new Contract(fa, FactoryArtifact.abi, provider);
              const fee = await c.createFee();
              setCreateFeeWei(fee.toString());
            }
          } catch {
            /* offline / wrong chain */
          }
        }
      })
      .catch(() => {});
  }, []);

  async function onImage(file: File | null) {
    if (!file) return;
    if (file.size > 1_500_000) {
      setStatus("Image too large (max ~1.5MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function handleLaunch(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected || !address) {
      open();
      return;
    }
    if (!factoryAddress) {
      setStatus("No factory deployed. Go to /deploy first.");
      return;
    }
    if (!name.trim() || !symbol.trim()) {
      setStatus("Name and symbol are required.");
      return;
    }

    setBusy(true);
    setStatus("Preparing createCollection…");
    try {
      const provider = await getBrowserProvider();
      if (!provider) throw new Error("No wallet provider");
      await ensureRobinhoodChain(provider);
      const signer = await provider.getSigner();
      const factory = new Contract(
        factoryAddress,
        FactoryArtifact.abi,
        signer
      );

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
        0, // creatorFeeBps reserved
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
          /* not our event */
        }
      }

      if (!collectionAddr) {
        throw new Error("CollectionCreated event not found in receipt");
      }

      let platformFeeBps = 250;
      try {
        platformFeeBps = Number(await factory.defaultPlatformFeeBps());
      } catch {
        /* use default */
      }

      await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: collectionAddr,
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
          description,
          image,
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
        <h1 className="mb-2 text-2xl font-bold text-[#e8eee9] sm:text-3xl">
          Launch NFT collection
        </h1>
        <p className="mb-6 text-sm text-[#e8eee9]/55">
          Calls factory.createCollection — you sign on Robinhood Chain.
          {createFeeWei !== "0" && (
            <>
              {" "}
              Create fee:{" "}
              <span className="text-[#00e88f]">
                {formatEther(BigInt(createFeeWei || "0"))} ETH
              </span>{" "}
              → platform treasury.
            </>
          )}
        </p>

        {!factoryAddress && (
          <div className="king-panel mb-4 p-4 text-sm text-amber-100/80">
            No factory address set.{" "}
            <Link href="/deploy" className="text-[#00e88f] underline">
              Deploy Factory
            </Link>{" "}
            or paste one in{" "}
            <Link href="/settings" className="text-[#00e88f] underline">
              Settings
            </Link>
            .
          </div>
        )}

        <form onSubmit={handleLaunch} className="king-panel space-y-4 p-5">
          <label className="block text-sm">
            <span className="text-[#e8eee9]/70">Name</span>
            <input
              className="king-input mt-1 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={64}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[#e8eee9]/70">Symbol</span>
            <input
              className="king-input mt-1 w-full"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
              maxLength={16}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[#e8eee9]/70">Description</span>
            <textarea
              className="king-input mt-1 w-full"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-[#e8eee9]/70">Max supply</span>
              <input
                type="number"
                className="king-input mt-1 w-full"
                value={maxSupply}
                min={1}
                max={100000}
                onChange={(e) => setMaxSupply(Number(e.target.value))}
              />
            </label>
            <label className="block text-sm">
              <span className="text-[#e8eee9]/70">Mint price (ETH)</span>
              <input
                className="king-input mt-1 w-full"
                value={mintPriceEth}
                onChange={(e) => setMintPriceEth(e.target.value)}
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-[#e8eee9]/70">Base URI</span>
            <input
              className="king-input mt-1 w-full font-mono text-xs"
              value={baseURI}
              onChange={(e) => setBaseURI(e.target.value)}
              placeholder="ipfs://… or https://…"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-emerald-400/30 p-4 text-sm text-[#e8eee9]/60">
            <Upload size={18} className="text-[#00e88f]" />
            <span>Cover image (optional, stored in metadata cache)</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onImage(e.target.files?.[0] || null)}
            />
          </label>
          {image && image !== "/logo.png" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt="preview"
              className="h-24 w-24 rounded-xl object-cover"
            />
          )}

          <button
            type="submit"
            className="king-btn-primary w-full py-3"
            disabled={busy || !factoryAddress}
          >
            <Rocket size={18} />
            {busy ? "Creating…" : isConnected ? "Create collection" : "Connect & create"}
          </button>
          {status && <p className="text-sm text-[#e8eee9]/65">{status}</p>}
        </form>

        {factoryAddress && (
          <p className="mt-3 text-xs text-[#e8eee9]/40">
            Factory:{" "}
            <a
              href={explorerAddress(factoryAddress)}
              className="text-[#00e88f]"
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
