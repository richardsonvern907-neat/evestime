import { auditEventExists, writeAuditLog } from "@/lib/audit";
import {
  findActiveTelegramSessionByTelegramIdentity,
  findLeadById,
  findQualificationSessionByExternalSessionId,
  getQualificationAnswersBySessionId,
  type LeadRecord,
  type QualificationAnswerRecord,
  type QualificationSessionRecord,
  updateLeadStatus,
  updateQualificationSessionContext,
  upsertQualificationAnswer,
} from "@/lib/leads";
import { finalizeRoutingForSession } from "@/lib/routing";

const FLOW = [
  { key: "product_interest", text: "What product are you interested in?", type: "text" },
  { key: "investment_range", text: "What is your investment range?", type: "text" },
  { key: "experience_level", text: "What is your crypto investing experience level?", type: "choice" },
  { key: "risk_tolerance", text: "What is your risk tolerance?", type: "choice" },
  { key: "country_region", text: "What country or region are you in?", type: "text" },
  { key: "preferred_support_channel", text: "Which support channel do you prefer?", type: "choice" },
  { key: "product_track", text: "Are you interested in Core Investing or Pro Opportunities?", type: "choice" },
] as const;

type TelegramWebhookResult = { ok: true };

type TelegramMessage = {
  text: string;
  chatId: string;
  userId: string;
  username: string | null;
};

function getNextStep(currentKey: string) {
  const index = FLOW.findIndex(step => step.key === currentKey);

  if (index === -1 || index === FLOW.length - 1) {
    return null;
  }

  return FLOW[index + 1];
}

function normalizeAnswer(stepKey: string, value: string) {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  if (stepKey === "preferred_support_channel") {
    if (lower.includes("whatsapp")) {
      return "whatsapp";
    }

    if (lower.includes("telegram")) {
      return "telegram";
    }

    if (lower.includes("email")) {
      return "email";
    }
  }

  if (stepKey === "product_track") {
    if (lower.includes("pro")) {
      return "pro_opportunities";
    }

    if (lower.includes("core")) {
      return "core_investing";
    }
  }

  if (stepKey === "experience_level" || stepKey === "risk_tolerance") {
    return lower.replace(/\s+/g, "_");
  }

  return trimmed;
}

function extractTextMessage(payload: Record<string, unknown>): TelegramMessage | null {
  const message = payload.message;

  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return null;
  }

  const record = message as Record<string, unknown>;
  const text = typeof record.text === "string" ? record.text.trim() : "";
  const chat = record.chat;
  const from = record.from;

  if (!text || !chat || typeof chat !== "object" || !from || typeof from !== "object") {
    return null;
  }

  const chatId = (chat as Record<string, unknown>).id;
  const userId = (from as Record<string, unknown>).id;
  const username = (from as Record<string, unknown>).username;

  if ((typeof chatId !== "string" && typeof chatId !== "number") || (typeof userId !== "string" && typeof userId !== "number")) {
    return null;
  }

  return {
    text,
    chatId: String(chatId),
    userId: String(userId),
    username: typeof username === "string" ? username : null,
  };
}

async function associateSessionWithTelegramIdentity(
  session: QualificationSessionRecord,
  message: TelegramMessage,
  updateId: string,
) {
  await updateQualificationSessionContext({
    sessionId: session.id,
    telegramUserId: message.userId,
    telegramChatId: message.chatId,
    status: session.status === "pending" ? "in_progress" : session.status,
    lastEventId: updateId,
  });
}

async function handleStartCommand(
  message: TelegramMessage,
  updateId: string,
): Promise<TelegramWebhookResult> {
  const token = message.text.split(/\s+/, 2)[1]?.trim() ?? "";
  const session = token
    ? await findQualificationSessionByExternalSessionId(token)
    : await findActiveTelegramSessionByTelegramIdentity(message.userId, message.chatId);

  if (!session) {
    return { ok: true };
  }

  await associateSessionWithTelegramIdentity(session, message, updateId);

  await writeAuditLog({
    actorType: "telegram_bot",
    actorId: message.userId,
    entityType: "qualification_session",
    entityId: session.id,
    eventName: "telegram.session.attached",
    eventPayload: {
      externalSessionId: session.external_session_id,
      telegramUserId: message.userId,
      telegramChatId: message.chatId,
    },
  });

  return { ok: true };
}

