const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function asTrimmedString(value: unknown, maxLength = 255): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed.length > maxLength) {
    return null;
  }

  return trimmed;
}

export function asOptionalString(value: unknown, maxLength = 255): string | null {
  if (value == null || value === "") {
    return null;
  }

  return asTrimmedString(value, maxLength);
}

export function asOptionalEmail(value: unknown): string | null {
  const email = asOptionalString(value, 320);

  if (!email) {
    return null;
  }

  const normalized = email.toLowerCase();
  return EMAIL_PATTERN.test(normalized) ? normalized : null;
}

export function asOptionalPhone(value: unknown): string | null {
  const phone = asOptionalString(value, 32);

  if (!phone) {
    return null;
  }

  return /^[+0-9()\-\s]{7,32}$/.test(phone) ? phone : null;
}

export function asEnum<T extends string>(value: unknown, allowed: readonly T[], fieldName: string): T {
  if (typeof value !== "string") {
    throw new ValidationError(`Invalid ${fieldName}.`);
  }

  const normalized = value.trim() as T;

  if (!allowed.includes(normalized)) {
    throw new ValidationError(`Invalid ${fieldName}.`);
  }

  return normalized;
}

export function asOptionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string,
): T | null {
  if (value == null || value === "") {
    return null;
  }

  return asEnum(value, allowed, fieldName);
}

export function asBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError(`Invalid ${fieldName}.`);
  }

  return value;
}

export function asPositiveInteger(
  value: unknown,
  fieldName: string,
  { defaultValue, min = 1, max = Number.MAX_SAFE_INTEGER }: { defaultValue: number; min?: number; max?: number },
): number {
  if (value == null || value === "") {
    return defaultValue;
  }

  const numeric =
    typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? value : Number.NaN;

  if (!Number.isInteger(numeric) || numeric < min || numeric > max) {
    throw new ValidationError(`Invalid ${fieldName}.`);
  }

  return numeric;
}

export function asIsoDate(value: unknown, fieldName: string): string | null {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`Invalid ${fieldName}.`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`Invalid ${fieldName}.`);
  }

  return parsed.toISOString();
}

export function asSlug(value: unknown, fieldName: string, maxLength = 160): string {
  const slug = asTrimmedString(value, maxLength);

  if (!slug || !SLUG_PATTERN.test(slug)) {
    throw new ValidationError(`Invalid ${fieldName}.`);
  }

  return slug;
}

export function asOptionalUrl(value: unknown, fieldName: string, maxLength = 2048): string | null {
  const url = asOptionalString(value, maxLength);

  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new ValidationError(`Invalid ${fieldName}.`);
    }

    return parsed.toString();
  } catch {
    throw new ValidationError(`Invalid ${fieldName}.`);
  }
}

export function asNumber(
  value: unknown,
  fieldName: string,
  { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY }: { min?: number; max?: number } = {},
): number {
  const numeric =
    typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;

  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    throw new ValidationError(`Invalid ${fieldName}.`);
  }

  return numeric;
}

export function asOptionalNumber(
  value: unknown,
  fieldName: string,
  { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY }: { min?: number; max?: number } = {},
): number | null {
  if (value == null || value === "") {
    return null;
  }

  return asNumber(value, fieldName, { min, max });
}

export function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Invalid request body.");
  }

  return value as Record<string, unknown>;
}
