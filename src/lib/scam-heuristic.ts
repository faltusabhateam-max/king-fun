export type RiskSignal = {
  level: "clear" | "watch" | "scam";
  label: string;
  reasons: string[];
};

/** Only flag SCAM when signals are strong. Unsure → clear/watch, never scam. */
export function assessTokenRisk(input: {
  liquidityEth?: number;
  verified?: boolean | null;
  sellQuoteOk?: boolean | null;
  buyTaxBps?: number | null;
  sellTaxBps?: number | null;
  blacklistedName?: boolean;
}): RiskSignal {
  const reasons: string[] = [];
  let score = 0;

  if (input.liquidityEth != null && input.liquidityEth < 0.01) {
    score += 2;
    reasons.push("Near-zero liquidity");
  }
  if (input.liquidityEth != null && input.liquidityEth === 0) {
    score += 3;
    reasons.push("Zero liquidity");
  }
  if (input.sellQuoteOk === false) {
    score += 4;
    reasons.push("Sell quote failed (honeypot-like)");
  }
  if ((input.sellTaxBps ?? 0) >= 2500 || (input.buyTaxBps ?? 0) >= 2500) {
    score += 3;
    reasons.push("Extreme tax ≥25%");
  }
  if (input.verified === false && (input.liquidityEth ?? 0) < 0.05) {
    score += 2;
    reasons.push("Unverified + tiny liquidity");
  }
  if (input.blacklistedName) {
    score += 3;
    reasons.push("Suspicious naming pattern");
  }

  if (score >= 5 && reasons.length >= 2) {
    return { level: "scam", label: "SCAM", reasons };
  }
  if (score >= 3) {
    return { level: "watch", label: "High risk", reasons };
  }
  return { level: "clear", label: "No strong scam signal", reasons };
}
