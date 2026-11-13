import { NextResponse } from "next/server";
import { escrowStore } from "@/lib/escrow/store";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  try {
    const { id, index } = await params;
    const milestoneIndex = parseInt(index, 10);
    const body = await req.json();

    if (!body.description) {
      return NextResponse.json({ success: false, error: "Evidence description is required" }, { status: 400 });
    }

    const evidence = {
      description: body.description,
      sourceUrl: body.sourceUrl,
      artifactUrls: body.artifactUrls || [],
      submittedAt: new Date().toISOString(),
    };

    const updatedEscrow = escrowStore.submitEvidence(id, milestoneIndex, evidence);
    return NextResponse.json({ success: true, escrow: updatedEscrow });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
