import { NextRequest, NextResponse } from "next/server";
import {
  getCollections,
  saveCollection,
  getCollection,
} from "@/lib/collections-store";
import type { CollectionRecord } from "@/lib/types";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (address) {
    const col = await getCollection(address);
    if (!col) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ collection: col });
  }
  const collections = await getCollections();
  return NextResponse.json({ collections });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      address,
      name,
      symbol,
      description,
      image,
      pfps,
      stockPair,
      creator,
      maxSupply,
      mintPriceWei,
      mintPriceEth,
      baseURI,
      platformFeeBps,
      txHash,
      factoryAddress,
    } = body;

    if (!address || !name || !symbol || !creator) {
      return NextResponse.json(
        { error: "address, name, symbol, and creator are required" },
        { status: 400 }
      );
    }

    const collection: CollectionRecord = {
      id: randomUUID(),
      address: String(address),
      name: String(name).slice(0, 64),
      symbol: String(symbol).toUpperCase().slice(0, 16),
      description: String(description || "").slice(0, 500),
      image: String(image || (Array.isArray(pfps) && pfps[0]) || "/logo.png"),
      pfps: Array.isArray(pfps)
        ? pfps.map((x: unknown) => String(x)).slice(0, 24)
        : undefined,
      stockPair: stockPair ? String(stockPair).slice(0, 16) : undefined,
      creator: String(creator),
      maxSupply: Number(maxSupply) || 0,
      mintPriceWei: String(mintPriceWei || "0"),
      mintPriceEth: String(mintPriceEth || "0"),
      baseURI: String(baseURI || ""),
      platformFeeBps: Number(platformFeeBps) || 0,
      createdAt: Date.now(),
      txHash,
      factoryAddress,
    };

    await saveCollection(collection);
    return NextResponse.json({ collection }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save" },
      { status: 500 }
    );
  }
}
