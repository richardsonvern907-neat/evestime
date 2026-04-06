import { randomBytes, randomUUID } from "node:crypto";

import { sql } from "@/lib/db";
import {
  ValidationError,
  asEnum,
  asObject,
  asOptionalEmail,
  asOptionalPhone,
  asOptionalString,
  isUuid,
} from "@/lib/validation";

const SOURCE_CHANNELS = ["website", "support_hub", "telegram", "whatsapp", "email", "admin"] as const;
const PRODUCT_TYPES = ["coin", "portfolio", "offer", "pro_opportunity", "support"] as const;
const INTEREST_TYPES = ["invest", "apply", "advisor", "support"] as const;

export type LeadRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  telegram_username: string | null;
  whatsapp_phone: string | null;
  source_channel: string;
  source_page: string;
  campaign_source: string | null;
  campaign_medium: string | null;
  campaign_name: string | null;
  product_type: string;
  product_id: string | null;
  product_slug: string | null;
  interest_type: string;
  lead_status: string;
  risk_segment: string | null;
  assigned_advisor_id: string | null;
  last_contacted_at: string | null;
};

export type QualificationSessionRecord = {
  id: string;
  lead_id: string;
  channel: string;
  external_session_id: string;
  started_at: string;
  completed_at: string | null;
  current_step: string;
  status: string;
  route_decision: string | null;
  suitability_required: boolean;
  suitability_completed: boolean;
  updated_at: string;
  telegram_user_id?: string | null;
  telegram_chat_id?: string | null;
  last_event_id?: string | null;
};

export type AuditLogRecord = {
  id: string;
  actor_type: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  event_name: string;
  event_payload_json: Record<string, unknown>;
  created_at: string;
};

export type SupportHandoffRecord = {
  id: string;
  lead_id: string;
  qualification_session_id: string | null;
  channel: string;
  destination: string;
  payload_json: Record<string, unknown>;
  handoff_status: string;
  handoff_reason: string | null;
  created_at: string;
  completed_at: string | null;
};

export type SuitabilityAcknowledgementRecord = {
  id: string;
  lead_id: string;
  qualification_session_id: string | null;
  acknowledgement_key: string;
  accepted: boolean;
  accepted_at: string;
  created_at: string;
};

export type QualificationAnswerRecord = {
  id: string;
  session_id: string;
  question_key: string;
  question_text: string;
  answer_value: string;
  answer_type: string;
  created_at: string;
};

export type CreateLeadInput = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  telegramUsername: string | null;
  whatsappPhone: string | null;
  sourceChannel: (typeof SOURCE_CHANNELS)[number];
  sourcePage: string;
  campaignSource: string | null;
  campaignMedium: string | null;
  campaignName: string | null;
  productType: (typeof PRODUCT_TYPES)[number];
  productId: string | null;
  productSlug: string | null;
  interestType: (typeof INTEREST_TYPES)[number];
};

export function parseCreateLeadPayload(payload: unknown): CreateLeadInput {
  const body = asObject(payload);
  const honeypot = asOptionalString(body.company, 255);

  if (honeypot) {
    throw new ValidationError("Invalid request.");
  }

  const email = asOptionalEmail(body.email);
  const phone = asOptionalPhone(body.phone);
  const whatsappPhone = asOptionalPhone(body.whatsappPhone);
  const telegramUsername = asOptionalString(body.telegramUsername, 64);

  if (!email && !phone && !whatsappPhone && !telegramUsername) {
    throw new ValidationError("Provide at least one contact method.");
  }

  return {
    fullName: asOptionalString(body.fullName, 120),
    email,
    phone,
    telegramUsername,
    whatsappPhone,
    sourceChannel: asEnum(body.sourceChannel, SOURCE_CHANNELS, "sourceChannel"),
    sourcePage: asOptionalString(body.sourcePage, 512) ?? (() => {
      throw new ValidationError("Invalid sourcePage.");
    })(),
    campaignSource: asOptionalString(body.campaignSource, 120),
    campaignMedium: asOptionalString(body.campaignMedium, 120),
    campaignName: asOptionalString(body.campaignName, 120),
    productType: asEnum(body.productType, PRODUCT_TYPES, "productType"),
    productId: asOptionalString(body.productId, 120),
    productSlug: asOptionalString(body.productSlug, 160),
    interestType: asEnum(body.interestType, INTEREST_TYPES, "interestType"),
  };
}

export function parseLeadId(value: string): string {
  if (!isUuid(value)) {
    throw new ValidationError("Invalid lead id.");
  }

  return value;
}

