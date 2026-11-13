export type ZcashNetwork = "demo" | "testnet" | "mainnet";

export interface ShieldedPaymentRequest {
  escrowId: string;
  amountZatoshi: bigint;
  recipientUnifiedAddress: string;
  encryptedMemo?: string;
}

export interface ShieldedPaymentReceipt {
  network: ZcashNetwork;
  transactionId: string;
  simulated: boolean;
  createdAt: string;
}

export interface ZcashWalletAdapter {
  readonly network: ZcashNetwork;
  createShieldedPayment(request: ShieldedPaymentRequest): Promise<ShieldedPaymentReceipt>;
}

/**
 * This adapter deliberately refuses to pretend it can create Orchard spends.
 * A production implementation must delegate to a supported Zcash wallet SDK
 * or a trusted, authenticated signer service running outside this Next.js app.
 */
export class DemoZcashAdapter implements ZcashWalletAdapter {
  readonly network = "demo" as const;

  async createShieldedPayment(request: ShieldedPaymentRequest): Promise<ShieldedPaymentReceipt> {
    if (!request.recipientUnifiedAddress.startsWith("u1")) {
      throw new Error("Expected a Zcash Unified Address (u1...).");
    }
    if (request.amountZatoshi <= 0n) throw new Error("Payment amount must be positive.");

    const randomId = globalThis.crypto.randomUUID().replaceAll("-", "");
    return {
      network: "demo",
      transactionId: `SIMULATED-${randomId}`,
      simulated: true,
      createdAt: new Date().toISOString()
    };
  }
}

export function getZcashNetwork(): ZcashNetwork {
  const value = process.env.ZCASH_NETWORK_MODE;
  if (value === "testnet" || value === "mainnet") return value;
  return "demo";
}

export function getZcashAdapter(): ZcashWalletAdapter {
  const network = getZcashNetwork();
  if (network !== "demo") {
    throw new Error("A real Zcash wallet/signer adapter has not been configured. Refusing to fabricate an on-chain transaction.");
  }
  return new DemoZcashAdapter();
}
