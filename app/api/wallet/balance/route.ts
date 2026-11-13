import { NextResponse } from "next/server";
import { getZcashAdapter } from "@/lib/zcash/adapter";

export async function GET() {
  try {
    const adapter = getZcashAdapter();
    if (adapter.getBalance) {
      const balanceInfo = await adapter.getBalance();
      return NextResponse.json({ success: true, ...balanceInfo });
    }

    return NextResponse.json({
      success: true,
      network: adapter.network,
      totalZats: 1_000_000_000,
      confirmedZats: 1_000_000_000,
      unconfirmedZats: 0,
      spendableZats: 1_000_000_000,
      totalZec: 10.0,
      spendableZec: 10.0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
