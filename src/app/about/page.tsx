export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-black">About KINGFUN</h1>
      <div className="kf-panel space-y-3 p-5 text-sm leading-relaxed text-[var(--ink)]">
        <p>
          KINGFUN is a Robinhood Chain–only meme trading terminal. Markets are
          always <strong>MEME/ETH</strong>. You connect a wallet and sign real
          Uniswap swaps — buys spend ETH, sells return ETH.
        </p>
        <p>
          Prices and charts come from on-chain pool state and Swap logs (and
          DexScreener when the indexer responds). There is no paper/demo ledger
          and no fake whale boards.
        </p>
        <p>
          Leverage above 1x requires a deployed, seeded{" "}
          <code>KingMarginVault</code>. Until that address is configured, the
          ticket stays spot-only.
        </p>
        <p className="text-[var(--muted)]">
          Not affiliated with Robinhood Markets, Inc. Meme tokens are high risk.
          You can lose your funds. DYOR.
        </p>
      </div>
    </div>
  );
}
