import { NextResponse } from "next/server";

import { requireStaffRoles } from "@/lib/authz";
import { createCoinAsset, listAdminCoinAssets, parseCoinAssetListQuery } from "@/lib/coin-assets";
import { ValidationError } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireStaffRoles(["admin", "advisor"]);
    const result = await listAdminCoinAssets(parseCoinAssetListQuery(new URL(request.url)));
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
    console.error("Admin coin asset list failed.", error);
    return NextResponse.json({ error: "Unable to list coin assets." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await requireStaffRoles(["admin"]);
    const asset = await createCoinAsset({
      actorUserId: viewer.user.id,
      payload: await request.json(),
    });
    return NextResponse.json({ asset }, { status: 201 });
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
    console.error("Coin asset creation failed.", error);
    return NextResponse.json({ error: "Unable to create coin asset." }, { status: 500 });
  }
}
