"use client";

import { useEffect, useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { ROBINHOOD_CHAIN_ID, explorerAddress } from "@/lib/robinhood";
import { Settings } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const [factoryAddress, setFactoryAddress] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    fetch("/api/deployments")
      .then((r) => r.json())
      .then((d) => {
        const fa = d?.deployments?.factoryAddress || "";
        setFactoryAddress(fa);
        setSaved(fa);
      })
      .catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!/^0x[a-fA-F0-9]{40}$/.test(factoryAddress.trim())) {
      setStatus("Enter a valid 0x address.");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factoryAddress: factoryAddress.trim(),
          chainId: ROBINHOOD_CHAIN_ID,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Save failed");
      }
      setSaved(factoryAddress.trim());
      setStatus("Factory address saved to data/deployments.json + public/deployments/robinhood.json");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <Settings className="text-[#00e88f]" size={26} />
          <div>
            <h1 className="text-2xl font-bold text-[#e8eee9]">Settings</h1>
            <p className="text-sm text-[#e8eee9]/55">
              Paste an existing KingNFTFactory address (no private keys)
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="king-panel space-y-4 p-5">
          <label className="block text-sm">
            <span className="text-[#e8eee9]/70">Factory address</span>
            <input
              className="king-input mt-1 w-full font-mono text-sm"
              value={factoryAddress}
              onChange={(e) => setFactoryAddress(e.target.value)}
              placeholder="0x…"
            />
          </label>
          <button
            type="submit"
            className="king-btn-primary w-full py-3"
            disabled={busy}
          >
            {busy ? "Saving…" : "Save factory address"}
          </button>
          {status && <p className="text-sm text-[#e8eee9]/65">{status}</p>}
          {saved && (
            <p className="text-xs text-[#e8eee9]/45">
              Current:{" "}
              <a
                href={explorerAddress(saved)}
                className="text-[#00e88f]"
                target="_blank"
                rel="noreferrer"
              >
                {saved}
              </a>
            </p>
          )}
        </form>

        <p className="mt-4 text-xs text-[#e8eee9]/40">
          Prefer to deploy a new factory?{" "}
          <Link href="/deploy" className="text-[#00e88f]">
            Go to /deploy
          </Link>{" "}
          and sign with your wallet.
        </p>
      </div>
    </PageTransition>
  );
}
