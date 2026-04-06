import { NextResponse } from "next/server";

import { getLeadSummaryById, updateLeadStatusForAdmin } from "@/lib/admin-leads";
import { ensureLeadAccess, requireStaffRoles } from "@/lib/authz";
import { parseLeadId } from "@/lib/leads";
import { ValidationError, asObject, asOptionalString } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireStaffRoles(["admin", "advisor"]);
    const { id } = await context.params;
    const leadId = parseLeadId(id);
    const body = asObject(await request.json());
    const nextStatus = asOptionalString(body.nextStatus, 80);
    const reason = asOptionalString(body.reason, 500);

    if (!nextStatus) {
      throw new ValidationError("Invalid nextStatus.");
    }

    const existingLead = await getLeadSummaryById(leadId);

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    ensureLeadAccess({
      session: viewer,
      leadAssignedAdvisorId: existingLead.assigned_advisor_id,
    });

    const updatedLead = await updateLeadStatusForAdmin({
      leadId,
      nextStatus,
      reason,
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

    console.error("Lead status update failed.", error);
    return NextResponse.json({ error: "Unable to update lead status." }, { status: 500 });
  }
}
