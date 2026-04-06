import { writeAuditLog } from "@/lib/audit";
import {
  createSupportHandoff,
  findOpenSupportHandoff,
  type LeadRecord,
  type QualificationAnswerRecord,
  type QualificationSessionRecord,
  type SupportHandoffRecord,
  updateLeadStatus,
  updateQualificationSessionContext,
} from "@/lib/leads";

type RoutingResult = {
  routeDecision: string;
  sessionStatus: string;
  handoff: SupportHandoffRecord | null;
  handoffReason: string;
};

function answersToMap(answers: QualificationAnswerRecord[]) {
  return Object.fromEntries(answers.map(answer => [answer.question_key, answer.answer_value]));
}

function buildHandoffPayload(
  lead: LeadRecord,
  session: QualificationSessionRecord,
  answers: Record<string, string>,
) {
  return {
    leadId: lead.id,
    leadName: lead.full_name,
    email: lead.email,
    phone: lead.phone,
    telegramUsername: lead.telegram_username,
    telegramUserId: session.telegram_user_id ?? null,
    telegramChatId: session.telegram_chat_id ?? null,
    sourcePage: lead.source_page,
    campaignSource: lead.campaign_source,
    campaignMedium: lead.campaign_medium,
    campaignName: lead.campaign_name,
    productType: lead.product_type,
    productId: lead.product_id,
    productSlug: lead.product_slug,
    qualificationSummary: answers,
    experienceLevel: answers.experience_level ?? null,
    riskTolerance: answers.risk_tolerance ?? null,
    productTrack: answers.product_track ?? null,
    timestamp: new Date().toISOString(),
  };
}

export async function finalizeRoutingForSession(input: {
  lead: LeadRecord;
  session: QualificationSessionRecord;
  answers: QualificationAnswerRecord[];
}) {
  const answerMap = answersToMap(input.answers);
  const preferredSupportChannel = answerMap.preferred_support_channel ?? "";
  const productTrack = answerMap.product_track ?? "";
  const payload = buildHandoffPayload(input.lead, input.session, answerMap);
  let routeDecision = "manual_review";
  let sessionStatus = "completed";
  let leadStatus = "qualified";
  let handoffChannel: string | null = null;
  let destination: string | null = null;
  let handoffReason = "Lead requires manual review.";

  if ((productTrack === "pro_opportunities" || input.session.suitability_required) && !input.session.suitability_completed) {
    routeDecision = "awaiting_suitability_ack";
    sessionStatus = "awaiting_suitability";
    leadStatus = "awaiting_suitability";
    handoffReason = "Pro Opportunities lead is awaiting suitability acknowledgement.";
  } else if (
    preferredSupportChannel === "whatsapp" &&
    (input.lead.whatsapp_phone || input.lead.phone)
  ) {
    routeDecision = "whatsapp";
    leadStatus = "routed_whatsapp";
    handoffChannel = "whatsapp";
    destination = process.env.SUPPORT_WHATSAPP_DESTINATION?.trim() || "whatsapp_queue";
    handoffReason = "Lead requested WhatsApp follow-up.";
  } else if (
    preferredSupportChannel === "telegram" &&
    (input.session.telegram_chat_id || input.session.telegram_user_id)
  ) {
    routeDecision = "telegram_follow_up";
    leadStatus = "advisor_follow_up";
    handoffChannel = "telegram";
    destination = process.env.SUPPORT_TELEGRAM_DESTINATION?.trim() || "advisor_task";
    handoffReason = "Lead requested Telegram follow-up.";
  } else if (input.lead.email) {
    routeDecision = "email";
    leadStatus = "routed_email";
    handoffChannel = "email";
    destination = process.env.SUPPORT_EMAIL_DESTINATION?.trim() || "support@evestime.local";
    handoffReason = "Lead routed to email support.";
  } else if (input.lead.whatsapp_phone || input.lead.phone) {
    routeDecision = "whatsapp_fallback";
    leadStatus = "routed_whatsapp";
    handoffChannel = "whatsapp";
    destination = process.env.SUPPORT_WHATSAPP_DESTINATION?.trim() || "whatsapp_queue";
    handoffReason = "Lead routed to WhatsApp as fallback.";
  }

  await updateQualificationSessionContext({
    sessionId: input.session.id,
    routeDecision,
    status: sessionStatus,
    completedAt: sessionStatus === "awaiting_suitability" ? null : new Date().toISOString(),
  });
  await updateLeadStatus(input.lead.id, leadStatus);

  let handoff: SupportHandoffRecord | null = null;

  if (handoffChannel && destination) {
    handoff =
      (await findOpenSupportHandoff({
        leadId: input.lead.id,
        qualificationSessionId: input.session.id,
        channel: handoffChannel,
      })) ??
      (await createSupportHandoff({
        leadId: input.lead.id,
        qualificationSessionId: input.session.id,
        channel: handoffChannel,
        destination,
        payloadJson: payload,
        handoffStatus: "pending",
        handoffReason,
      }));
  }

  await writeAuditLog({
    actorType: "system",
    entityType: "qualification_session",
    entityId: input.session.id,
    eventName: "routing.decision.made",
    eventPayload: {
      leadId: input.lead.id,
      routeDecision,
      handoffChannel,
      handoffDestination: destination,
      handoffReason,
    },
  });

  return {
    routeDecision,
    sessionStatus,
    handoff,
    handoffReason,
  } satisfies RoutingResult;
}
