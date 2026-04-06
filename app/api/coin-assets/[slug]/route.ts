import { NextResponse } from "next/server";

import { getPublicCoinAssetDetail } from "@/lib/offers";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const detail = await getPublicCoinAssetDetail(slug);
    if (!detail) {
      return NextResponse.json({ error: "Coin asset not found." }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    console.error("Public coin asset detail failed.", error);
    return NextResponse.json({ error: "Unable to load coin asset." }, { status: 500 });
  }
}
