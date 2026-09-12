import Link from "next/link";

export const metadata = {
  title: "About",
  description: "How king.fun works on Robinhood Chain.",
};

export default function AboutPage() {
  return (
    <>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-black tracking-tight">How it works</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Short guide. English only. No custody.
        </p>

        <ol className="mt-8 space-y-4">
          {[
            {
              t: "Factory on Robinhood Chain",
              b: "A shared factory contract creates your ERC-721 collection. Chain ID 4663.",
            },
            {
              t: "Create fee → treasury",
              b: "When you launch, a small create fee goes to the platform treasury.",
            },
            {
              t: "Mint fee split",
              b: "Each mint pays ETH. Platform takes a %; the rest goes to the creator.",
            },
            {
              t: "One profile, many PFPs",
              b: "Upload a gallery of PFPs under one collection. Set total supply across all of them.",
            },
            {
              t: "Wallet-sign only",
              b: "king.fun never asks for seed phrases. You sign with your wallet.",
            },
          ].map((x, i) => (
            <li key={x.t} className="paper-panel flex gap-4 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-black text-[#1a1206]">
                {i + 1}
              </span>
              <div>
                <h2 className="font-bold">{x.t}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{x.b}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/launch" className="king-btn-primary">
            Launch a collection
          </Link>
          <a
            href="https://t.me/crypto_king887"
            target="_blank"
            rel="noreferrer"
            className="king-btn-ghost"
          >
            Telegram
          </a>
        </div>
      </div>
    </>
  );
}
