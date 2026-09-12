/**
 * Real wallet-signed SPL Token mint creation flow.
 * Creates mint + ATA + initial supply. Metadata URI stored off-chain in launch record.
 * Full Metaplex Token Metadata ix can be added once mpl packages are pinned;
 * day-one path: real on-chain mint the user signs with their wallet.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";

export interface BuildMintParams {
  connection: Connection;
  payer: PublicKey;
  decimals?: number;
  /** Initial tokens minted to creator (raw UI amount) */
  initialSupply?: number;
}

export interface BuiltMintTx {
  transaction: Transaction;
  mintKeypair: Keypair;
  mint: string;
  ata: string;
}

export async function buildCreateMintTransaction(
  params: BuildMintParams
): Promise<BuiltMintTx> {
  const { connection, payer, decimals = 6, initialSupply = 1_000_000_000 } = params;
  const mintKeypair = Keypair.generate();
  const lamports = await getMinimumBalanceForRentExemptMint(connection);

  const ata = getAssociatedTokenAddressSync(mintKeypair.publicKey, payer);

  const tx = new Transaction();
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(
      mintKeypair.publicKey,
      decimals,
      payer,
      payer,
      TOKEN_PROGRAM_ID
    ),
    createAssociatedTokenAccountInstruction(
      payer,
      ata,
      payer,
      mintKeypair.publicKey
    ),
    createMintToInstruction(
      mintKeypair.publicKey,
      ata,
      payer,
      BigInt(Math.floor(initialSupply * 10 ** decimals))
    )
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(
    "confirmed"
  );
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = payer;

  // mint keypair must partially sign; wallet will sign as fee payer
  tx.partialSign(mintKeypair);

  return {
    transaction: tx,
    mintKeypair,
    mint: mintKeypair.publicKey.toBase58(),
    ata: ata.toBase58(),
  };
}

export function estimateMintCostSol(): number {
  // rough: mint rent (~0.0015) + ATA rent (~0.002) + fees
  return 0.005;
}

export { LAMPORTS_PER_SOL };
