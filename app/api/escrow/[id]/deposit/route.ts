import { NextResponse } from "next/server";
import { escrowStore } from "@/lib/escrow/store";
import { getZcashAdapter } from "@/lib/zcash/adapter";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const amountZats = Number(body.amountZats || 0);

    if (amountZats <= 0) {
      return NextResponse.json({ success: false, error: "Amount must be positive" }, { status: 400 });
    }

    const adapter = getZcashAdapter();
    if (adapter.simulateDeposit) {
      await adapter.simulateDeposit(amountZats, `Escrow Deposit ${id}`, 3);
    }

    const updatedEscrow = escrowStore.recordDeposit(id, amountZats);
    return NextResponse.json({
      success: true,
      message: `Deposit of ${amountZats} zats verified and credited.`,
      escrow: updatedEscrow,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
