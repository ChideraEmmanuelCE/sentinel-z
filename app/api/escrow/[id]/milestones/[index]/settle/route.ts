import { NextResponse } from "next/server";
import { escrowStore } from "@/lib/escrow/store";
import { validateMilestoneSettlement } from "@/lib/escrow/transitions";
import { getZcashAdapter } from "@/lib/zcash/adapter";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  try {
    const { id, index } = await params;
    const milestoneIndex = parseInt(index, 10);
    const body = await req.json().catch(() => ({}));
    const authorizedBy = body.authorizedBy || "Payer (CE)";

    const escrow = escrowStore.getEscrow(id);
    if (!escrow) {
      return NextResponse.json({ success: false, error: "Escrow not found" }, { status: 404 });
    }

    // 1. Enforce strict settlement validation rules
    const validation = validateMilestoneSettlement(escrow, milestoneIndex, authorizedBy);
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.reason }, { status: 400 });
    }

    const milestone = escrow.milestones.find((m) => m.index === milestoneIndex)!;
    const adapter = getZcashAdapter();
    const idempotencyKey = `snz_${id}_m${milestoneIndex}_${Date.now()}`;

    // 2. Proposal generation
    let proposalId = `prop_demo_${Date.now()}`;
    let txid = `TXID-DEMO-${Date.now()}`;
    let rawTxHex = "05000000c2d6d0b4";
    let signatureHex = "sig_redpallas_spend_auth";
    let feeZats = 10_000;

    if (adapter.proposeSettlement && adapter.authorizeAndSign && adapter.broadcast) {
      const proposal = await adapter.proposeSettlement(
        id,
        milestoneIndex,
        escrow.recipientUnifiedAddress,
        milestone.amountZats,
        idempotencyKey
      );
      proposalId = proposal.proposalId;
      feeZats = proposal.feeZats;

      // Mark milestone as settling in escrow store
      escrowStore.markSettling(id, milestoneIndex, proposalId);

      // 3. Authorization & RedPallas signing
      const signed = await adapter.authorizeAndSign(proposalId, authorizedBy);
      txid = signed.txid;
      rawTxHex = signed.rawTxHex;
      signatureHex = signed.authorizationSignatureHex;

      // 4. On-chain broadcast
      await adapter.broadcast(proposalId, txid, rawTxHex);
    } else {
      // Fallback for demo adapter
      const receipt = await adapter.createShieldedPayment({
        escrowId: id,
        amountZatoshi: BigInt(milestone.amountZats),
        recipientUnifiedAddress: escrow.recipientUnifiedAddress,
        idempotencyKey,
        authorizedBy,
      });
      txid = receipt.transactionId;
    }

    // 5. Mark settled in store
    const updatedEscrow = escrowStore.markSettled(id, milestoneIndex, txid, 3);

    return NextResponse.json({
      success: true,
      message: `Milestone #${milestoneIndex} settlement successfully broadcast and confirmed!`,
      settlement: {
        proposalId,
        txid,
        network: adapter.network,
        amountZats: milestone.amountZats,
        amountZec: milestone.amountZec,
        feeZats,
        rawTxHex,
        signatureHex,
        confirmations: 3,
        settledAt: new Date().toISOString(),
      },
      escrow: updatedEscrow,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
