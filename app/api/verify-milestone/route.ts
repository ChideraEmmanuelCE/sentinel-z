import { NextResponse } from "next/server";
import { milestoneRequestSchema } from "@/lib/ai/schema";
import { assessMilestone } from "@/lib/ai/oracle";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 12_000) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = milestoneRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid milestone payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const assessment = await assessMilestone(parsed.data);
    return NextResponse.json({ assessment, authorizationRequired: true, releaseTriggered: false });
  } catch {
    return NextResponse.json({ error: "Milestone assessment failed." }, { status: 500 });
  }
}
