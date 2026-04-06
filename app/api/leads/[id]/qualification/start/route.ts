import { NextResponse } from "next/server";

import { hashRequestIp, writeAuditLog } from "@/lib/audit";
import {
  buildTelegramDeepLink,
  createTelegramQualificationSession,
  findActiveTelegramSession,
  findLeadById,
  parseLeadId,
} from "@/lib/leads";
import { ValidationError } from "@/lib/validation";

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

    const existingSession = await findActiveTelegramSession(lead.id);

    if (existingSession) {
      return NextResponse.json({
        session: {
          id: existingSession.id,
          leadId: existingSession.lead_id,
          channel: existingSession.channel,
          externalSessionId: existingSession.external_session_id,
          status: existingSession.status,
          currentStep: existingSession.current_step,
          routeDecision: existingSession.route_decision,
          suitabilityRequired: existingSession.suitability_required,
          suitabilityCompleted: existingSession.suitability_completed,
          telegramDeepLink: buildTelegramDeepLink(existingSession.external_session_id),
        },
        idempotent: true,
      });
    }

    const session = await createTelegramQualificationSession(lead);

    await writeAuditLog({
      actorType: "system",
      entityType: "qualification_session",
      entityId: session.id,
      eventName: "qualification_session.started",
      eventPayload: {
        leadId: lead.id,
        channel: session.channel,
        externalSessionId: session.external_session_id,
        suitabilityRequired: session.suitability_required,
        requestIpHash: hashRequestIp(request),
      },
    });

    return NextResponse.json(
      {
        session: {
          id: session.id,
          leadId: session.lead_id,
          channel: session.channel,
          externalSessionId: session.external_session_id,
          status: session.status,
          currentStep: session.current_step,
          routeDecision: session.route_decision,
          suitabilityRequired: session.suitability_required,
          suitabilityCompleted: session.suitability_completed,
          telegramDeepLink: buildTelegramDeepLink(session.external_session_id),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Qualification start failed.", error);
    return NextResponse.json({ error: "Unable to start qualification." }, { status: 500 });
  }
}
