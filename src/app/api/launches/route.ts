import { NextRequest, NextResponse } from "next/server";
import { getLaunches, saveLaunch } from "@/lib/launches-store";
import { initialCurveState } from "@/lib/king-curve";
import type { LaunchRecord } from "@/lib/types";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function GET() {
  const launches = await getLaunches();
  return NextResponse.json({ launches });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      symbol,
      description,
      image,
      creator,
      creatorFeeBps = 100,
      mint,
      signature,
      onChainMint = false,
      decimals = 6,
      supply = 1_000_000_000,
      metadataUri,
    } = body;

    if (!name || !symbol || !creator) {
      return NextResponse.json(
        { error: "name, symbol, and creator are required" },
        { status: 400 }
      );
    }

    const curve = initialCurveState();
    const launch: LaunchRecord = {
      id: randomUUID(),
      name: String(name).slice(0, 64),
      symbol: String(symbol).toUpperCase().slice(0, 12),
      description: String(description || "").slice(0, 500),
      image: String(image || "/logo.png"),
      mint: mint || `pending_${randomUUID()}`,
      creator,
      creatorFeeBps: Math.min(1000, Math.max(0, Number(creatorFeeBps) || 100)),
      createdAt: Date.now(),
      status: "curve",
      decimals,
      supply,
      virtualSolReserves: curve.virtualSolReserves,
      virtualTokenReserves: curve.virtualTokenReserves,
      realSolReserves: curve.realSolReserves,
      realTokenReserves: curve.realTokenReserves,
      metadataUri,
      signature,
      onChainMint: Boolean(onChainMint),
    };

    await saveLaunch(launch);
    return NextResponse.json({ launch }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save launch" },
      { status: 500 }
    );
  }
}
