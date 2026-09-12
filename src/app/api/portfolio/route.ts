import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { RPC_URL } from "@/lib/solana";
import { getLaunches } from "@/lib/launches-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const pubkey = new PublicKey(address);
    const solLamports = await connection.getBalance(pubkey);
    const sol = solLamports / LAMPORTS_PER_SOL;

    let tokens: Array<{
      mint: string;
      amount: number;
      decimals: number;
      name?: string;
      symbol?: string;
      image?: string;
    }> = [];

    try {
      const resp = await connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      });
      const launches = await getLaunches();
      const byMint = new Map(launches.map((l) => [l.mint, l]));

      tokens = resp.value
        .map((acc) => {
          const info = acc.account.data.parsed.info;
          const amount = Number(info.tokenAmount.uiAmount || 0);
          const mint = info.mint as string;
          const launch = byMint.get(mint);
          return {
            mint,
            amount,
            decimals: info.tokenAmount.decimals as number,
            name: launch?.name,
            symbol: launch?.symbol,
            image: launch?.image,
          };
        })
        .filter((t) => t.amount > 0)
        .sort((a, b) => b.amount - a.amount);
    } catch (e) {
      console.error("token accounts error", e);
    }

    return NextResponse.json({ address, sol, tokens });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Portfolio error", sol: 0, tokens: [] },
      { status: 200 }
    );
  }
}
