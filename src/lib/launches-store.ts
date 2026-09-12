import { promises as fs } from "fs";
import path from "path";
import type { LaunchRecord, TradeRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const LAUNCHES_FILE = path.join(DATA_DIR, "launches.json");
const TRADES_FILE = path.join(DATA_DIR, "trades.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    await ensureDataDir();
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

export async function getLaunches(): Promise<LaunchRecord[]> {
  const list = await readJson<LaunchRecord[]>(LAUNCHES_FILE, []);
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getLaunch(idOrMint: string): Promise<LaunchRecord | null> {
  const list = await getLaunches();
  return (
    list.find((l) => l.id === idOrMint || l.mint === idOrMint) ?? null
  );
}

export async function saveLaunch(launch: LaunchRecord): Promise<LaunchRecord> {
  const list = await getLaunches();
  const idx = list.findIndex((l) => l.id === launch.id || l.mint === launch.mint);
  if (idx >= 0) list[idx] = launch;
  else list.unshift(launch);
  await writeJson(LAUNCHES_FILE, list);
  return launch;
}

export async function updateLaunch(
  mint: string,
  patch: Partial<LaunchRecord>
): Promise<LaunchRecord | null> {
  const list = await getLaunches();
  const idx = list.findIndex((l) => l.mint === mint || l.id === mint);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch };
  await writeJson(LAUNCHES_FILE, list);
  return list[idx];
}

export async function getTrades(mint?: string): Promise<TradeRecord[]> {
  const list = await readJson<TradeRecord[]>(TRADES_FILE, []);
  const filtered = mint ? list.filter((t) => t.mint === mint) : list;
  return filtered.sort((a, b) => b.timestamp - a.timestamp);
}

export async function saveTrade(trade: TradeRecord): Promise<TradeRecord> {
  const list = await readJson<TradeRecord[]>(TRADES_FILE, []);
  list.unshift(trade);
  await writeJson(TRADES_FILE, list.slice(0, 5000));
  return trade;
}

export async function getCreatorFees(creator: string) {
  const launches = (await getLaunches()).filter(
    (l) => l.creator.toLowerCase() === creator.toLowerCase()
  );
  const mints = new Set(launches.map((l) => l.mint));
  const trades = (await getTrades()).filter((t) => mints.has(t.mint));
  const totalFees = trades.reduce((s, t) => s + (t.creatorFeeSol || 0), 0);
  return { launches, trades, totalFees };
}
