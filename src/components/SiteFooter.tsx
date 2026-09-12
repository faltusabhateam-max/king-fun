import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="kf-footer mt-auto">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs sm:px-5">
        <p>
          KINGFUN — Robinhood Chain token/ETH spot. Not affiliated with Robinhood Markets, Inc.
        </p>
        <div className="flex gap-3">
          <Link href="/about" className="hover:text-[var(--accent)]">
            About
          </Link>
          <Link href="/leverage" className="hover:text-[var(--accent)]">
            Leverage
          </Link>
          <a
            href="https://robinhoodchain.blockscout.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--accent)]"
          >
            Explorer
          </a>
        </div>
      </div>
    </footer>
  );
}
