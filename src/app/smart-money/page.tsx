export default function SmartMoneyPage() {
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h1 className="text-xl font-black">Smart Money</h1>
      <div className="kf-panel p-5 text-sm text-[var(--muted)]">
        Needs indexer — not available. We will not show fake wallets or PnL.
        When a Robinhood Chain smart-money feed exists, it will plug into the
        same API layer as Discover.
      </div>
    </div>
  );
}
