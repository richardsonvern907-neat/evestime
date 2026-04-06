import { NextResponse } from "next/server";

import { requireStaffRoles } from "@/lib/authz";
import { submitOfferReview } from "@/lib/offers";
import { ValidationError, isUuid } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireStaffRoles(["admin"]);
    const { id } = await context.params;
    if (!isUuid(id)) {
      throw new ValidationError("Invalid offer id.");
    }
    const offer = await submitOfferReview({ id, actorUserId: viewer.user.id });
    if (!offer) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    }
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
    console.error("Offer submit review failed.", error);
    return NextResponse.json({ error: "Unable to submit offer for review." }, { status: 500 });
  }
}
