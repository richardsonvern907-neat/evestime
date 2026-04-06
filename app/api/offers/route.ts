import { NextResponse } from "next/server";

import { listPublicOffers, parsePublicOfferListQuery } from "@/lib/offers";
import { ValidationError } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const result = await listPublicOffers(parsePublicOfferListQuery(new URL(request.url)));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Public offers list failed.", error);
    return NextResponse.json({ error: "Unable to list offers." }, { status: 500 });
  }
}
