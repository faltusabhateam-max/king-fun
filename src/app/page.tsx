"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Rocket, Compass, Scissors } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { CollectionCard } from "@/components/CollectionCard";
import type { CollectionRecord } from "@/lib/types";

export default function HomePage() {
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/collections")
      .then((r) => r.json())
      .then((d) => setCollections(d.collections || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <section className="relative">
        <div className="paper-panel paper-cut relative overflow-hidden p-6 sm:p-10">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border-2 border-[var(--cut)] bg-[var(--accent-soft)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--accent)]">
            <Scissors size={12} /> Robinhood Chain · PFP launchpad
          </p>
          <h1 className="max-w-2xl text-3xl font-black tracking-tight text-[var(--ink)] sm:text-5xl">
            Cut your collection.{" "}
            <span className="text-[var(--accent)]">Mint the drop.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm text-[var(--muted)] sm:text-base">
            One creator profile. Many PFPs. Set total supply. Fees split on-chain —
            wallet signatures only.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/launch" className="king-btn-primary px-5 py-3">
              <Rocket size={16} /> Launch
            </Link>
            <Link href="/explore" className="king-btn-ghost px-5 py-3">
              <Compass size={16} /> Explore
            </Link>
            <Link href="/about" className="king-btn-ghost px-5 py-3">
              How it works
            </Link>
          </div>
          <p className="mt-5 text-xs text-[var(--muted)]">
            Waitlist: follow{" "}
            <a
              className="font-bold text-[var(--accent)]"
              href="https://x.com/Crypto_King877"
              target="_blank"
              rel="noreferrer"
            >
              @Crypto_King877
            </a>{" "}
            for drops.
          </p>
        </div>

        <div className="mt-10 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Live launches</h2>
            <p className="text-sm text-[var(--muted)]">Fresh collections on king.fun</p>
          </div>
          <Link href="/explore" className="text-sm font-bold text-[var(--accent)]">
            See all →
          </Link>
        </div>

        {loading && (
          <p className="mt-6 text-sm text-[var(--muted)]">Loading feed…</p>
        )}
        {!loading && collections.length === 0 && (
          <div className="paper-panel mt-6 p-8 text-center text-sm text-[var(--muted)]">
            No launches yet.{" "}
            <Link href="/launch" className="font-bold text-[var(--accent)]">
              Be first
            </Link>
            .
          </div>
        )}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.slice(0, 6).map((c, i) => (
            <motion.div
              key={c.address}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <CollectionCard c={c} />
            </motion.div>
          ))}
        </div>
      </section>
    </PageTransition>
  );
}
