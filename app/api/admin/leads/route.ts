import { NextResponse } from "next/server";

import { requireStaffRoles } from "@/lib/authz";
import { listAdminLeads, parseLeadListQuery } from "@/lib/admin-leads";
import { ValidationError } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const viewer = await requireStaffRoles(["admin", "advisor"]);
    const filters = parseLeadListQuery(new URL(request.url));
    const result = await listAdminLeads({ viewer, filters });

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

    console.error("Admin leads list failed.", error);
    return NextResponse.json({ error: "Unable to list leads." }, { status: 500 });
  }
}
