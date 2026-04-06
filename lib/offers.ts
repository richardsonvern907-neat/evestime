import { randomUUID } from "node:crypto";

import { writeAuditLog } from "@/lib/audit";
import { sql } from "@/lib/db";
import { assertOfferStatusTransition } from "@/lib/offer-status";
import {
  ValidationError,
  asBoolean,
  asEnum,
  asIsoDate,
  asObject,
  asOptionalNumber,
  asOptionalString,
  asOptionalUrl,
  asPositiveInteger,
  asSlug,
} from "@/lib/validation";

const OFFER_TYPES = ["coin", "portfolio", "yield_offer", "futures_opportunity"] as const;
const PRODUCT_TRACKS = ["core_investing", "pro_opportunities"] as const;
const RISK_LEVELS = ["low", "medium", "high", "very_high"] as const;
const OFFER_STATUSES = ["draft", "in_review", "published", "archived"] as const;
const ADMIN_SORT_FIELDS = {
  created_at: "o.created_at",
  updated_at: "o.updated_at",
  published_at: "o.published_at",
  title: "o.title",
  sort_order: "o.sort_order",
} as const;
const PUBLIC_SORT_FIELDS = {
  sort_order: "sort_order",
  available_from: "available_from",
  title: "title",
  created_at: "created_at",
} as const;

