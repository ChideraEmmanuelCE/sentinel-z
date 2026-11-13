import { NextResponse } from "next/server";
import { getZcashAdapter } from "@/lib/zcash/adapter";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ txid: string }> }
) {
  try {
    const { txid } = await params;
    const adapter = getZcashAdapter();

    if (adapter.getTransactionStatus) {
      const status = await adapter.getTransactionStatus(txid);
      return NextResponse.json({ success: true, transaction: status });
    }

    return NextResponse.json({
      success: true,
      transaction: {
        txid,
        network: adapter.network,
        confirmations: 3,
        status: "confirmed",
        broadcastAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
