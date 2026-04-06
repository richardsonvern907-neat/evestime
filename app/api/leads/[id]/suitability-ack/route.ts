import { NextResponse } from "next/server";

import { hashRequestIp, writeAuditLog } from "@/lib/audit";
import {
  createSuitabilityAcknowledgement,
  findLeadById,
  getLatestQualificationSessionByLeadId,
  getQualificationAnswersBySessionId,
  parseLeadId,
  updateQualificationSessionContext,
} from "@/lib/leads";
import { finalizeRoutingForSession } from "@/lib/routing";
import { ValidationError, asBoolean, asObject, asOptionalString } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const leadId = parseLeadId(id);
    const lead = await findLeadById(leadId);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const body = asObject(await request.json());
    const acknowledgementKey = asOptionalString(body.acknowledgementKey, 120);
    const accepted = asBoolean(body.accepted, "accepted");

    if (!acknowledgementKey) {
      throw new ValidationError("Invalid acknowledgementKey.");
    }

    const latestSession = await getLatestQualificationSessionByLeadId(lead.id);
    const acknowledgement = await createSuitabilityAcknowledgement({
      leadId: lead.id,
      qualificationSessionId: latestSession?.id ?? null,
      acknowledgementKey,
      accepted,
    });

    if (latestSession?.suitability_required && accepted) {
      await updateQualificationSessionContext({
        sessionId: latestSession.id,
        suitabilityCompleted: true,
        status: latestSession.current_step === "completed" ? "completed" : latestSession.status,
      });

      if (latestSession.current_step === "completed") {
        const answers = await getQualificationAnswersBySessionId(latestSession.id);

        await finalizeRoutingForSession({
          lead,
          session: {
            ...latestSession,
            suitability_completed: true,
          },
          answers,
        });
      }
    }

    await writeAuditLog({
      actorType: "anonymous",
      entityType: "lead",
      entityId: lead.id,
      eventName: "suitability.acknowledged",
      eventPayload: {
        acknowledgementKey,
        accepted,
        qualificationSessionId: latestSession?.id ?? null,
        requestIpHash: hashRequestIp(request),
      },
    });

    return NextResponse.json({
      acknowledgement: {
        id: acknowledgement.id,
        leadId: acknowledgement.lead_id,
        qualificationSessionId: acknowledgement.qualification_session_id,
        acknowledgementKey: acknowledgement.acknowledgement_key,
        accepted: acknowledgement.accepted,
        acceptedAt: acknowledgement.accepted_at,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Suitability acknowledgement failed.", error);
    return NextResponse.json({ error: "Unable to record suitability acknowledgement." }, { status: 500 });
  }
}
