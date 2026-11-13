import { NextResponse } from "next/server";
import { getZcashAdapter } from "@/lib/zcash/adapter";

export async function GET() {
  try {
    const adapter = getZcashAdapter();
    if (adapter.getAddress) {
      const addressInfo = await adapter.getAddress();
      return NextResponse.json({ success: true, ...addressInfo });
    }

    return NextResponse.json({
      success: true,
      network: adapter.network,
      unifiedAddress: "utest1sentinelprimaryvault9999999999999999999999999999999999999999999999999999999999999",
      fvkHex: "fvk_shielded_orchard_viewing_key",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
