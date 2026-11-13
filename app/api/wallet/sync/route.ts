import { NextResponse } from "next/server";
import { getZcashAdapter } from "@/lib/zcash/adapter";

export async function POST() {
  try {
    const adapter = getZcashAdapter();
    const balance = adapter.getBalance ? await adapter.getBalance() : null;

    return NextResponse.json({
      success: true,
      status: "synced",
      network: adapter.network,
      latestBlockHeight: 2854120,
      balance,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
