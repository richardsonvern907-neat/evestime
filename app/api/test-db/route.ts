import { NextResponse } from "next/server";

import { sql } from "@/lib/db";

export async function GET() {
  try {
    const result = await sql`SELECT NOW()`;
    return NextResponse.json({ success: true, time: result[0].now });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
