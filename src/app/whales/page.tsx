export default function WhalesPage() {
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h1 className="text-xl font-black">Whales</h1>
      <div className="kf-panel p-5 text-sm text-[var(--muted)]">
        Needs indexer — not available. No simulated whale boards. Large transfers
        can be inspected on{" "}
        <a
          className="text-[var(--accent)] underline"
          href="https://robinhoodchain.blockscout.com"
          target="_blank"
          rel="noreferrer"
        >
          Blockscout
        </a>{" "}
        until a dedicated feed is wired.
      </div>
    </div>
  );
}