export function isSuitabilityRequired(lead: Pick<LeadRecord, "product_type" | "source_page">): boolean {
  return (
    lead.product_type === "pro_opportunity" ||
    lead.source_page.toLowerCase().includes("pro-opportunities")
  );
}

export function buildTelegramDeepLink(externalSessionId: string): string | null {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim();

  if (!botUsername) {
    return null;
  }

  return `https://t.me/${botUsername}?start=${externalSessionId}`;
}

export async function findLeadById(id: string): Promise<LeadRecord | null> {
  const rows = await sql`
    SELECT *
    FROM leads
    WHERE id = ${id}::uuid
    LIMIT 1
  `;

  return (rows[0] as LeadRecord | undefined) ?? null;
}

export async function updateLeadStatus(id: string, leadStatus: string) {
  await sql`
    UPDATE leads
    SET lead_status = ${leadStatus},
        updated_at = NOW()
    WHERE id = ${id}::uuid
  `;
}

export async function findLeadByIdempotencyKey(key: string): Promise<LeadRecord | null> {
  const rows = await sql`
    SELECT l.*
    FROM audit_logs a
    INNER JOIN leads l ON l.id::text = a.entity_id
    WHERE a.entity_type = 'lead'
      AND a.event_name = 'lead.created'
      AND a.event_payload_json ->> 'idempotencyKey' = ${key}
    ORDER BY a.created_at DESC
    LIMIT 1
  `;

  return (rows[0] as LeadRecord | undefined) ?? null;
}

export async function createLead(input: CreateLeadInput): Promise<LeadRecord> {
  const id = randomUUID();
  const rows = await sql`
    INSERT INTO leads (
      id,
      full_name,
      email,
      phone,
      telegram_username,
      whatsapp_phone,
      source_channel,
      source_page,
      campaign_source,
      campaign_medium,
      campaign_name,
      product_type,
      product_id,
      product_slug,
      interest_type,
      lead_status
    )
    VALUES (
      ${id}::uuid,
      ${input.fullName},
      ${input.email},
      ${input.phone},
      ${input.telegramUsername},
      ${input.whatsappPhone},
      ${input.sourceChannel},
      ${input.sourcePage},
      ${input.campaignSource},
      ${input.campaignMedium},
      ${input.campaignName},
      ${input.productType},
      ${input.productId},
      ${input.productSlug},
      ${input.interestType},
      'new'
    )
    RETURNING *
  `;

  return rows[0] as LeadRecord;
}

export async function findActiveTelegramSession(
  leadId: string,
): Promise<QualificationSessionRecord | null> {
  const rows = await sql`
    SELECT *
    FROM qualification_sessions
    WHERE lead_id = ${leadId}::uuid
      AND channel = 'telegram'
      AND status IN ('pending', 'in_progress')
    ORDER BY started_at DESC
    LIMIT 1
  `;

  return (rows[0] as QualificationSessionRecord | undefined) ?? null;
}

export async function createTelegramQualificationSession(
  lead: LeadRecord,
): Promise<QualificationSessionRecord> {
  const id = randomUUID();
  const externalSessionId = randomBytes(18).toString("hex");
  const suitabilityRequired = isSuitabilityRequired(lead);
  const rows = await sql`
    INSERT INTO qualification_sessions (
      id,
      lead_id,
      channel,
      external_session_id,
      current_step,
      status,
      suitability_required,
      suitability_completed
    )
    VALUES (
      ${id}::uuid,
      ${lead.id}::uuid,
      'telegram',
      ${externalSessionId},
      'product_interest',
      'pending',
      ${suitabilityRequired},
      false
    )
    RETURNING *
  `;

  return rows[0] as QualificationSessionRecord;
}

export async function findQualificationSessionByExternalSessionId(
  externalSessionId: string,
): Promise<QualificationSessionRecord | null> {
  const rows = await sql`
    SELECT *
    FROM qualification_sessions
    WHERE external_session_id = ${externalSessionId}
    LIMIT 1
  `;

  return (rows[0] as QualificationSessionRecord | undefined) ?? null;
}

export async function findActiveTelegramSessionByTelegramIdentity(
  telegramUserId: string,
  telegramChatId: string,
): Promise<QualificationSessionRecord | null> {
  const rows = await sql`
    SELECT *
    FROM qualification_sessions
    WHERE channel = 'telegram'
      AND telegram_user_id = ${telegramUserId}
      AND telegram_chat_id = ${telegramChatId}
      AND status IN ('pending', 'in_progress', 'awaiting_suitability')
    ORDER BY started_at DESC
    LIMIT 1
  `;

  return (rows[0] as QualificationSessionRecord | undefined) ?? null;
}

