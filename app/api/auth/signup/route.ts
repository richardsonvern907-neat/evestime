import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { sql } from "@/lib/db";

function parseSignupPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const { email, password, name } = payload as Record<string, unknown>;
  const sanitizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const sanitizedPassword = typeof password === "string" ? password : "";
  const sanitizedName = typeof name === "string" ? name.trim() : "";

  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail);

  if (!sanitizedName || !hasValidEmail || sanitizedPassword.length < 8) {
    return null;
  }

  return {
    email: sanitizedEmail,
    password: sanitizedPassword,
    name: sanitizedName,
  };
}

export async function POST(req: Request) {
  try {
    const payload = parseSignupPayload(await req.json());

    if (!payload) {
      return NextResponse.json(
        { error: "Enter a valid name, email, and password of at least 8 characters." },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);

    await sql`
      INSERT INTO users (email, password, name)
      VALUES (${payload.email}, ${hashedPassword}, ${payload.name})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error && /duplicate key/i.test(error.message)
        ? "User already exists"
        : "Unable to create account";

    return NextResponse.json(
      { error: message },
      { status: message === "User already exists" ? 409 : 500 },
    );
  }
}
