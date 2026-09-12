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

/** In-memory fallback when filesystem is read-only (Vercel). */
let memoryCollections: CollectionRecord[] | null = null;
let memoryActivity: MintActivity[] | null = null;

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

function isReadOnlyFsError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as NodeJS.ErrnoException).code;
  return code === "EROFS" || code === "EACCES";
}

export async function getCollections(): Promise<CollectionRecord[]> {
  const list = await readJson<CollectionRecord[]>(COLLECTIONS_FILE, []);
  const merged = memoryCollections
    ? [...memoryCollections, ...list.filter(
        (c) =>
          !memoryCollections!.some(
            (m) => m.address.toLowerCase() === c.address.toLowerCase()
          )
      )]
    : list;
  return merged.sort((a, b) => b.createdAt - a.createdAt);
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
  memoryCollections = list;
  if (process.env.VERCEL) {
    return col;
  }
  try {
    await writeJson(COLLECTIONS_FILE, list);
  } catch (err) {
    if (isReadOnlyFsError(err)) return col;
    throw err;
  }
  return col;
}

export async function getDeployments(): Promise<DeploymentsState> {
  const envFactory = process.env.NEXT_PUBLIC_FACTORY_ADDRESS?.trim();
  const envVault = process.env.NEXT_PUBLIC_MARGIN_VAULT?.trim();
  const fromData = await readJson<DeploymentsState | null>(
    DEPLOYMENTS_FILE,
    null
  );
  const fromPublic = await readJson<DeploymentsState | null>(
    PUBLIC_DEPLOYMENTS,
    null
  );
  const base =
    fromData?.factoryAddress || fromData?.marginVault
      ? fromData
      : fromPublic?.factoryAddress || fromPublic?.marginVault
        ? fromPublic
        : null;

  const factoryAddress =
    envFactory && /^0x[a-fA-F0-9]{40}$/.test(envFactory)
      ? envFactory
      : base?.factoryAddress || "";
  const marginVault =
    envVault && /^0x[a-fA-F0-9]{40}$/.test(envVault)
      ? envVault
      : base?.marginVault;

  if (factoryAddress || marginVault) {
    return {
      factoryAddress,
      marginVault,
      chainId: base?.chainId ?? ROBINHOOD_CHAIN_ID,
      deployedAt: base?.deployedAt,
      deployer: base?.deployer,
      createFeeWei: base?.createFeeWei,
      platformFeeBps: base?.platformFeeBps,
      platformTreasury: base?.platformTreasury,
      txHash: base?.txHash,
    };
  }

  return {
    factoryAddress: "",
    chainId: ROBINHOOD_CHAIN_ID,
  };
}

export async function saveDeployments(
  state: DeploymentsState
): Promise<DeploymentsState> {
  // Vercel serverless has a read-only filesystem; skip disk writes there.
  if (process.env.VERCEL) {
    return state;
  }

  try {
    await writeJson(DEPLOYMENTS_FILE, state);
    await writeJson(PUBLIC_DEPLOYMENTS, state);
  } catch (err) {
    if (isReadOnlyFsError(err)) {
      // Local/dev may still hit EROFS/EACCES in some hosts — return state anyway.
      return state;
    }
    throw err;
  }
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
  const disk = await readJson<MintActivity[]>(ACTIVITY_FILE, []);
  const list = memoryActivity ? [...memoryActivity, ...disk] : disk;
  list.unshift(a);
  memoryActivity = list.slice(0, 5000);
  if (!process.env.VERCEL) {
    try {
      await writeJson(ACTIVITY_FILE, memoryActivity);
    } catch (err) {
      if (!isReadOnlyFsError(err)) throw err;
    }
  }
  return a;
}
