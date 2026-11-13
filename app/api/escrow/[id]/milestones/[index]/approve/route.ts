import { NextResponse } from "next/server";
import { escrowStore } from "@/lib/escrow/store";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  try {
    const { id, index } = await params;
    const milestoneIndex = parseInt(index, 10);
    const body = await req.json().catch(() => ({}));
    const approver = body.approvedBy || "Payer (CE)";

    const updatedEscrow = escrowStore.approveMilestone(id, milestoneIndex, approver);
    return NextResponse.json({
      success: true,
      message: `Milestone #${milestoneIndex} approved by ${approver}.`,
      escrow: updatedEscrow,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
