import { NextResponse } from "next/server";

import { getAuthDiagnostics, isDiagnosticsAuthorized } from "@/lib/auth-diagnostics";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isDiagnosticsAuthorized(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const diagnostics = await getAuthDiagnostics();

    return NextResponse.json(diagnostics, {
      status: diagnostics.status === "ok" ? 200 : 503,
    });
  } catch (error) {
    console.error("Auth diagnostics failed.", error);
    return NextResponse.json({ error: "Unable to inspect auth health." }, { status: 500 });
  }
}