async function completeSession(
  lead: LeadRecord,
  session: QualificationSessionRecord,
  answers: QualificationAnswerRecord[],
) {
  await writeAuditLog({
    actorType: "telegram_bot",
    actorId: session.telegram_user_id ?? null,
    entityType: "qualification_session",
    entityId: session.id,
    eventName: "qualification.completed",
    eventPayload: {
      leadId: lead.id,
      answerCount: answers.length,
      suitabilityRequired: session.suitability_required,
      suitabilityCompleted: session.suitability_completed,
    },
  });

  await finalizeRoutingForSession({
    lead,
    session,
    answers,
  });
}

async function handleAnswerMessage(
  session: QualificationSessionRecord,
  lead: LeadRecord,
  message: TelegramMessage,
  updateId: string,
): Promise<TelegramWebhookResult> {
  if (session.last_event_id === updateId) {
    return { ok: true };
  }

  const step = FLOW.find(item => item.key === session.current_step) ?? FLOW[0];
  const normalizedAnswer = normalizeAnswer(step.key, message.text);
  const suitabilityRequired =
    session.suitability_required || (step.key === "product_track" && normalizedAnswer === "pro_opportunities");

  await upsertQualificationAnswer({
    sessionId: session.id,
    questionKey: step.key,
    questionText: step.text,
    answerValue: normalizedAnswer,
    answerType: step.type,
  });

  await updateLeadStatus(lead.id, "qualifying");

  await writeAuditLog({
    actorType: "telegram_bot",
    actorId: message.userId,
    entityType: "qualification_session",
    entityId: session.id,
    eventName: "qualification.answer.recorded",
    eventPayload: {
      leadId: lead.id,
      questionKey: step.key,
      answerType: step.type,
      telegramChatId: message.chatId,
    },
  });

  const nextStep = getNextStep(step.key);

  if (!nextStep) {
    await updateQualificationSessionContext({
      sessionId: session.id,
      telegramUserId: message.userId,
      telegramChatId: message.chatId,
      currentStep: "completed",
      status: suitabilityRequired && !session.suitability_completed ? "awaiting_suitability" : "completed",
      suitabilityRequired,
      lastEventId: updateId,
      completedAt: suitabilityRequired && !session.suitability_completed ? null : new Date().toISOString(),
    });

    const refreshedSession = {
      ...session,
      suitability_required: suitabilityRequired,
      current_step: "completed",
      status: suitabilityRequired && !session.suitability_completed ? "awaiting_suitability" : "completed",
      last_event_id: updateId,
    };
    const answers = await getQualificationAnswersBySessionId(session.id);

    await completeSession(lead, refreshedSession, answers);
    return { ok: true };
  }

  await updateQualificationSessionContext({
    sessionId: session.id,
    telegramUserId: message.userId,
    telegramChatId: message.chatId,
    currentStep: nextStep.key,
    status: "in_progress",
    suitabilityRequired,
    lastEventId: updateId,
  });

  return { ok: true };
}

export async function processTelegramWebhook(payload: Record<string, unknown>) {
  const updateIdValue = payload.update_id;

  if (typeof updateIdValue !== "number" && typeof updateIdValue !== "string") {
    return { ok: true } satisfies TelegramWebhookResult;
  }

  const updateId = String(updateIdValue);

  if (await auditEventExists("telegram_update", updateId, "telegram.webhook.received")) {
    return { ok: true } satisfies TelegramWebhookResult;
  }

  const message = extractTextMessage(payload);

  await writeAuditLog({
    actorType: "telegram_bot",
    actorId: message?.userId ?? null,
    entityType: "telegram_update",
    entityId: updateId,
    eventName: "telegram.webhook.received",
    eventPayload: {
      telegramChatId: message?.chatId ?? null,
      hasText: Boolean(message?.text),
      textKind: message?.text?.startsWith("/start") ? "start" : message ? "answer" : "ignored",
    },
  });

  if (!message) {
    return { ok: true } satisfies TelegramWebhookResult;
  }

  if (message.text.startsWith("/start")) {
    return handleStartCommand(message, updateId);
  }

  const session = await findActiveTelegramSessionByTelegramIdentity(message.userId, message.chatId);

  if (!session) {
    return { ok: true } satisfies TelegramWebhookResult;
  }

  const lead = await findLeadById(session.lead_id);

  if (!lead) {
    return { ok: true } satisfies TelegramWebhookResult;
  }

  return handleAnswerMessage(session, lead, message, updateId);
}
