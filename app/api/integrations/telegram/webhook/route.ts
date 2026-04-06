import { NextResponse } from "next/server";

import { processTelegramWebhook } from "@/lib/telegram";
import { ValidationError, asObject } from "@/lib/validation";

export const runtime = "nodejs";

function isTelegramSecretValid(request: Request) {
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!configuredSecret) {
    return true;
  }

  return request.headers.get("x-telegram-bot-api-secret-token") === configuredSecret;
}

export async function POST(request: Request) {
  try {
    if (!isTelegramSecretValid(request)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = asObject(await request.json());
    await processTelegramWebhook(payload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Telegram webhook handling failed.", error);
    return NextResponse.json({ error: "Unable to process webhook." }, { status: 500 });
  }
}