export async function updateQualificationSessionContext(input: {
  sessionId: string;
  telegramUserId?: string | null;
  telegramChatId?: string | null;
  currentStep?: string | null;
  status?: string | null;
  routeDecision?: string | null;
  suitabilityRequired?: boolean | null;
  suitabilityCompleted?: boolean | null;
  completedAt?: string | null;
  lastEventId?: string | null;
}) {
  await sql`
    UPDATE qualification_sessions
    SET telegram_user_id = COALESCE(${input.telegramUserId ?? null}, telegram_user_id),
        telegram_chat_id = COALESCE(${input.telegramChatId ?? null}, telegram_chat_id),
        current_step = COALESCE(${input.currentStep ?? null}, current_step),
        status = COALESCE(${input.status ?? null}, status),
        route_decision = COALESCE(${input.routeDecision ?? null}, route_decision),
        suitability_required = COALESCE(${input.suitabilityRequired ?? null}, suitability_required),
        suitability_completed = COALESCE(${input.suitabilityCompleted ?? null}, suitability_completed),
        completed_at = CASE
          WHEN ${input.completedAt ?? null} IS NOT NULL THEN ${input.completedAt ?? null}::timestamptz
          ELSE completed_at
        END,
        last_event_id = COALESCE(${input.lastEventId ?? null}, last_event_id),
        updated_at = NOW()
    WHERE id = ${input.sessionId}::uuid
  `;
}

export async function getQualificationAnswersBySessionId(
  sessionId: string,
): Promise<QualificationAnswerRecord[]> {
  const rows = await sql`
    SELECT *
    FROM qualification_answers
    WHERE session_id = ${sessionId}::uuid
    ORDER BY created_at ASC
  `;

  return rows as QualificationAnswerRecord[];
}

export async function getQualificationAnswersByLeadId(
  leadId: string,
): Promise<QualificationAnswerRecord[]> {
  const rows = await sql`
    SELECT qa.*
    FROM qualification_answers qa
    INNER JOIN qualification_sessions qs ON qs.id = qa.session_id
    WHERE qs.lead_id = ${leadId}::uuid
    ORDER BY qa.created_at ASC
  `;

  return rows as QualificationAnswerRecord[];
}

export async function upsertQualificationAnswer(input: {
  sessionId: string;
  questionKey: string;
  questionText: string;
  answerValue: string;
  answerType: string;
}) {
  const rows = await sql`
    INSERT INTO qualification_answers (
      id,
      session_id,
      question_key,
      question_text,
      answer_value,
      answer_type
    )
    VALUES (
      ${randomUUID()}::uuid,
      ${input.sessionId}::uuid,
      ${input.questionKey},
      ${input.questionText},
      ${input.answerValue},
      ${input.answerType}
    )
    ON CONFLICT (session_id, question_key)
    DO UPDATE SET
      question_text = EXCLUDED.question_text,
      answer_value = EXCLUDED.answer_value,
      answer_type = EXCLUDED.answer_type
    RETURNING *
  `;

  return rows[0] as QualificationAnswerRecord;
}

export async function getLatestQualificationSessionByLeadId(
  leadId: string,
): Promise<QualificationSessionRecord | null> {
  const rows = await sql`
    SELECT *
    FROM qualification_sessions
    WHERE lead_id = ${leadId}::uuid
    ORDER BY started_at DESC
    LIMIT 1
  `;

  return (rows[0] as QualificationSessionRecord | undefined) ?? null;
}

export async function createSuitabilityAcknowledgement(input: {
  leadId: string;
  qualificationSessionId: string | null;
  acknowledgementKey: string;
  accepted: boolean;
}) {
  const rows = await sql`
    INSERT INTO suitability_acknowledgements (
      id,
      lead_id,
      qualification_session_id,
      acknowledgement_key,
      accepted
    )
    VALUES (
      ${randomUUID()}::uuid,
      ${input.leadId}::uuid,
      ${input.qualificationSessionId ? `${input.qualificationSessionId}` : null}::uuid,
      ${input.acknowledgementKey},
      ${input.accepted}
    )
    ON CONFLICT (lead_id, acknowledgement_key)
    DO UPDATE SET
      qualification_session_id = COALESCE(EXCLUDED.qualification_session_id, suitability_acknowledgements.qualification_session_id),
      accepted = EXCLUDED.accepted,
      accepted_at = NOW()
    RETURNING *
  `;

  return rows[0] as SuitabilityAcknowledgementRecord;
}

