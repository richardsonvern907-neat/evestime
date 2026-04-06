import { createHash, randomUUID } from "node:crypto";

import { sql } from "@/lib/db";

type AuditActorType = "system" | "anonymous" | "user" | "admin" | "telegram_bot";

type AuditLogInput = {
  actorType: AuditActorType;
  actorId?: string | null;
  entityType: string;
  entityId: string;
  eventName: string;
  eventPayload?: Record<string, unknown>;
};

export function hashRequestIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const candidate = forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || null;

  if (!candidate) {
    return null;
  }

  return createHash("sha256").update(candidate).digest("hex");
}

export async function writeAuditLog(input: AuditLogInput) {
  const payload = input.eventPayload ?? {};

  await sql`
    INSERT INTO audit_logs (
      id,
      actor_type,
      actor_id,
      entity_type,
      entity_id,
      event_name,
      event_payload_json
    )
    VALUES (
      ${randomUUID()},
      ${input.actorType},
      ${input.actorId ?? null},
      ${input.entityType},
      ${input.entityId},
      ${input.eventName},
      ${JSON.stringify(payload)}::jsonb
    )
  `;
}

export async function auditEventExists(entityType: string, entityId: string, eventName: string) {
  const rows = await sql`
    SELECT id
    FROM audit_logs
    WHERE entity_type = ${entityType}
      AND entity_id = ${entityId}
      AND event_name = ${eventName}
    LIMIT 1
  `;

  return rows.length > 0;
}
