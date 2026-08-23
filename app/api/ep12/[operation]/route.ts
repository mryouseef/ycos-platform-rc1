/** EP-12 local synthetic HTTP attack-harness surface; production and disabled-harness requests are intentionally hidden. */
import { handleEp12 } from "@/src/ep12/api-security";

export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ operation: string }> }) { return handleEp12(request, (await context.params).operation); }
export async function POST(request: Request, context: { params: Promise<{ operation: string }> }) { return handleEp12(request, (await context.params).operation); }
export async function DELETE(request: Request, context: { params: Promise<{ operation: string }> }) { return handleEp12(request, (await context.params).operation); }