export async function findSuitabilityAcknowledgement(
  leadId: string,
  acknowledgementKey: string,
): Promise<SuitabilityAcknowledgementRecord | null> {
  const rows = await sql`
    SELECT *
    FROM suitability_acknowledgements
    WHERE lead_id = ${leadId}::uuid
      AND acknowledgement_key = ${acknowledgementKey}
    LIMIT 1
  `;

  return (rows[0] as SuitabilityAcknowledgementRecord | undefined) ?? null;
}

export async function findOpenSupportHandoff(input: {
  leadId: string;
  qualificationSessionId: string | null;
  channel: string;
}) {
  const rows = await sql`
    SELECT *
    FROM support_handoffs
    WHERE lead_id = ${input.leadId}::uuid
      AND channel = ${input.channel}
      AND handoff_status IN ('pending', 'queued', 'open')
      AND (
        (${input.qualificationSessionId}::uuid IS NULL AND qualification_session_id IS NULL)
        OR qualification_session_id = ${input.qualificationSessionId}::uuid
      )
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return (rows[0] as SupportHandoffRecord | undefined) ?? null;
}

export async function createSupportHandoff(input: {
  leadId: string;
  qualificationSessionId: string | null;
  channel: string;
  destination: string;
  payloadJson: Record<string, unknown>;
  handoffStatus: string;
  handoffReason: string;
}) {
  const rows = await sql`
    INSERT INTO support_handoffs (
      id,
      lead_id,
      qualification_session_id,
      channel,
      destination,
      payload_json,
      handoff_status,
      handoff_reason
    )
    VALUES (
      ${randomUUID()}::uuid,
      ${input.leadId}::uuid,
      ${input.qualificationSessionId}::uuid,
      ${input.channel},
      ${input.destination},
      ${JSON.stringify(input.payloadJson)}::jsonb,
      ${input.handoffStatus},
      ${input.handoffReason}
    )
    RETURNING *
  `;

  return rows[0] as SupportHandoffRecord;
}

export async function getLeadAdminDetail(leadId: string): Promise<{
  lead: LeadRecord;
  qualificationSessions: QualificationSessionRecord[];
  qualificationAnswers: QualificationAnswerRecord[];
  supportHandoffs: SupportHandoffRecord[];
  suitabilityAcknowledgements: SuitabilityAcknowledgementRecord[];
  auditLogs: AuditLogRecord[];
} | null> {
  const lead = await findLeadById(leadId);

  if (!lead) {
    return null;
  }

  const [
    qualificationSessionsRows,
    qualificationAnswersRows,
    supportHandoffsRows,
    suitabilityAcknowledgementsRows,
    auditLogsRows,
  ] =
    await Promise.all([
      sql`
        SELECT *
        FROM qualification_sessions
        WHERE lead_id = ${leadId}::uuid
        ORDER BY started_at DESC
      `,
      sql`
        SELECT qa.*
        FROM qualification_answers qa
        INNER JOIN qualification_sessions qs ON qs.id = qa.session_id
        WHERE qs.lead_id = ${leadId}::uuid
        ORDER BY qa.created_at ASC
      `,
      sql`
        SELECT *
        FROM support_handoffs
        WHERE lead_id = ${leadId}::uuid
        ORDER BY created_at DESC
      `,
      sql`
        SELECT *
        FROM suitability_acknowledgements
        WHERE lead_id = ${leadId}::uuid
        ORDER BY created_at DESC
      `,
      sql`
        SELECT *
        FROM audit_logs
        WHERE (entity_type = 'lead' AND entity_id = ${leadId})
           OR (entity_type = 'qualification_session' AND event_payload_json ->> 'leadId' = ${leadId})
        ORDER BY created_at DESC
        LIMIT 100
      `,
    ]);

  return {
    lead,
    qualificationSessions: qualificationSessionsRows as QualificationSessionRecord[],
    qualificationAnswers: qualificationAnswersRows as QualificationAnswerRecord[],
    supportHandoffs: supportHandoffsRows as SupportHandoffRecord[],
    suitabilityAcknowledgements:
      suitabilityAcknowledgementsRows as SuitabilityAcknowledgementRecord[],
    auditLogs: auditLogsRows as AuditLogRecord[],
  };
}
