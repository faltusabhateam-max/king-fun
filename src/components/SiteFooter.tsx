import Link from "next/link";

const X_URL = "https://x.com/Crypto_King877";
const TG_URL = "https://t.me/crypto_king887";

export function SiteFooter() {
  return (
    <footer className="paper-footer mt-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-black tracking-tight">
            king<span className="text-[var(--accent)]">.fun</span>
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            NFT launchpad on Robinhood Chain. Wallet-sign only.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
          <Link href="/about" className="hover:text-[var(--accent)]">
            About
          </Link>
          <Link href="/launch" className="hover:text-[var(--accent)]">
            Launch
          </Link>
          <a href={X_URL} target="_blank" rel="noreferrer" className="hover:text-[var(--accent)]">
            X
          </a>
          <a href={TG_URL} target="_blank" rel="noreferrer" className="hover:text-[var(--accent)]">
            Telegram
          </a>
        </div>
      </div>
    </footer>
  );
}
