import { NextResponse } from "next/server";

import { assignAdvisorToLead, getLeadSummaryById } from "@/lib/admin-leads";
import { ensureLeadAccess, requireStaffRoles } from "@/lib/authz";
import { parseLeadId } from "@/lib/leads";
import { ValidationError, asObject, asOptionalString } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireStaffRoles(["admin"]);
    const { id } = await context.params;
    const leadId = parseLeadId(id);
    const body = asObject(await request.json());
    const advisorUserId = asOptionalString(body.advisorUserId, 120);

    if (!advisorUserId) {
      throw new ValidationError("Invalid advisorUserId.");
    }

    const existingLead = await getLeadSummaryById(leadId);

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    ensureLeadAccess({
      session: viewer,
      leadAssignedAdvisorId: existingLead.assigned_advisor_id,
    });

    const updatedLead = await assignAdvisorToLead({
      leadId,
      advisorUserId,
      actorUserId: viewer.user.id,
    });

    return NextResponse.json({ lead: updatedLead });
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

    console.error("Lead assignment failed.", error);
    return NextResponse.json({ error: "Unable to assign advisor." }, { status: 500 });
  }
}
