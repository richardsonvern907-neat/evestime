import { ValidationError } from "@/lib/validation";

export const LEAD_STATUSES = [
  "new",
  "qualified",
  "awaiting_suitability",
  "ready_for_handoff",
  "handed_off",
  "contacted",
  "in_review",
  "converted",
  "closed_won",
  "closed_lost",
  "spam",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  new: ["qualified", "spam", "closed_lost"],
  qualified: ["awaiting_suitability", "ready_for_handoff", "contacted", "closed_lost"],
  awaiting_suitability: ["ready_for_handoff", "closed_lost"],
  ready_for_handoff: ["handed_off", "contacted", "closed_lost"],
  handed_off: ["contacted", "in_review", "closed_lost"],
  contacted: ["in_review", "converted", "closed_lost"],
  in_review: ["converted", "closed_won", "closed_lost"],
  converted: ["closed_won"],
  closed_won: [],
  closed_lost: [],
  spam: [],
};

export function isLeadStatus(value: string): value is LeadStatus {
  return LEAD_STATUSES.includes(value as LeadStatus);
}

export function assertValidLeadStatusTransition(currentStatus: string, nextStatus: string) {
  if (!isLeadStatus(currentStatus) || !isLeadStatus(nextStatus)) {
    throw new ValidationError("Invalid lead status.");
  }

  if (currentStatus === nextStatus) {
    return nextStatus;
  }

  if (!ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus)) {
    throw new ValidationError("Invalid lead status transition.");
  }

  return nextStatus;
}
