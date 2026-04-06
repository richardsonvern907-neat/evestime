import { ValidationError } from "@/lib/validation";

export const OFFER_STATUSES = ["draft", "in_review", "published", "archived"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<OfferStatus, readonly OfferStatus[]> = {
  draft: ["in_review"],
  in_review: ["published"],
  published: ["archived"],
  archived: [],
};

export function isOfferStatus(value: string): value is OfferStatus {
  return OFFER_STATUSES.includes(value as OfferStatus);
}

export function assertOfferStatusTransition(currentStatus: string, nextStatus: string) {
  if (!isOfferStatus(currentStatus) || !isOfferStatus(nextStatus)) {
    throw new ValidationError("Invalid offer status.");
  }

  if (!ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus)) {
    throw new ValidationError("Invalid offer status transition.");
  }

  return nextStatus;
}
