import { randomUUID } from "node:crypto";

import { writeAuditLog } from "@/lib/audit";
import { hasRole, type StaffRole } from "@/lib/authz";
import { sql } from "@/lib/db";
import { assertValidLeadStatusTransition, type LeadStatus, LEAD_STATUSES } from "@/lib/lead-status";
import type { LeadRecord } from "@/lib/leads";
import {
  ValidationError,
  asBoolean,
  asEnum,
  asIsoDate,
  asObject,
  asOptionalString,
  asPositiveInteger,
} from "@/lib/validation";

const NOTE_TYPES = ["general", "call_summary", "risk_note", "follow_up"] as const;
const SORT_FIELDS = {
  created_at: "l.created_at",
  updated_at: "l.updated_at",
  full_name: "l.full_name",
  lead_status: "l.lead_status",
  last_contacted_at: "l.last_contacted_at",
} as const;

const PRODUCT_TRACK_FILTERS = ["core_investing", "pro_opportunities"] as const;
const ROUTE_DECISIONS = [
  "manual_review",
  "awaiting_suitability_ack",
  "whatsapp",
  "telegram_follow_up",
  "email",
  "whatsapp_fallback",
  "",
] as const;

export type LeadSummary = Pick<
  LeadRecord,
  | "id"
  | "full_name"
  | "email"
  | "phone"
  | "telegram_username"
  | "source_channel"
  | "source_page"
  | "product_type"
  | "product_slug"
  | "lead_status"
  | "risk_segment"
  | "assigned_advisor_id"
  | "last_contacted_at"
  | "created_at"
  | "updated_at"
> & {
  assigned_advisor_name: string | null;
  route_decision: string | null;
};

export type LeadNoteRecord = {
  id: string;
  lead_id: string;
  author_user_id: string;
  note_body: string;
  note_type: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string | null;
};

type ParsedLeadListFilters = {
  q: string | null;
  status: LeadStatus | null;
  assignedAdvisorId: string | null;
  productTrack: (typeof PRODUCT_TRACK_FILTERS)[number] | null;
  sourceChannel: string | null;
  routeDecision: string | null;
  createdFrom: string | null;
  createdTo: string | null;
  page: number;
  pageSize: number;
  sortBy: keyof typeof SORT_FIELDS;
  sortOrder: "asc" | "desc";
};

export function parseLeadListQuery(url: URL): ParsedLeadListFilters {
  const q = asOptionalString(url.searchParams.get("q"), 160);
  const rawStatus = url.searchParams.get("status");
  const rawAssignedAdvisorId = url.searchParams.get("assignedAdvisorId");
  const rawProductTrack = url.searchParams.get("productTrack");
  const rawSourceChannel = url.searchParams.get("sourceChannel");
  const rawRouteDecision = url.searchParams.get("routeDecision");
  const rawSortBy = url.searchParams.get("sortBy");
  const rawSortOrder = url.searchParams.get("sortOrder");

  const status =
    rawStatus == null || rawStatus === ""
      ? null
      : asEnum(rawStatus, LEAD_STATUSES, "status");

  const productTrack =
    rawProductTrack == null || rawProductTrack === ""
      ? null
      : asEnum(rawProductTrack, PRODUCT_TRACK_FILTERS, "productTrack");

  const routeDecision =
    rawRouteDecision == null || rawRouteDecision === ""
      ? null
      : asEnum(rawRouteDecision, ROUTE_DECISIONS, "routeDecision");

  const sortBy =
    rawSortBy == null || rawSortBy === ""
      ? "created_at"
      : asEnum(rawSortBy, Object.keys(SORT_FIELDS) as (keyof typeof SORT_FIELDS)[], "sortBy");

  const sortOrder =
    rawSortOrder == null || rawSortOrder === ""
      ? "desc"
      : asEnum(rawSortOrder, ["asc", "desc"] as const, "sortOrder");

  return {
    q,
    status,
    assignedAdvisorId: asOptionalString(rawAssignedAdvisorId, 120),
    productTrack,
    sourceChannel: asOptionalString(rawSourceChannel, 60),
    routeDecision,
    createdFrom: asIsoDate(url.searchParams.get("createdFrom"), "createdFrom"),
    createdTo: asIsoDate(url.searchParams.get("createdTo"), "createdTo"),
    page: asPositiveInteger(url.searchParams.get("page"), "page", { defaultValue: 1, min: 1, max: 100000 }),
    pageSize: asPositiveInteger(url.searchParams.get("pageSize"), "pageSize", {
      defaultValue: 20,
      min: 1,
      max: 100,
    }),
    sortBy,
    sortOrder,
  };
}

