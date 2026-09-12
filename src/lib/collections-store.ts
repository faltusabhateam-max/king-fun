import { promises as fs } from "fs";
import path from "path";
import type { CollectionRecord, DeploymentsState, MintActivity } from "./types";
import { ROBINHOOD_CHAIN_ID } from "./robinhood";

const DATA_DIR = path.join(process.cwd(), "data");
const COLLECTIONS_FILE = path.join(DATA_DIR, "collections.json");
const DEPLOYMENTS_FILE = path.join(DATA_DIR, "deployments.json");
const ACTIVITY_FILE = path.join(DATA_DIR, "activity.json");
const PUBLIC_DEPLOYMENTS = path.join(
  process.cwd(),
  "public",
  "deployments",
  "robinhood.json"
);

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(path.dirname(PUBLIC_DEPLOYMENTS), { recursive: true });
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

export async function getCollections(): Promise<CollectionRecord[]> {
  const list = await readJson<CollectionRecord[]>(COLLECTIONS_FILE, []);
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getCollection(
  address: string
): Promise<CollectionRecord | null> {
  const list = await getCollections();
  return (
    list.find((c) => c.address.toLowerCase() === address.toLowerCase()) ?? null
  );
}

export async function saveCollection(
  col: CollectionRecord
): Promise<CollectionRecord> {
  const list = await getCollections();
  const idx = list.findIndex(
    (c) => c.address.toLowerCase() === col.address.toLowerCase()
  );
  if (idx >= 0) list[idx] = col;
  else list.unshift(col);
  await writeJson(COLLECTIONS_FILE, list);
  return col;
}

export async function getDeployments(): Promise<DeploymentsState> {
  const fromData = await readJson<DeploymentsState | null>(DEPLOYMENTS_FILE, null);
  if (fromData?.factoryAddress) return fromData;
  try {
    const pub = await readJson<DeploymentsState | null>(PUBLIC_DEPLOYMENTS, null);
    if (pub?.factoryAddress) return pub;
  } catch {
    /* ignore */
  }
  return {
    factoryAddress: "",
    chainId: ROBINHOOD_CHAIN_ID,
  };
}

export async function saveDeployments(
  state: DeploymentsState
): Promise<DeploymentsState> {
  await writeJson(DEPLOYMENTS_FILE, state);
  await writeJson(PUBLIC_DEPLOYMENTS, state);
  return state;
}

export async function getActivity(
  collection?: string
): Promise<MintActivity[]> {
  const list = await readJson<MintActivity[]>(ACTIVITY_FILE, []);
  const filtered = collection
    ? list.filter(
        (a) => a.collection.toLowerCase() === collection.toLowerCase()
      )
    : list;
  return filtered.sort((a, b) => b.timestamp - a.timestamp);
}

export async function saveActivity(a: MintActivity): Promise<MintActivity> {
  const list = await readJson<MintActivity[]>(ACTIVITY_FILE, []);
  list.unshift(a);
  await writeJson(ACTIVITY_FILE, list.slice(0, 5000));
  return a;
}
