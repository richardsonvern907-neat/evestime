import { NextResponse } from "next/server";

import { ensureLeadAccess, requireStaffRoles } from "@/lib/authz";
import { getLeadAdminDetail, parseLeadId } from "@/lib/leads";
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
    const detail = await getLeadAdminDetail(leadId);

    if (!detail) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    ensureLeadAccess({
      session: viewer,
      leadAssignedAdvisorId: detail.lead.assigned_advisor_id,
    });

    return NextResponse.json({
      lead: detail.lead,
      qualificationSessions: detail.qualificationSessions,
      qualificationAnswers: detail.qualificationAnswers,
      supportHandoffs: detail.supportHandoffs,
      suitabilityAcknowledgements: detail.suitabilityAcknowledgements,
      auditLogs: detail.auditLogs,
    });
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

    console.error("Admin lead retrieval failed.", error);
    return NextResponse.json({ error: "Unable to load lead." }, { status: 500 });
  }
}
