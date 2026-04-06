import { NextResponse } from "next/server";

import { requireStaffRoles } from "@/lib/authz";
import { replaceOfferAssets } from "@/lib/offers";
import { ValidationError, isUuid } from "@/lib/validation";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireStaffRoles(["admin"]);
    const { id } = await context.params;
    if (!isUuid(id)) {
      throw new ValidationError("Invalid offer id.");
    }
    const assets = await replaceOfferAssets({
      offerId: id,
      actorUserId: viewer.user.id,
      payload: await request.json(),
    });
    if (!assets) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    }
    return NextResponse.json({ assets });
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
    console.error("Offer assets replace failed.", error);
    return NextResponse.json({ error: "Unable to replace offer assets." }, { status: 500 });
  }
}
