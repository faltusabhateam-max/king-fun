"use client";

import { useEffect } from "react";
import { X, ShieldCheck, Loader2, CheckCircle2, XCircle } from "lucide-react";

export type TxConfirmStatus =
  | "review"
  | "waiting_wallet"
  | "pending"
  | "confirmed"
  | "rejected"
  | "error";

export type TxConfirmDetails = {
  title: string;
  mode: "Spot" | "Leverage" | "Vault" | "Approve";
  action: string;
  tokenLabel?: string;
  amountLabel?: string;
  receiveLabel?: string;
  leverageLabel?: string;
  vaultLabel?: string;
  gasHint?: string;
  footnotes?: string[];
};

export function TxConfirmSheet({
  open,
  details,
  status,
  statusMessage,
  onConfirm,
  onClose,
  confirmDisabled,
}: {
  open: boolean;
  details: TxConfirmDetails | null;
  status: TxConfirmStatus;
  statusMessage?: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmDisabled?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status === "review") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, status, onClose]);

  if (!open || !details) return null;

  const busy = status === "waiting_wallet" || status === "pending";
  const done = status === "confirmed";
  const failed = status === "rejected" || status === "error";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close backdrop"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md animate-[kfSheetIn_0.28s_ease] rounded-t-2xl border border-[var(--cut)] bg-[#00140d] p-5 shadow-[0_0_60px_rgba(0,232,143,0.18)] sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="kf-chip mb-2">{details.mode}</div>
            <h2 className="text-lg font-black tracking-tight text-[var(--ink)]">
              {details.title}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{details.action}</p>
          </div>
          {!busy && (
            <button
              type="button"
              className="paper-icon-btn"
              aria-label="Close"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <dl className="space-y-2 rounded-xl border border-[var(--cut)] bg-black/35 px-3 py-3 text-sm">
          {details.tokenLabel && (
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted)]">Token</dt>
              <dd className="font-mono font-bold text-[var(--ink)]">
                {details.tokenLabel}
              </dd>
            </div>
          )}
          {details.amountLabel && (
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted)]">Amount</dt>
              <dd className="font-mono text-[var(--accent)]">
                {details.amountLabel}
              </dd>
            </div>
          )}
          {details.receiveLabel && (
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted)]">Est. receive</dt>
              <dd className="font-mono text-[var(--ink)]">
                {details.receiveLabel}
              </dd>
            </div>
          )}
          {details.leverageLabel && (
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted)]">Leverage</dt>
              <dd className="font-bold text-[var(--accent)]">
                {details.leverageLabel}
              </dd>
            </div>
          )}
          {details.vaultLabel && (
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted)]">Vault</dt>
              <dd className="truncate font-mono text-xs text-[var(--ink)]">
                {details.vaultLabel}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--muted)]">Network</dt>
            <dd>Robinhood Chain</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--muted)]">Gas</dt>
            <dd className="text-xs text-[var(--muted)]">
              {details.gasHint || "Estimated in wallet"}
            </dd>
          </div>
        </dl>

        {details.footnotes?.length ? (
          <ul className="mt-3 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-[var(--muted)]">
            {details.footnotes.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--cut)]/60 bg-black/25 px-3 py-2 text-xs">
          {status === "review" && (
            <>
              <ShieldCheck size={14} className="text-[var(--accent)]" />
              <span>Review details, then Confirm. Wallet prompt follows.</span>
            </>
          )}
          {status === "waiting_wallet" && (
            <>
              <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
              <span className="text-[var(--accent)]">
                Approve in wallet…
              </span>
            </>
          )}
          {status === "pending" && (
            <>
              <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
              <span className="text-[var(--accent)]">
                Transaction pending…
              </span>
            </>
          )}
          {status === "confirmed" && (
            <>
              <CheckCircle2 size={14} className="text-[var(--accent)]" />
              <span className="text-[var(--accent)]">Confirmed on-chain</span>
            </>
          )}
          {(status === "rejected" || status === "error") && (
            <>
              <XCircle size={14} className="text-rose-400" />
              <span className="text-rose-300">
                {statusMessage ||
                  (status === "rejected" ? "Rejected in wallet" : "Failed")}
              </span>
            </>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {!done && (
            <button
              type="button"
              className="king-btn-ghost flex-1"
              disabled={busy}
              onClick={onClose}
            >
              {failed ? "Close" : "Cancel"}
            </button>
          )}
          {status === "review" || failed ? (
            <button
              type="button"
              className="king-btn-primary flex-1"
              disabled={confirmDisabled || busy}
              onClick={onConfirm}
            >
              {failed ? "Try again" : "Confirm"}
            </button>
          ) : done ? (
            <button
              type="button"
              className="king-btn-primary flex-1"
              onClick={onClose}
            >
              Done
            </button>
          ) : (
            <button type="button" className="king-btn-primary flex-1" disabled>
              Waiting…
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
