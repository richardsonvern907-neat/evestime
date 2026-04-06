import { NextResponse } from "next/server";

import { sql } from "@/lib/db";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const users = await sql`SELECT email, name FROM users WHERE email = 'demo@evestime.com'`;
    return NextResponse.json({ exists: users.length > 0, user: users[0] || null });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
