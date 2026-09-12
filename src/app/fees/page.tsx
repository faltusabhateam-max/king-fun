import Link from "next/link";

export default function LegacyFeesPage() {
  return (
    <div className="mx-auto max-w-lg space-y-3 kf-panel p-6">
      <h1 className="text-lg font-black capitalize">fees (advanced)</h1>
      <p className="text-sm text-[var(--muted)]">
        KINGFUN primary product is MEME/ETH trading. NFT launch tooling remains
        available for advanced users but is not the home experience.
      </p>
      <Link href="/" className="king-btn-primary inline-flex">Go to Trade</Link>
      <Link href="/features" className="king-btn-ghost inline-flex ml-2">Features</Link>
    </div>
  );
}
