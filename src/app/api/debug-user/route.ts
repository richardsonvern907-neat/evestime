import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const users = await sql`SELECT email, name FROM users WHERE email = 'demo@evestime.com'`;
    return NextResponse.json({ exists: users.length > 0, user: users[0] || null });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
