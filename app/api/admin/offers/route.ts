import { NextResponse } from "next/server";

import { requireStaffRoles } from "@/lib/authz";
import { createOffer, listAdminOffers, parseAdminOfferListQuery } from "@/lib/offers";
import { ValidationError } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireStaffRoles(["admin", "advisor"]);
    const result = await listAdminOffers(parseAdminOfferListQuery(new URL(request.url)));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    console.error("Admin offers list failed.", error);
    return NextResponse.json({ error: "Unable to list offers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await requireStaffRoles(["admin"]);
    const offer = await createOffer({
      actorUserId: viewer.user.id,
      payload: await request.json(),
    });
    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    console.error("Offer creation failed.", error);
    return NextResponse.json({ error: "Unable to create offer." }, { status: 500 });
  }
}
