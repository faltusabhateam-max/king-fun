"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
} from "@reown/appkit/react";
import type { Provider } from "@reown/appkit-adapter-solana/react";
import { Connection, PublicKey } from "@solana/web3.js";
import { PageTransition } from "@/components/PageTransition";
import { buildCreateMintTransaction, estimateMintCostSol } from "@/lib/mint-tx";
import { RPC_URL } from "@/lib/solana";
import { Rocket, Upload } from "lucide-react";

export default function LaunchPage() {
  const router = useRouter();
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Provider>("solana");

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [feePct, setFeePct] = useState(1);
  const [image, setImage] = useState<string>("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onImage(file: File | null) {
    if (!file) return;
    if (file.size > 1_500_000) {
      setStatus("Image too large (max ~1.5MB). Compress or use a smaller file.");
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
    if (!name.trim() || !symbol.trim()) {
      setStatus("Name and symbol are required.");
      return;
    }

    setBusy(true);
    setStatus("Building mint transaction…");

    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const payer = new PublicKey(address);

      let mint = "";
      let signature = "";
      let onChainMint = false;

      if (walletProvider) {
        try {
          const built = await buildCreateMintTransaction({
            connection,
            payer,
            decimals: 6,
            initialSupply: 1_000_000_000,
          });
          setStatus("Confirm mint in your wallet…");
          // serialize / send — provider signs fee payer; mint already partial-signed
          const sig = await walletProvider.signAndSendTransaction(built.transaction);
          signature = typeof sig === "string" ? sig : String(sig);
          await connection.confirmTransaction(signature, "confirmed");
          mint = built.mint;
          onChainMint = true;
          setStatus(`Mint created: ${mint.slice(0, 8)}…`);
        } catch (err) {
          // Fall through: still save launch record if user rejects or RPC fails
          console.error(err);
          setStatus(
            `On-chain mint skipped: ${
              err instanceof Error ? err.message : "wallet/RPC error"
            }. Saving launch record…`
          );
          mint = `curve_${Date.now().toString(36)}`;
        }
      } else {
        mint = `curve_${Date.now().toString(36)}`;
        setStatus("No wallet provider — saving local King Curve launch…");
      }

      const res = await fetch("/api/launches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          symbol: symbol.trim(),
          description: description.trim(),
          image: image || "/logo.png",
          creator: address,
          creatorFeeBps: Math.round(feePct * 100),
          mint,
          signature: signature || undefined,
          onChainMint,
          metadataUri: image?.startsWith("data:")
            ? "data-url://local-image"
            : image || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save launch");

      setStatus("Launch live on king.fun!");
      router.push(`/token/${data.launch.mint}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Launch failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#e8eee9]">Launch</h1>
          <p className="mt-2 text-[#e8eee9]/55">
            Create a Solana meme token. Wallet signs a real SPL mint when
            connected (~{estimateMintCostSol()} SOL rent + fees).
          </p>
        </div>

        <form onSubmit={handleLaunch} className="king-panel space-y-4 p-5 sm:p-6">
          <div>
            <label className="king-label">Name</label>
            <input
              className="king-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Emerald Pepe"
              maxLength={64}
              required
            />
          </div>
          <div>
            <label className="king-label">Symbol</label>
            <input
              className="king-input"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="EPEPE"
              maxLength={12}
              required
            />
          </div>
          <div>
            <label className="king-label">Description</label>
            <textarea
              className="king-input min-h-[96px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="The king of deep space memes…"
              maxLength={500}
            />
          </div>
          <div>
            <label className="king-label">Image</label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-400/30 bg-black/30 p-6 hover:border-emerald-400/50">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt="preview"
                  className="h-24 w-24 rounded-xl object-cover"
                />
              ) : (
                <>
                  <Upload className="text-[#00e88f]" size={22} />
                  <span className="text-sm text-[#e8eee9]/50">
                    Upload PNG/JPG (stored as data URL; IPFS stub ready)
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onImage(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <div>
            <label className="king-label">
              Creator fee: {feePct.toFixed(2)}%
            </label>
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={feePct}
              onChange={(e) => setFeePct(Number(e.target.value))}
              className="w-full accent-[#00e88f]"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="king-btn-primary w-full py-3 text-base"
          >
            <Rocket size={18} />
            {!isConnected
              ? "Connect to Launch"
              : busy
                ? "Launching…"
                : "Launch on king.fun"}
          </button>

          {status && (
            <p className="text-center text-xs text-[#e8eee9]/60">{status}</p>
          )}

          <p className="text-[11px] leading-relaxed text-[#e8eee9]/35">
            king.fun never asks for seed phrases. Bonding-curve buys settle
            against King Curve state until the on-chain program is deployed
            (requires SOL for program deploy). Graduated / listed tokens trade
            via Jupiter.
          </p>
        </form>
      </div>
    </PageTransition>
  );
}
