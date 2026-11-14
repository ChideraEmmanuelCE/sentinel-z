import { NextResponse } from "next/server";
import { milestoneRequestSchema } from "@/lib/ai/schema";
import { assessMilestone } from "@/lib/ai/oracle";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 12_000;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function POST(request: Request) {
  // The endpoint currently has no payment or escrow side effects. Reject
  // cross-origin browser submissions and enforce a real byte limit even when
  // Content-Length is absent or incorrect.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Cross-origin requests are not allowed." }, 403);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ error: "Request body is too large." }, 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return json({ error: "Unable to read request body." }, 400);
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return json({ error: "Request body is too large." }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const parsed = milestoneRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Invalid milestone payload.", details: parsed.error.flatten() }, 400);
  }

  try {
    const assessment = await assessMilestone(parsed.data);
    return json({ assessment, authorizationRequired: true, releaseTriggered: false });
  } catch {
    return json({ error: "Milestone assessment failed." }, 500);
  }
}
