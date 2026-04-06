import { NextResponse } from "next/server";

import { getLeadSummaryById, getLeadTimeline } from "@/lib/admin-leads";
import { ensureLeadAccess, requireStaffRoles } from "@/lib/authz";
import { parseLeadId } from "@/lib/leads";
import { ValidationError } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireStaffRoles(["admin", "advisor"]);
    const { id } = await context.params;
    const leadId = parseLeadId(id);
    const existingLead = await getLeadSummaryById(leadId);

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    ensureLeadAccess({
      session: viewer,
      leadAssignedAdvisorId: existingLead.assigned_advisor_id,
    });

    const timeline = await getLeadTimeline(leadId);
    return NextResponse.json({ items: timeline });
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

    console.error("Lead timeline retrieval failed.", error);
    return NextResponse.json({ error: "Unable to load timeline." }, { status: 500 });
  }
}
