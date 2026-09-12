"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
} from "@reown/appkit/react";
import { UNISWAP_V2_ROUTER } from "@/lib/uniswap";
import { ADDRESSES, explorerAddress } from "@/lib/robinhood";
import {
  depositLender,
  withdrawLender,
  fetchOpenPositions,
  closeLong,
  readVaultStats,
  readLenderAccount,
} from "@/lib/vault-client";
import {
  TxConfirmSheet,
  type TxConfirmDetails,
  type TxConfirmStatus,
} from "@/components/TxConfirmSheet";
import { shortAddr } from "@/lib/format";

function isUserReject(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /user rejected|denied|rejected the request|ACTION_REJECTED/i.test(msg);
}

export default function LeveragePage() {
  const vault = ADDRESSES.marginVault;
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");

  const [stats, setStats] = useState<{
    freeEth: string;
    totalLenderEth: string;
    totalDebtEth: string;
    maxLeverage: number;
  } | null>(null);
  const [lender, setLender] = useState<{
    shares: string;
    totalShares: string;
    estimatedEthOut: string;
    freeEth: string;
  } | null>(null);
  const [depositAmt, setDepositAmt] = useState("0.1");
  const [withdrawShares, setWithdrawShares] = useState("");
  const [positions, setPositions] = useState<
    { id: number; token: string; marginEth: string; debtEth: string }[]
  >([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStatus, setSheetStatus] = useState<TxConfirmStatus>("review");
  const [sheetMsg, setSheetMsg] = useState<string | undefined>();
  const [sheetDetails, setSheetDetails] = useState<TxConfirmDetails | null>(
    null
  );
  const [pending, setPending] = useState<"deposit" | "withdraw" | "close" | null>(
    null
  );
  const [closeId, setCloseId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const eip = walletProvider
      ? (walletProvider as unknown as import("ethers").Eip1193Provider)
      : undefined;
    try {
      const s = await readVaultStats(eip);
      setStats({
        freeEth: s.freeEth,
        totalLenderEth: s.totalLenderEth,
        totalDebtEth: s.totalDebtEth,
        maxLeverage: s.maxLeverage,
      });
      if (address) {
        const [pos, acct] = await Promise.all([
          fetchOpenPositions(eip ?? null, address),
          readLenderAccount(eip, address),
        ]);
        setPositions(pos);
        setLender({
          shares: acct.shares,
          totalShares: acct.totalShares,
          estimatedEthOut: acct.estimatedEthOut,
          freeEth: acct.freeEth,
        });
      } else {
        setLender(null);
      }
    } catch {
      /* soft */
    }
  }, [address, walletProvider]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [refresh]);

  function askDeposit() {
    if (!isConnected || !walletProvider) {
      open();
      return;
    }
    setPending("deposit");
    setSheetDetails({
      title: "Deposit lender ETH",
      mode: "Vault",
      action: "Seed KingMarginVault liquidity used for leveraged longs.",
      amountLabel: `${depositAmt} ETH`,
      vaultLabel: shortAddr(vault),
      footnotes: [
        "Confirm in KINGFUN first, then approve in your wallet.",
        "You receive vault shares proportional to the deposit.",
      ],
    });
    setSheetStatus("review");
    setSheetMsg(undefined);
    setSheetOpen(true);
  }

  function askWithdraw(all = false) {
    if (!isConnected || !walletProvider) {
      open();
      return;
    }
    const shares = all ? lender?.shares || "0" : withdrawShares.trim();
    if (!shares || BigInt(shares) <= 0n) {
      setSheetStatus("error");
      setSheetMsg("Enter shares to withdraw.");
      setSheetDetails({
        title: "Withdraw lender ETH",
        mode: "Vault",
        action: "Burn vault shares for ETH.",
        vaultLabel: shortAddr(vault),
      });
      setSheetOpen(true);
      return;
    }
    setPending("withdraw");
    setWithdrawShares(shares);
    const est =
      lender && lender.shares !== "0"
        ? (
            (Number(lender.estimatedEthOut) * Number(shares)) /
            Number(lender.shares)
          ).toPrecision(6)
        : "—";
    setSheetDetails({
      title: all ? "Withdraw all shares" : "Withdraw lender ETH",
      mode: "Vault",
      action: "Burn vault shares and receive ETH from free liquidity.",
      amountLabel: `${shares} shares`,
      receiveLabel: est !== "—" ? `~${est} ETH` : undefined,
      vaultLabel: shortAddr(vault),
      footnotes: [
        "Only free vault ETH can be withdrawn.",
        "Confirm here, then approve in your wallet.",
      ],
    });
    setSheetStatus("review");
    setSheetMsg(undefined);
    setSheetOpen(true);
  }

  function askClose(id: number) {
    if (!isConnected || !walletProvider) {
      open();
      return;
    }
    setPending("close");
    setCloseId(id);
    setSheetDetails({
      title: `Close long #${id}`,
      mode: "Leverage",
      action: "Sell position tokens, repay debt, return equity.",
      vaultLabel: shortAddr(vault),
      footnotes: ["Confirm here, then approve in wallet."],
    });
    setSheetStatus("review");
    setSheetMsg(undefined);
    setSheetOpen(true);
  }

  async function execute() {
    if (!walletProvider || !pending) return;
    const provider =
      walletProvider as unknown as import("ethers").Eip1193Provider;
    setSheetStatus("waiting_wallet");
    try {
      if (pending === "deposit") {
        setSheetStatus("pending");
        await depositLender({ eip1193: provider, ethAmount: depositAmt });
      } else if (pending === "withdraw") {
        setSheetStatus("pending");
        await withdrawLender({
          eip1193: provider,
          shares: withdrawShares.trim(),
        });
      } else if (pending === "close" && closeId != null) {
        setSheetStatus("pending");
        await closeLong({ eip1193: provider, positionId: closeId });
      }
      setSheetStatus("confirmed");
      refresh();
    } catch (e) {
      if (isUserReject(e)) {
        setSheetStatus("rejected");
        setSheetMsg("You rejected the request in your wallet.");
      } else {
        setSheetStatus("error");
        setSheetMsg(e instanceof Error ? e.message : "Failed");
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-black">Leverage (real margin)</h1>
      <div className="kf-panel space-y-3 p-5 text-sm leading-relaxed">
        <p>
          Leveraged longs use on-chain{" "}
          <strong className="text-[var(--accent)]">KingMarginVault</strong> with
          real ETH liquidity — not browser simulation.
        </p>
        <p className="font-mono text-xs text-[var(--accent)]">
          Vault:{" "}
          <a
            className="underline"
            href={explorerAddress(vault)}
            target="_blank"
            rel="noreferrer"
          >
            {vault}
          </a>
        </p>
        {stats && (
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--cut)] bg-black/30 p-3 text-xs sm:grid-cols-4">
            <div>
              <div className="text-[var(--muted)]">Free ETH</div>
              <div className="font-mono">{Number(stats.freeEth).toPrecision(4)}</div>
            </div>
            <div>
              <div className="text-[var(--muted)]">Lender ETH</div>
              <div className="font-mono">
                {Number(stats.totalLenderEth).toPrecision(4)}
              </div>
            </div>
            <div>
              <div className="text-[var(--muted)]">Debt ETH</div>
              <div className="font-mono">
                {Number(stats.totalDebtEth).toPrecision(4)}
              </div>
            </div>
            <div>
              <div className="text-[var(--muted)]">Max lev</div>
              <div className="font-mono">{stats.maxLeverage}x</div>
            </div>
          </div>
        )}
        <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
          <li>Lenders deposit ETH into the vault</li>
          <li>Traders open isolated TOKEN/ETH longs up to max leverage</li>
          <li>Vault borrows pool ETH, swaps via Uniswap V2, holds tokens</li>
          <li>Close / liquidate with real repayments</li>
        </ul>
        <p className="text-xs text-[var(--muted)]">
          Router: <code className="break-all">{UNISWAP_V2_ROUTER}</code>
        </p>
      </div>

      <div className="kf-panel space-y-3 p-5">
        <h2 className="font-bold text-[var(--accent)]">Deposit lender ETH</h2>
        <input
          className="king-input"
          value={depositAmt}
          onChange={(e) => setDepositAmt(e.target.value)}
          inputMode="decimal"
        />
        <button type="button" className="king-btn-primary" onClick={askDeposit}>
          {isConnected ? "Deposit to vault" : "Connect Wallet"}
        </button>
      </div>

      <div className="kf-panel space-y-3 p-5">
        <h2 className="font-bold text-[var(--accent)]">Withdraw lender ETH</h2>
        {isConnected && lender ? (
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--cut)] bg-black/30 p-3 text-xs sm:grid-cols-3">
            <div>
              <div className="text-[var(--muted)]">Your shares</div>
              <div className="font-mono break-all">{lender.shares}</div>
            </div>
            <div>
              <div className="text-[var(--muted)]">Est. ETH out</div>
              <div className="font-mono">
                {Number(lender.estimatedEthOut).toPrecision(6)}
              </div>
            </div>
            <div>
              <div className="text-[var(--muted)]">Vault free</div>
              <div className="font-mono">
                {Number(lender.freeEth).toPrecision(4)}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--muted)]">
            Connect wallet to see your shares and withdraw.
          </p>
        )}
        <label className="king-label">Shares to withdraw</label>
        <input
          className="king-input font-mono"
          value={withdrawShares}
          onChange={(e) => setWithdrawShares(e.target.value.trim())}
          placeholder={lender?.shares || "0"}
          inputMode="numeric"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="king-btn-ghost"
            onClick={() => askWithdraw(true)}
          >
            Withdraw all
          </button>
          <button
            type="button"
            className="king-btn-primary"
            onClick={() => askWithdraw(false)}
          >
            {isConnected ? "Withdraw" : "Connect Wallet"}
          </button>
        </div>
      </div>

      {positions.length > 0 && (
        <div className="kf-panel space-y-2 p-5">
          <h2 className="font-bold text-[var(--accent)]">Your positions</h2>
          {positions.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="font-mono">
                #{p.id} · {shortAddr(p.token)} · m{" "}
                {Number(p.marginEth).toPrecision(3)} · d{" "}
                {Number(p.debtEth).toPrecision(3)}
              </span>
              <button
                type="button"
                className="king-btn-ghost px-2 py-1"
                onClick={() => askClose(p.id)}
              >
                Close
              </button>
            </div>
          ))}
        </div>
      )}

      <Link href="/trade" className="king-btn-primary inline-flex">
        Open Trade (Spot | Leverage)
      </Link>

      <TxConfirmSheet
        open={sheetOpen}
        details={sheetDetails}
        status={sheetStatus}
        statusMessage={sheetMsg}
        onConfirm={execute}
        onClose={() => {
          if (sheetStatus === "waiting_wallet" || sheetStatus === "pending")
            return;
          setSheetOpen(false);
          setPending(null);
          setCloseId(null);
        }}
      />
    </div>
  );
}
