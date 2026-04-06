import { NextResponse } from "next/server";

import { requireStaffRoles } from "@/lib/authz";
import { getOfferAssets, getOfferById, updateOffer } from "@/lib/offers";
import { ValidationError, isUuid } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireStaffRoles(["admin", "advisor"]);
    const { id } = await context.params;
    if (!isUuid(id)) {
      throw new ValidationError("Invalid offer id.");
    }
    const offer = await getOfferById(id);
    if (!offer) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    }
    const assets = await getOfferAssets(id);
    return NextResponse.json({ offer, assets });
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
    console.error("Offer detail failed.", error);
    return NextResponse.json({ error: "Unable to load offer." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireStaffRoles(["admin"]);
    const { id } = await context.params;
    if (!isUuid(id)) {
      throw new ValidationError("Invalid offer id.");
    }
    const existing = await getOfferById(id);
    if (!existing) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    }
    const offer = await updateOffer({
      id,
      actorUserId: viewer.user.id,
      payload: await request.json(),
    });
    return NextResponse.json({ offer });
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
    console.error("Offer update failed.", error);
    return NextResponse.json({ error: "Unable to update offer." }, { status: 500 });
  }
}
