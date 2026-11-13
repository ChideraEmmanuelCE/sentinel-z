import { NextResponse } from "next/server";
import { escrowStore } from "@/lib/escrow/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const escrow = escrowStore.getEscrow(id);
    if (!escrow) {
      return NextResponse.json({ success: false, error: "Escrow not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, escrow });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
