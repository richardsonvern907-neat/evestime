import { NextResponse } from "next/server";

import { createLeadNote, getLeadSummaryById, parseLeadNotePayload } from "@/lib/admin-leads";
import { ensureLeadAccess, requireStaffRoles } from "@/lib/authz";
import { parseLeadId } from "@/lib/leads";
import { ValidationError } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
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

    const payload = parseLeadNotePayload(await request.json());
    const note = await createLeadNote({
      leadId,
      authorUserId: viewer.user.id,
      noteBody: payload.noteBody,
      noteType: payload.noteType,
      isInternal: payload.isInternal,
    });

    return NextResponse.json({ note }, { status: 201 });
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

    console.error("Lead note creation failed.", error);
    return NextResponse.json({ error: "Unable to create note." }, { status: 500 });
  }
}
