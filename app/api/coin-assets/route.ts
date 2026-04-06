import { NextResponse } from "next/server";

import { listPublicCoinAssets } from "@/lib/coin-assets";

export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await listPublicCoinAssets();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Public coin asset list failed.", error);
    return NextResponse.json({ error: "Unable to list coin assets." }, { status: 500 });
  }
}
