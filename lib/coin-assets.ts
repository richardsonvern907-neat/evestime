import { randomUUID } from "node:crypto";

import { writeAuditLog } from "@/lib/audit";
import { sql } from "@/lib/db";
import {
  ValidationError,
  asBoolean,
  asObject,
  asOptionalString,
  asOptionalUrl,
  asPositiveInteger,
  asSlug,
} from "@/lib/validation";

export type CoinAssetRecord = {
  id: string;
  symbol: string;
  slug: string;
  name: string;
  chain_name: string | null;
  logo_url: string | null;
  website_url: string | null;
  is_active: boolean;
  market_data_source: string | null;
  created_at: string;
  updated_at: string;
};

function parseCoinAssetPayload(payload: unknown) {
  const body = asObject(payload);
  const symbol = asOptionalString(body.symbol, 24)?.toUpperCase();

  if (!symbol) {
    throw new ValidationError("Invalid symbol.");
  }

  return {
    symbol,
    slug: asSlug(body.slug, "slug", 120),
    name: asOptionalString(body.name, 160) ?? (() => { throw new ValidationError("Invalid name."); })(),
    chainName: asOptionalString(body.chainName, 120),
    logoUrl: asOptionalUrl(body.logoUrl, "logoUrl"),
    websiteUrl: asOptionalUrl(body.websiteUrl, "websiteUrl"),
    isActive: body.isActive == null ? true : asBoolean(body.isActive, "isActive"),
    marketDataSource: asOptionalString(body.marketDataSource, 120),
  };
}

export function parseCoinAssetListQuery(url: URL) {
  return {
    q: asOptionalString(url.searchParams.get("q"), 120),
    isActive: url.searchParams.get("isActive") === null ? null : url.searchParams.get("isActive") === "true",
    page: asPositiveInteger(url.searchParams.get("page"), "page", { defaultValue: 1, min: 1, max: 100000 }),
    pageSize: asPositiveInteger(url.searchParams.get("pageSize"), "pageSize", { defaultValue: 20, min: 1, max: 100 }),
  };
}

export async function createCoinAsset(input: {
  actorUserId: string;
  payload: unknown;
}) {
  const parsed = parseCoinAssetPayload(input.payload);
  const rows = await sql`
    INSERT INTO coin_assets (
      id,
      symbol,
      slug,
      name,
      chain_name,
      logo_url,
      website_url,
      is_active,
      market_data_source
    )
    VALUES (
      ${randomUUID()}::uuid,
      ${parsed.symbol},
      ${parsed.slug},
      ${parsed.name},
      ${parsed.chainName},
      ${parsed.logoUrl},
      ${parsed.websiteUrl},
      ${parsed.isActive},
      ${parsed.marketDataSource}
    )
    RETURNING *
  `;

  const asset = rows[0] as CoinAssetRecord;
  await writeAuditLog({
    actorType: "admin",
    actorId: input.actorUserId,
    entityType: "coin_asset",
    entityId: asset.id,
    eventName: "coin_asset.created",
    eventPayload: {
      symbol: asset.symbol,
      slug: asset.slug,
      isActive: asset.is_active,
    },
  });

  return asset;
}

export async function listAdminCoinAssets(filters: ReturnType<typeof parseCoinAssetListQuery>) {
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (filters.q) {
    params.push(`%${filters.q}%`);
    const index = params.length;
    conditions.push(`(symbol ILIKE $${index} OR slug ILIKE $${index} OR name ILIKE $${index})`);
  }

  if (filters.isActive !== null) {
    params.push(filters.isActive);
    conditions.push(`is_active = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const countRows = await sql.query(`SELECT COUNT(*)::int AS count FROM coin_assets ${whereClause}`, params);
  const offset = (filters.page - 1) * filters.pageSize;
  const rows = await sql.query(
    `SELECT * FROM coin_assets ${whereClause} ORDER BY created_at DESC, id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, filters.pageSize, offset],
  );

  return {
    items: rows as CoinAssetRecord[],
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total: countRows[0]?.count ?? 0,
      totalPages: Math.max(1, Math.ceil((countRows[0]?.count ?? 0) / filters.pageSize)),
    },
    filters,
  };
}

export async function updateCoinAsset(input: {
  id: string;
  actorUserId: string;
  payload: unknown;
}) {
  const parsed = parseCoinAssetPayload(input.payload);
  const previousRows = await sql`SELECT * FROM coin_assets WHERE id = ${input.id}::uuid LIMIT 1`;

  if (previousRows.length === 0) {
    return null;
  }

  const rows = await sql`
    UPDATE coin_assets
    SET symbol = ${parsed.symbol},
        slug = ${parsed.slug},
        name = ${parsed.name},
        chain_name = ${parsed.chainName},
        logo_url = ${parsed.logoUrl},
        website_url = ${parsed.websiteUrl},
        is_active = ${parsed.isActive},
        market_data_source = ${parsed.marketDataSource},
        updated_at = NOW()
    WHERE id = ${input.id}::uuid
    RETURNING *
  `;

  const updated = rows[0] as CoinAssetRecord;
  await writeAuditLog({
    actorType: "admin",
    actorId: input.actorUserId,
    entityType: "coin_asset",
    entityId: updated.id,
    eventName: "coin_asset.updated",
    eventPayload: {
      symbol: updated.symbol,
      slug: updated.slug,
      isActive: updated.is_active,
    },
  });

  return updated;
}

export async function listPublicCoinAssets() {
  const rows = await sql`
    SELECT *
    FROM coin_assets
    WHERE is_active = true
    ORDER BY symbol ASC
  `;

  return rows as CoinAssetRecord[];
}

export async function getCoinAssetById(id: string) {
  const rows = await sql`SELECT * FROM coin_assets WHERE id = ${id}::uuid LIMIT 1`;
  return (rows[0] as CoinAssetRecord | undefined) ?? null;
}

export async function getPublicCoinAssetBySlug(slug: string) {
  const rows = await sql`
    SELECT *
    FROM coin_assets
    WHERE slug = ${slug}
      AND is_active = true
    LIMIT 1
  `;

  return (rows[0] as CoinAssetRecord | undefined) ?? null;
}
