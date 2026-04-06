import { NextResponse } from "next/server";

import { getCoinAssetById, updateCoinAsset } from "@/lib/coin-assets";
import { requireStaffRoles } from "@/lib/authz";
import { ValidationError, isUuid } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireStaffRoles(["admin"]);
    const { id } = await context.params;
    if (!isUuid(id)) {
      throw new ValidationError("Invalid coin asset id.");
    }
    const existing = await getCoinAssetById(id);
    if (!existing) {
      return NextResponse.json({ error: "Coin asset not found." }, { status: 404 });
    }
    const asset = await updateCoinAsset({
      id,
      actorUserId: viewer.user.id,
      payload: await request.json(),
    });
    return NextResponse.json({ asset });
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
    console.error("Coin asset update failed.", error);
    return NextResponse.json({ error: "Unable to update coin asset." }, { status: 500 });
  }
}