export type OfferRecord = {
  id: string;
  offer_type: string;
  product_track: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  risk_level: string | null;
  min_investment_amount: string | number | null;
  currency: string;
  expected_return_text: string | null;
  term_text: string | null;
  status: string;
  suitability_required: boolean;
  featured: boolean;
  hero_image_url: string | null;
  sort_order: number;
  available_from: string | null;
  available_until: string | null;
  created_by_user_id: string;
  reviewed_by_user_id: string | null;
  published_by_user_id: string | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OfferAssetRecord = {
  id: string;
  offer_id: string;
  coin_asset_id: string;
  allocation_percent: string | number | null;
  display_order: number;
  created_at: string;
  symbol?: string;
  slug?: string;
  name?: string;
};

function parseOfferPayload(payload: unknown) {
  const body = asObject(payload);
  const offerType = asEnum(body.offerType, OFFER_TYPES, "offerType");
  const productTrack = asEnum(body.productTrack, PRODUCT_TRACKS, "productTrack");
  const status =
    body.status == null || body.status === ""
      ? "draft"
      : asEnum(body.status, OFFER_STATUSES, "status");
  const suitabilityRequired =
    body.suitabilityRequired == null ? false : asBoolean(body.suitabilityRequired, "suitabilityRequired");

  if (offerType === "futures_opportunity" && productTrack !== "pro_opportunities") {
    throw new ValidationError("futures_opportunity must use pro_opportunities.");
  }

  if (productTrack === "pro_opportunities" && !suitabilityRequired) {
    throw new ValidationError("Pro Opportunities offers must require suitability.");
  }

  return {
    offerType,
    productTrack,
    slug: asSlug(body.slug, "slug", 160),
    title: asOptionalString(body.title, 180) ?? (() => { throw new ValidationError("Invalid title."); })(),
    summary: asOptionalString(body.summary, 400) ?? (() => { throw new ValidationError("Invalid summary."); })(),
    description: asOptionalString(body.description, 12000),
    riskLevel:
      body.riskLevel == null || body.riskLevel === ""
        ? null
        : asEnum(body.riskLevel, RISK_LEVELS, "riskLevel"),
    minInvestmentAmount: asOptionalNumber(body.minInvestmentAmount, "minInvestmentAmount", { min: 0 }),
    currency: asOptionalString(body.currency, 12)?.toUpperCase() ?? "USD",
    expectedReturnText: asOptionalString(body.expectedReturnText, 240),
    termText: asOptionalString(body.termText, 240),
    status,
    suitabilityRequired,
    featured: body.featured == null ? false : asBoolean(body.featured, "featured"),
    heroImageUrl: asOptionalUrl(body.heroImageUrl, "heroImageUrl"),
    sortOrder:
      body.sortOrder == null || body.sortOrder === "" ? 0 : asPositiveInteger(body.sortOrder, "sortOrder", { defaultValue: 0, min: 0, max: 100000 }),
    availableFrom: asIsoDate(body.availableFrom, "availableFrom"),
    availableUntil: asIsoDate(body.availableUntil, "availableUntil"),
  };
}

function ensurePublishableOffer(offer: OfferRecord) {
  if (!offer.title || !offer.summary || !offer.slug) {
    throw new ValidationError("Offer is missing required publish fields.");
  }

  if (offer.product_track === "pro_opportunities" && !offer.suitability_required) {
    throw new ValidationError("Pro Opportunities offers require suitability.");
  }

  if (offer.offer_type === "futures_opportunity" && offer.product_track !== "pro_opportunities") {
    throw new ValidationError("futures_opportunity must use pro_opportunities.");
  }
}

export function parseAdminOfferListQuery(url: URL) {
  const rawStatus = url.searchParams.get("status");
  const rawProductTrack = url.searchParams.get("productTrack");
  const rawOfferType = url.searchParams.get("offerType");
  const rawFeatured = url.searchParams.get("featured");
  const rawSortBy = url.searchParams.get("sortBy");
  const rawSortOrder = url.searchParams.get("sortOrder");

  return {
    q: asOptionalString(url.searchParams.get("q"), 160),
    status: rawStatus ? asEnum(rawStatus, OFFER_STATUSES, "status") : null,
    productTrack: rawProductTrack ? asEnum(rawProductTrack, PRODUCT_TRACKS, "productTrack") : null,
    offerType: rawOfferType ? asEnum(rawOfferType, OFFER_TYPES, "offerType") : null,
    featured: rawFeatured == null ? null : rawFeatured === "true",
    createdBy: asOptionalString(url.searchParams.get("createdBy"), 120),
    page: asPositiveInteger(url.searchParams.get("page"), "page", { defaultValue: 1, min: 1, max: 100000 }),
    pageSize: asPositiveInteger(url.searchParams.get("pageSize"), "pageSize", { defaultValue: 20, min: 1, max: 100 }),
    sortBy: rawSortBy
      ? asEnum(rawSortBy, Object.keys(ADMIN_SORT_FIELDS) as (keyof typeof ADMIN_SORT_FIELDS)[], "sortBy")
      : "updated_at",
    sortOrder: rawSortOrder
      ? asEnum(rawSortOrder, ["asc", "desc"] as const, "sortOrder")
      : "desc",
  };
}

export function parsePublicOfferListQuery(url: URL) {
  const rawProductTrack = url.searchParams.get("productTrack");
  const rawOfferType = url.searchParams.get("offerType");
  const rawRiskLevel = url.searchParams.get("riskLevel");
  const rawSortBy = url.searchParams.get("sortBy");
  const rawSortOrder = url.searchParams.get("sortOrder");
  const featuredParam = url.searchParams.get("featured");

  return {
    q: asOptionalString(url.searchParams.get("q"), 160),
    productTrack: rawProductTrack ? asEnum(rawProductTrack, PRODUCT_TRACKS, "productTrack") : null,
    offerType: rawOfferType ? asEnum(rawOfferType, OFFER_TYPES, "offerType") : null,
    featured: featuredParam == null ? null : featuredParam === "true",
    riskLevel: rawRiskLevel ? asEnum(rawRiskLevel, RISK_LEVELS, "riskLevel") : null,
    page: asPositiveInteger(url.searchParams.get("page"), "page", { defaultValue: 1, min: 1, max: 100000 }),
    pageSize: asPositiveInteger(url.searchParams.get("pageSize"), "pageSize", { defaultValue: 20, min: 1, max: 100 }),
    sortBy: rawSortBy
      ? asEnum(rawSortBy, Object.keys(PUBLIC_SORT_FIELDS) as (keyof typeof PUBLIC_SORT_FIELDS)[], "sortBy")
      : "sort_order",
    sortOrder: rawSortOrder
      ? asEnum(rawSortOrder, ["asc", "desc"] as const, "sortOrder")
      : "asc",
  };
}

export async function createOffer(input: { actorUserId: string; payload: unknown }) {
  const parsed = parseOfferPayload(input.payload);
  const rows = await sql`
    INSERT INTO offers (
      id, offer_type, product_track, slug, title, summary, description, risk_level,
      min_investment_amount, currency, expected_return_text, term_text, status,
      suitability_required, featured, hero_image_url, sort_order, available_from,
      available_until, created_by_user_id
    )
    VALUES (
      ${randomUUID()}::uuid, ${parsed.offerType}, ${parsed.productTrack}, ${parsed.slug},
      ${parsed.title}, ${parsed.summary}, ${parsed.description}, ${parsed.riskLevel},
      ${parsed.minInvestmentAmount}, ${parsed.currency}, ${parsed.expectedReturnText}, ${parsed.termText},
      ${parsed.status}, ${parsed.suitabilityRequired}, ${parsed.featured}, ${parsed.heroImageUrl},
      ${parsed.sortOrder},
      ${parsed.availableFrom ? `${parsed.availableFrom}` : null}::timestamptz,
      ${parsed.availableUntil ? `${parsed.availableUntil}` : null}::timestamptz,
      ${input.actorUserId}
    )
    RETURNING *
  `;

  const offer = rows[0] as OfferRecord;
  await writeAuditLog({
    actorType: "admin",
    actorId: input.actorUserId,
    entityType: "offer",
    entityId: offer.id,
    eventName: "offer.created",
    eventPayload: {
      slug: offer.slug,
      offerType: offer.offer_type,
      productTrack: offer.product_track,
      status: offer.status,
    },
  });
  return offer;
}

export async function updateOffer(input: { id: string; actorUserId: string; payload: unknown }) {
  const existing = await getOfferById(input.id);
  if (!existing) return null;
  const parsed = parseOfferPayload(input.payload);
  const rows = await sql`
    UPDATE offers
    SET offer_type = ${parsed.offerType},
        product_track = ${parsed.productTrack},
        slug = ${parsed.slug},
        title = ${parsed.title},
        summary = ${parsed.summary},
        description = ${parsed.description},
        risk_level = ${parsed.riskLevel},
        min_investment_amount = ${parsed.minInvestmentAmount},
        currency = ${parsed.currency},
        expected_return_text = ${parsed.expectedReturnText},
        term_text = ${parsed.termText},
        status = ${parsed.status},
        suitability_required = ${parsed.suitabilityRequired},
        featured = ${parsed.featured},
        hero_image_url = ${parsed.heroImageUrl},
        sort_order = ${parsed.sortOrder},
        available_from = ${parsed.availableFrom ? `${parsed.availableFrom}` : null}::timestamptz,
        available_until = ${parsed.availableUntil ? `${parsed.availableUntil}` : null}::timestamptz,
        updated_at = NOW()
    WHERE id = ${input.id}::uuid
    RETURNING *
  `;
  const updated = rows[0] as OfferRecord;
  await writeAuditLog({
    actorType: "admin",
    actorId: input.actorUserId,
    entityType: "offer",
    entityId: updated.id,
    eventName: "offer.updated",
    eventPayload: {
      status: updated.status,
      slug: updated.slug,
      featured: updated.featured,
    },
  });
  return updated;
}

export async function getOfferById(id: string) {
  const rows = await sql`SELECT * FROM offers WHERE id = ${id}::uuid LIMIT 1`;
  return (rows[0] as OfferRecord | undefined) ?? null;
}

export async function getOfferBySlugForPublic(slug: string) {
  const rows = await sql`
    SELECT *
    FROM offers
    WHERE slug = ${slug}
      AND status = 'published'
      AND (available_from IS NULL OR available_from <= NOW())
      AND (available_until IS NULL OR available_until >= NOW())
    LIMIT 1
  `;
  return (rows[0] as OfferRecord | undefined) ?? null;
}

export async function getOfferAssets(offerId: string) {
  const rows = await sql.query(
    `
      SELECT oa.*, ca.symbol, ca.slug, ca.name
      FROM offer_assets oa
      INNER JOIN coin_assets ca ON ca.id = oa.coin_asset_id
      WHERE oa.offer_id = $1::uuid
      ORDER BY oa.display_order ASC, oa.created_at ASC
    `,
    [offerId],
  );
  return rows as OfferAssetRecord[];
}

export async function replaceOfferAssets(input: {
  offerId: string;
  actorUserId: string;
  payload: unknown;
}) {
  const body = asObject(input.payload);
  const assets = body.assets;

  if (!Array.isArray(assets)) {
    throw new ValidationError("Invalid assets.");
  }

  const offer = await getOfferById(input.offerId);
  if (!offer) return null;

  const parsedAssets = assets.map((item, index) => {
    const record = asObject(item);
    return {
      coinAssetId: asOptionalString(record.coinAssetId, 120) ?? (() => { throw new ValidationError("Invalid coinAssetId."); })(),
      allocationPercent: asOptionalNumber(record.allocationPercent, "allocationPercent", { min: 0, max: 100 }),
      displayOrder:
        record.displayOrder == null || record.displayOrder === ""
          ? index
          : asPositiveInteger(record.displayOrder, "displayOrder", { defaultValue: index, min: 0, max: 100000 }),
    };
  });

  if (offer.offer_type === "portfolio") {
    const total = parsedAssets.reduce((sum, asset) => sum + (asset.allocationPercent ?? 0), 0);
    if (Math.abs(total - 100) > 0.0001) {
      throw new ValidationError("Portfolio allocations must total 100.");
    }
    if (parsedAssets.some(asset => asset.allocationPercent == null)) {
      throw new ValidationError("Portfolio allocations require allocationPercent.");
    }
  }

  await sql`DELETE FROM offer_assets WHERE offer_id = ${input.offerId}::uuid`;

  for (const asset of parsedAssets) {
    await sql`
      INSERT INTO offer_assets (
        id,
        offer_id,
        coin_asset_id,
        allocation_percent,
        display_order
      )
      VALUES (
        ${randomUUID()}::uuid,
        ${input.offerId}::uuid,
        ${asset.coinAssetId}::uuid,
        ${asset.allocationPercent},
        ${asset.displayOrder}
      )
    `;
  }

  await writeAuditLog({
    actorType: "admin",
    actorId: input.actorUserId,
    entityType: "offer",
    entityId: input.offerId,
    eventName: "offer.assets.replaced",
    eventPayload: {
      assetCount: parsedAssets.length,
      portfolioValidated: offer.offer_type === "portfolio",
    },
  });

  return getOfferAssets(input.offerId);
}

export async function submitOfferReview(input: { id: string; actorUserId: string }) {
  const existing = await getOfferById(input.id);
  if (!existing) return null;
  const nextStatus = assertOfferStatusTransition(existing.status, "in_review");
  const rows = await sql`
    UPDATE offers
    SET status = ${nextStatus},
        reviewed_by_user_id = ${input.actorUserId},
        updated_at = NOW()
    WHERE id = ${input.id}::uuid
    RETURNING *
  `;
  const updated = rows[0] as OfferRecord;
  await writeAuditLog({
    actorType: "admin",
    actorId: input.actorUserId,
    entityType: "offer",
    entityId: input.id,
    eventName: "offer.review_submitted",
    eventPayload: {
      previousStatus: existing.status,
      nextStatus,
    },
  });
  return updated;
}

export async function publishOffer(input: { id: string; actorUserId: string }) {
  const existing = await getOfferById(input.id);
  if (!existing) return null;
  ensurePublishableOffer(existing);
  const nextStatus = assertOfferStatusTransition(existing.status, "published");
  const rows = await sql`
    UPDATE offers
    SET status = ${nextStatus},
        published_by_user_id = ${input.actorUserId},
        published_at = NOW(),
        archived_at = NULL,
        updated_at = NOW()
    WHERE id = ${input.id}::uuid
    RETURNING *
  `;
  const updated = rows[0] as OfferRecord;
  await writeAuditLog({
    actorType: "admin",
    actorId: input.actorUserId,
    entityType: "offer",
    entityId: input.id,
    eventName: "offer.published",
    eventPayload: {
      previousStatus: existing.status,
      nextStatus,
    },
  });
  return updated;
}

export async function archiveOffer(input: { id: string; actorUserId: string }) {
  const existing = await getOfferById(input.id);
  if (!existing) return null;
  const nextStatus = assertOfferStatusTransition(existing.status, "archived");
  const rows = await sql`
    UPDATE offers
    SET status = ${nextStatus},
        archived_at = NOW(),
        updated_at = NOW()
    WHERE id = ${input.id}::uuid
    RETURNING *
  `;
  const updated = rows[0] as OfferRecord;
  await writeAuditLog({
    actorType: "admin",
    actorId: input.actorUserId,
    entityType: "offer",
    entityId: input.id,
    eventName: "offer.archived",
    eventPayload: {
      previousStatus: existing.status,
      nextStatus,
    },
  });
  return updated;
}

export async function listAdminOffers(filters: ReturnType<typeof parseAdminOfferListQuery>) {
  const params: unknown[] = [];
  const conditions: string[] = [];
  if (filters.q) {
    params.push(`%${filters.q}%`);
    const i = params.length;
    conditions.push(`(o.title ILIKE $${i} OR o.slug ILIKE $${i} OR o.summary ILIKE $${i})`);
  }
  if (filters.status) { params.push(filters.status); conditions.push(`o.status = $${params.length}`); }
  if (filters.productTrack) { params.push(filters.productTrack); conditions.push(`o.product_track = $${params.length}`); }
  if (filters.offerType) { params.push(filters.offerType); conditions.push(`o.offer_type = $${params.length}`); }
  if (filters.featured !== null) { params.push(filters.featured); conditions.push(`o.featured = $${params.length}`); }
  if (filters.createdBy) { params.push(filters.createdBy); conditions.push(`o.created_by_user_id = $${params.length}`); }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const count = await sql.query(`SELECT COUNT(*)::int AS count FROM offers o ${whereClause}`, params);
  const offset = (filters.page - 1) * filters.pageSize;
  const rows = await sql.query(
    `
      SELECT
        o.id, o.slug, o.title, o.offer_type, o.product_track, o.status, o.risk_level,
        o.featured, o.suitability_required, o.published_at, o.archived_at, o.updated_at, o.created_at
      FROM offers o
      ${whereClause}
      ORDER BY ${ADMIN_SORT_FIELDS[filters.sortBy]} ${filters.sortOrder.toUpperCase()}, o.id ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
    [...params, filters.pageSize, offset],
  );
  return {
    items: rows,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total: count[0]?.count ?? 0,
      totalPages: Math.max(1, Math.ceil((count[0]?.count ?? 0) / filters.pageSize)),
    },
    filters,
  };
}

export async function listPublicOffers(filters: ReturnType<typeof parsePublicOfferListQuery>) {
  const params: unknown[] = [];
  const conditions = [
    `status = 'published'`,
    `(available_from IS NULL OR available_from <= NOW())`,
    `(available_until IS NULL OR available_until >= NOW())`,
  ];
  if (filters.q) {
    params.push(`%${filters.q}%`);
    const i = params.length;
    conditions.push(`(title ILIKE $${i} OR slug ILIKE $${i} OR summary ILIKE $${i})`);
  }
  if (filters.productTrack) { params.push(filters.productTrack); conditions.push(`product_track = $${params.length}`); }
  if (filters.offerType) { params.push(filters.offerType); conditions.push(`offer_type = $${params.length}`); }
  if (filters.featured !== null) { params.push(filters.featured); conditions.push(`featured = $${params.length}`); }
  if (filters.riskLevel) { params.push(filters.riskLevel); conditions.push(`risk_level = $${params.length}`); }
  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const count = await sql.query(`SELECT COUNT(*)::int AS count FROM offers ${whereClause}`, params);
  const offset = (filters.page - 1) * filters.pageSize;
  const rows = await sql.query(
    `
      SELECT
        id, slug, title, summary, offer_type, product_track, risk_level,
        min_investment_amount, currency, expected_return_text, term_text, featured,
        hero_image_url, suitability_required, available_from, available_until
      FROM offers
      ${whereClause}
      ORDER BY ${PUBLIC_SORT_FIELDS[filters.sortBy]} ${filters.sortOrder.toUpperCase()}, id ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
    [...params, filters.pageSize, offset],
  );
  return {
    items: rows,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total: count[0]?.count ?? 0,
      totalPages: Math.max(1, Math.ceil((count[0]?.count ?? 0) / filters.pageSize)),
    },
    filters,
  };
}

