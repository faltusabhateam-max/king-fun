"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageTransition } from "@/components/PageTransition";
import { CollectionCard } from "@/components/CollectionCard";
import type { CollectionRecord } from "@/lib/types";
import { Compass } from "lucide-react";

export default function ExplorePage() {
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
      <div className="mb-6 flex items-center gap-3">
        <Compass className="text-[var(--accent)]" size={26} />
        <div>
          <h1 className="text-2xl font-black">Explore</h1>
          <p className="text-sm text-[var(--muted)]">
            Collections on Robinhood Chain
          </p>
        </div>
      </div>

      {loading && <p className="text-sm text-[var(--muted)]">Loading…</p>}

      {!loading && collections.length === 0 && (
        <div className="paper-panel p-8 text-center text-sm text-[var(--muted)]">
          No collections yet.{" "}
          <Link href="/launch" className="font-bold text-[var(--accent)]">
            Launch one
          </Link>
          .
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => (
          <CollectionCard key={c.address} c={c} />
        ))}
      </div>
    </PageTransition>
  );
}
