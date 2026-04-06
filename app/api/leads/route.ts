import { NextResponse } from "next/server";

import { hashRequestIp, writeAuditLog } from "@/lib/audit";
import { createLead, findLeadByIdempotencyKey, parseCreateLeadPayload } from "@/lib/leads";
import { ValidationError } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() || null;

    if (idempotencyKey) {
      const existingLead = await findLeadByIdempotencyKey(idempotencyKey);

      if (existingLead) {
        return NextResponse.json(
          {
            lead: {
              id: existingLead.id,
              leadStatus: existingLead.lead_status,
              productType: existingLead.product_type,
              productSlug: existingLead.product_slug,
            },
            idempotent: true,
          },
          { status: 200 },
        );
      }
    }

    const payload = parseCreateLeadPayload(await request.json());
    const lead = await createLead(payload);

    await writeAuditLog({
      actorType: "anonymous",
      entityType: "lead",
      entityId: lead.id,
      eventName: "lead.created",
      eventPayload: {
        idempotencyKey,
        sourceChannel: lead.source_channel,
        sourcePage: lead.source_page,
        productType: lead.product_type,
        productSlug: lead.product_slug,
        interestType: lead.interest_type,
        requestIpHash: hashRequestIp(request),
      },
    });

    return NextResponse.json(
      {
        lead: {
          id: lead.id,
          leadStatus: lead.lead_status,
          productType: lead.product_type,
          productSlug: lead.product_slug,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Lead creation failed.", error);
    return NextResponse.json({ error: "Unable to create lead." }, { status: 500 });
  }
}