function buildWhereClause(
  filters: ParsedLeadListFilters,
  viewer: { user: { id: string }; roles: StaffRole[] },
) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (!hasRole(viewer, "admin")) {
    params.push(viewer.user.id);
    conditions.push(`l.assigned_advisor_id = $${params.length}`);
  }

  if (filters.q) {
    params.push(`%${filters.q}%`);
    const index = params.length;
    conditions.push(
      `(l.full_name ILIKE $${index} OR l.email ILIKE $${index} OR l.phone ILIKE $${index} OR l.telegram_username ILIKE $${index} OR l.product_slug ILIKE $${index})`,
    );
  }

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`l.lead_status = $${params.length}`);
  }

  if (filters.assignedAdvisorId) {
    params.push(filters.assignedAdvisorId);
    conditions.push(`l.assigned_advisor_id = $${params.length}`);
  }

  if (filters.productTrack) {
    if (filters.productTrack === "pro_opportunities") {
      conditions.push(`(l.product_type = 'pro_opportunity' OR qs_latest.route_decision = 'awaiting_suitability_ack')`);
    } else {
      conditions.push(`l.product_type <> 'pro_opportunity'`);
    }
  }

  if (filters.sourceChannel) {
    params.push(filters.sourceChannel);
    conditions.push(`l.source_channel = $${params.length}`);
  }

  if (filters.routeDecision) {
    params.push(filters.routeDecision);
    conditions.push(`COALESCE(qs_latest.route_decision, '') = $${params.length}`);
  }

  if (filters.createdFrom) {
    params.push(filters.createdFrom);
    conditions.push(`l.created_at >= $${params.length}::timestamptz`);
  }

  if (filters.createdTo) {
    params.push(filters.createdTo);
    conditions.push(`l.created_at <= $${params.length}::timestamptz`);
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

export async function listAdminLeads(input: {
  viewer: { user: { id: string }; roles: StaffRole[] };
  filters: ParsedLeadListFilters;
}) {
  const { clause, params } = buildWhereClause(input.filters, input.viewer);
  const offset = (input.filters.page - 1) * input.filters.pageSize;
  const countResult = await sql.query(
    `
      SELECT COUNT(*)::int AS count
      FROM leads l
      LEFT JOIN LATERAL (
        SELECT route_decision
        FROM qualification_sessions qs
        WHERE qs.lead_id = l.id
        ORDER BY qs.started_at DESC
        LIMIT 1
      ) qs_latest ON TRUE
      ${clause}
    `,
    params,
  );

  const listParams = [...params, input.filters.pageSize, offset];
  const rows = await sql.query(
    `
      SELECT
        l.id,
        l.full_name,
        l.email,
        l.phone,
        l.telegram_username,
        l.source_channel,
        l.source_page,
        l.product_type,
        l.product_slug,
        l.lead_status,
        l.risk_segment,
        l.assigned_advisor_id,
        l.last_contacted_at,
        l.created_at,
        l.updated_at,
        advisor.name AS assigned_advisor_name,
        qs_latest.route_decision
      FROM leads l
      LEFT JOIN users advisor ON advisor.id::text = l.assigned_advisor_id
      LEFT JOIN LATERAL (
        SELECT route_decision
        FROM qualification_sessions qs
        WHERE qs.lead_id = l.id
        ORDER BY qs.started_at DESC
        LIMIT 1
      ) qs_latest ON TRUE
      ${clause}
      ORDER BY ${SORT_FIELDS[input.filters.sortBy]} ${input.filters.sortOrder.toUpperCase()}, l.id ASC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
    `,
    listParams,
  );

  return {
    items: rows as LeadSummary[],
    pagination: {
      page: input.filters.page,
      pageSize: input.filters.pageSize,
      total: countResult[0]?.count ?? 0,
      totalPages: Math.max(1, Math.ceil((countResult[0]?.count ?? 0) / input.filters.pageSize)),
    },
    filters: input.filters,
  };
}

export async function getLeadSummaryById(leadId: string): Promise<LeadSummary | null> {
  const rows = await sql.query(
    `
      SELECT
        l.id,
        l.full_name,
        l.email,
        l.phone,
        l.telegram_username,
        l.source_channel,
        l.source_page,
        l.product_type,
        l.product_slug,
        l.lead_status,
        l.risk_segment,
        l.assigned_advisor_id,
        l.last_contacted_at,
        l.created_at,
        l.updated_at,
        advisor.name AS assigned_advisor_name,
        qs_latest.route_decision
      FROM leads l
      LEFT JOIN users advisor ON advisor.id::text = l.assigned_advisor_id
      LEFT JOIN LATERAL (
        SELECT route_decision
        FROM qualification_sessions qs
        WHERE qs.lead_id = l.id
        ORDER BY qs.started_at DESC
        LIMIT 1
      ) qs_latest ON TRUE
      WHERE l.id = $1::uuid
      LIMIT 1
    `,
    [leadId],
  );

  return (rows[0] as LeadSummary | undefined) ?? null;
}

export async function assignAdvisorToLead(input: {
  leadId: string;
  advisorUserId: string;
  actorUserId: string;
}) {
  const advisorRows = await sql.query(
    `
      SELECT u.id, u.name
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id::text
      WHERE u.id::text = $1
        AND ur.role = 'advisor'
      LIMIT 1
    `,
    [input.advisorUserId],
  );

  if (advisorRows.length === 0) {
    throw new ValidationError("Advisor not found.");
  }

  const previousLead = await getLeadSummaryById(input.leadId);

  if (!previousLead) {
    return null;
  }

  await sql`
    UPDATE leads
    SET assigned_advisor_id = ${input.advisorUserId},
        updated_at = NOW()
    WHERE id = ${input.leadId}::uuid
  `;

  const updatedLead = await getLeadSummaryById(input.leadId);

  await writeAuditLog({
    actorType: "admin",
    actorId: input.actorUserId,
    entityType: "lead",
    entityId: input.leadId,
    eventName: "lead.assigned",
    eventPayload: {
      previousAdvisorUserId: previousLead.assigned_advisor_id,
      advisorUserId: input.advisorUserId,
    },
  });

  return updatedLead;
}

export async function updateLeadStatusForAdmin(input: {
  leadId: string;
  nextStatus: string;
  reason: string | null;
  actorUserId: string;
}) {
  const currentLead = await getLeadSummaryById(input.leadId);

  if (!currentLead) {
    return null;
  }

  const normalizedStatus = assertValidLeadStatusTransition(currentLead.lead_status, input.nextStatus);

  await sql`
    UPDATE leads
    SET lead_status = ${normalizedStatus},
        updated_at = NOW()
    WHERE id = ${input.leadId}::uuid
  `;

  const updatedLead = await getLeadSummaryById(input.leadId);

  await writeAuditLog({
    actorType: "admin",
    actorId: input.actorUserId,
    entityType: "lead",
    entityId: input.leadId,
    eventName: "lead.status.updated",
    eventPayload: {
      previousStatus: currentLead.lead_status,
      nextStatus: normalizedStatus,
      reason: input.reason,
    },
  });

  return updatedLead;
}

export function parseLeadNotePayload(payload: unknown) {
  const body = asObject(payload);
  const noteBody = asOptionalString(body.noteBody, 4000);
  const noteType = asEnum(body.noteType, NOTE_TYPES, "noteType");
  const isInternal = body.isInternal == null ? true : asBoolean(body.isInternal, "isInternal");

  if (!noteBody) {
    throw new ValidationError("Invalid noteBody.");
  }

  return {
    noteBody,
    noteType,
    isInternal,
  };
}

export async function createLeadNote(input: {
  leadId: string;
  authorUserId: string;
  noteBody: string;
  noteType: string;
  isInternal: boolean;
}) {
  const rows = await sql`
    INSERT INTO lead_notes (
      id,
      lead_id,
      author_user_id,
      note_body,
      note_type,
      is_internal
    )
    VALUES (
      ${randomUUID()}::uuid,
      ${input.leadId}::uuid,
      ${input.authorUserId},
      ${input.noteBody},
      ${input.noteType},
      ${input.isInternal}
    )
    RETURNING *
  `;

  await writeAuditLog({
    actorType: "user",
    actorId: input.authorUserId,
    entityType: "lead",
    entityId: input.leadId,
    eventName: "lead.note.created",
    eventPayload: {
      noteType: input.noteType,
      isInternal: input.isInternal,
    },
  });

  return rows[0] as LeadNoteRecord;
}

export async function getLeadNotes(leadId: string): Promise<LeadNoteRecord[]> {
  const rows = await sql.query(
    `
      SELECT ln.*, u.name AS author_name
      FROM lead_notes ln
      LEFT JOIN users u ON u.id::text = ln.author_user_id
      WHERE ln.lead_id = $1::uuid
      ORDER BY ln.created_at DESC
    `,
    [leadId],
  );

  return rows as LeadNoteRecord[];
}

export async function getLeadTimeline(leadId: string) {
  const [auditLogs, qualificationSessions, supportHandoffs, suitabilityAcknowledgements, notes] =
    await Promise.all([
      sql`
        SELECT *
        FROM audit_logs
        WHERE (entity_type = 'lead' AND entity_id = ${leadId})
           OR (entity_type = 'qualification_session' AND event_payload_json ->> 'leadId' = ${leadId})
        ORDER BY created_at DESC
        LIMIT 200
      `,
      sql`
        SELECT *
        FROM qualification_sessions
        WHERE lead_id = ${leadId}::uuid
        ORDER BY started_at DESC
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
      getLeadNotes(leadId),
    ]);

  const timeline = [
    ...(auditLogs as { event_name: string; created_at: string; actor_type: string; actor_id: string | null; event_payload_json: Record<string, unknown> }[]).map(
      item => ({
        type: item.event_name,
        timestamp: item.created_at,
        actor: {
          type: item.actor_type,
          id: item.actor_id,
        },
        summary: item.event_name.replace(/\./g, " "),
        data: item.event_payload_json,
      }),
    ),
    ...(qualificationSessions as { id: string; started_at: string; completed_at: string | null; status: string; route_decision: string | null }[]).flatMap(
      item => [
        {
          type: "qualification_session_started",
          timestamp: item.started_at,
          actor: { type: "system", id: null },
          summary: "Qualification session started",
          data: { sessionId: item.id, status: item.status },
        },
        ...(item.completed_at
          ? [
              {
                type: "qualification_session_completed",
                timestamp: item.completed_at,
                actor: { type: "system", id: null },
                summary: "Qualification session completed",
                data: { sessionId: item.id, status: item.status, routeDecision: item.route_decision },
              },
            ]
          : []),
      ],
    ),
    ...(supportHandoffs as { channel: string; created_at: string; destination: string; handoff_status: string; handoff_reason: string | null }[]).map(
      item => ({
        type: "support_handoff",
        timestamp: item.created_at,
        actor: { type: "system", id: null },
        summary: `Support handoff created for ${item.channel}`,
        data: {
          destination: item.destination,
          handoffStatus: item.handoff_status,
          handoffReason: item.handoff_reason,
        },
      }),
    ),
    ...(suitabilityAcknowledgements as { created_at: string; acknowledgement_key: string; accepted: boolean }[]).map(item => ({
      type: "suitability_acknowledgement",
      timestamp: item.created_at,
      actor: { type: "anonymous", id: null },
      summary: `Suitability acknowledgement ${item.accepted ? "accepted" : "declined"}`,
      data: {
        acknowledgementKey: item.acknowledgement_key,
        accepted: item.accepted,
      },
    })),
    ...notes.map(note => ({
      type: "lead_note",
      timestamp: note.created_at,
      actor: { type: "user", id: note.author_user_id },
      summary: `Note added (${note.note_type})`,
      data: {
        noteId: note.id,
        noteType: note.note_type,
        isInternal: note.is_internal,
        noteBody: note.note_body,
        authorName: note.author_name ?? null,
      },
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return timeline;
}
