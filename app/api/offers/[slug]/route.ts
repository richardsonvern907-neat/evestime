import { NextResponse } from "next/server";

import { getPublicOfferDetail } from "@/lib/offers";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const detail = await getPublicOfferDetail(slug);
    if (!detail) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    console.error("Public offer detail failed.", error);
    return NextResponse.json({ error: "Unable to load offer." }, { status: 500 });
  }
}
