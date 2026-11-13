import { NextResponse } from "next/server";
import { escrowStore } from "@/lib/escrow/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, payerAddress, recipientUnifiedAddress, vaultShieldedAddress, milestones } = body;

    if (!title || !recipientUnifiedAddress || !milestones || !Array.isArray(milestones)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title, recipientUnifiedAddress, milestones" },
        { status: 400 }
      );
    }

    const escrow = escrowStore.createEscrow({
      title,
      payerAddress: payerAddress || "Buyer / Payer",
      recipientUnifiedAddress,
      vaultShieldedAddress: vaultShieldedAddress || "utest1sentinelshieldedvault999999999999999999999",
      milestones,
    });

    return NextResponse.json({ success: true, escrow });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
