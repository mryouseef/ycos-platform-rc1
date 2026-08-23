import { NextResponse } from "next/server";
import { e2eScenario } from "@/src/portal/fixtures";
import { resetM06Repository } from "@/src/m06/repository";
import { resetM07Repository } from "@/src/m07/repository";
import { m08repo } from "@/src/m08/repository";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" || process.env.YCOS_E2E_HARNESS_ENABLED !== "true") return new NextResponse(null, { status: 404 });
  if (!e2eScenario(request.headers.get("x-ycos-e2e-scenario") ?? undefined)) return new NextResponse(null, { status: 404 });
  resetM06Repository();
  resetM07Repository();
  m08repo.reset();
  return new NextResponse(null, { status: 204 });
}
