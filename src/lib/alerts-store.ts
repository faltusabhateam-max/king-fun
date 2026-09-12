export type PriceAlert = {
  id: string;
  ca: string;
  symbol?: string;
  /** percent move from baseline mark */
  thresholdPct: number;
  direction: "up" | "down";
  enabled: boolean;
  baselineEth: number;
  lastFiredAt?: number;
};

export const ALERTS_KEY = "kingfun_price_alerts_v2";

export function loadAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ALERTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveAlerts(alerts: PriceAlert[]) {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}
