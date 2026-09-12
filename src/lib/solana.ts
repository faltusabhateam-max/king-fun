import { Connection, clusterApiUrl } from "@solana/web3.js";

export const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl("mainnet-beta");

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(RPC_URL, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60_000,
    });
  }
  return connection;
}

export const TOKEN_METADATA_PROGRAM_ID =
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