export async function getComplianceTemplateRefsForOffer(offer: OfferRecord) {
  const rows = await sql.query(
    `
      SELECT id, acknowledgement_key, title
      FROM compliance_acknowledgement_templates
      WHERE is_active = true
        AND (applies_to_product_track IS NULL OR applies_to_product_track = $1)
        AND (applies_to_offer_type IS NULL OR applies_to_offer_type = $2)
      ORDER BY created_at ASC
    `,
    [offer.product_track, offer.offer_type],
  );
  return rows;
}

export async function getPublicOfferDetail(slug: string) {
  const offer = await getOfferBySlugForPublic(slug);
  if (!offer) return null;
  const [assets, complianceTemplates] = await Promise.all([
    getOfferAssets(offer.id),
    getComplianceTemplateRefsForOffer(offer),
  ]);
  return { offer, assets, complianceTemplates };
}

export async function getPublicCoinAssetDetail(slug: string) {
  const assetRows = await sql`
    SELECT *
    FROM coin_assets
    WHERE slug = ${slug}
      AND is_active = true
    LIMIT 1
  `;
  const asset = (assetRows[0] as Record<string, unknown> | undefined) ?? null;
  if (!asset) return null;
  const offers = await sql.query(
    `
      SELECT
        o.id, o.slug, o.title, o.summary, o.offer_type, o.product_track, o.risk_level,
        o.min_investment_amount, o.currency, o.expected_return_text, o.term_text,
        o.featured, o.hero_image_url, o.suitability_required, o.available_from, o.available_until
      FROM offers o
      INNER JOIN offer_assets oa ON oa.offer_id = o.id
      WHERE oa.coin_asset_id = $1::uuid
        AND o.status = 'published'
        AND (o.available_from IS NULL OR o.available_from <= NOW())
        AND (o.available_until IS NULL OR o.available_until >= NOW())
      ORDER BY o.sort_order ASC, o.created_at DESC
    `,
    [asset.id],
  );
  return { asset, offers };
}
