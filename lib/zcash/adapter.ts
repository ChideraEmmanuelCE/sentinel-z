export type ZcashNetwork = "demo" | "testnet" | "mainnet";

export interface ShieldedPaymentRequest {
  escrowId: string;
  amountZatoshi: bigint;
  recipientUnifiedAddress: string;
  encryptedMemo?: string;
  idempotencyKey?: string;
  authorizedBy?: string;
}

export interface ShieldedPaymentReceipt {
  network: ZcashNetwork;
  transactionId: string;
  simulated: boolean;
  createdAt: string;
  rawTxHex?: string;
  signatureHex?: string;
  feeZats?: number;
}

export interface WalletAddressInfo {
  accountId: string;
  name: string;
  unifiedAddress: string;
  fvkHex: string;
  network: string;
}

export interface WalletBalanceInfo {
  totalZats: number;
  confirmedZats: number;
  unconfirmedZats: number;
  spendableZats: number;
  totalZec: number;
  spendableZec: number;
  network: string;
}

export interface SettlementProposal {
  proposalId: string;
  escrowId: string;
  milestoneIndex: number;
  recipientAddress: string;
  amountZats: number;
  feeZats: number;
  totalDeductionZats: number;
  pcztHex: string;
  createdAt: string;
}

export interface SignedSettlement {
  proposalId: string;
  txid: string;
  rawTxHex: string;
  network: string;
  authorizationSignatureHex: string;
  signedAt: string;
}

export interface OnChainTransactionStatus {
  txid: string;
  proposalId?: string;
  rawTxHex: string;
  network: string;
  confirmations: number;
  status: "broadcast" | "confirmed" | "failed";
  broadcastAt: string;
  confirmedAt?: string;
}

export interface ZcashWalletAdapter {
  readonly network: ZcashNetwork;
  createShieldedPayment(request: ShieldedPaymentRequest): Promise<ShieldedPaymentReceipt>;
  getAddress?(): Promise<WalletAddressInfo>;
  getBalance?(): Promise<WalletBalanceInfo>;
  proposeSettlement?(
    escrowId: string,
    milestoneIndex: number,
    recipientAddress: string,
    amountZats: number,
    idempotencyKey: string
  ): Promise<SettlementProposal>;
  authorizeAndSign?(proposalId: string, authorizedBy: string): Promise<SignedSettlement>;
  broadcast?(proposalId: string, txid: string, rawTxHex: string): Promise<OnChainTransactionStatus>;
  getTransactionStatus?(txid: string): Promise<OnChainTransactionStatus>;
  simulateDeposit?(amountZats: number, memo?: string, confirmations?: number): Promise<{ success: boolean; noteId: string }>;
}

export class LiveZcashSignerAdapter implements ZcashWalletAdapter {
  readonly network: ZcashNetwork;
  private readonly baseUrl: string;
  private readonly authToken?: string;

  constructor(network: ZcashNetwork, baseUrl = "http://127.0.0.1:8232", authToken?: string) {
    this.network = network;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.authToken = authToken;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Signer API error (${res.status} ${path}): ${errText}`);
    }

    return res.json() as Promise<T>;
  }

  async getAddress(): Promise<WalletAddressInfo> {
    const data = await this.request<{
      account_id: string;
      name: string;
      unified_address: string;
      fvk_hex: string;
      network: string;
    }>("/wallet/address");

    return {
      accountId: data.account_id,
      name: data.name,
      unifiedAddress: data.unified_address,
      fvkHex: data.fvk_hex,
      network: data.network,
    };
  }

  async getBalance(): Promise<WalletBalanceInfo> {
    const data = await this.request<{
      balance: {
        total_zats: number;
        confirmed_zats: number;
        unconfirmed_zats: number;
        spendable_zats: number;
        total_zec: number;
        spendable_zec: number;
      };
      network: string;
    }>("/wallet/balance");

    return {
      totalZats: data.balance.total_zats,
      confirmedZats: data.balance.confirmed_zats,
      unconfirmedZats: data.balance.unconfirmed_zats,
      spendableZats: data.balance.spendable_zats,
      totalZec: data.balance.total_zec,
      spendableZec: data.balance.spendable_zec,
      network: data.network,
    };
  }

  async proposeSettlement(
    escrowId: string,
    milestoneIndex: number,
    recipientAddress: string,
    amountZats: number,
    idempotencyKey: string
  ): Promise<SettlementProposal> {
    const data = await this.request<{
      success: boolean;
      proposal: {
        proposal_id: string;
        escrow_id: string;
        milestone_index: number;
        recipient: { raw: string };
        amount_zats: number;
        fee_zats: number;
        total_deduction_zats: number;
        pczt_hex: string;
        created_at: string;
      };
    }>("/tx/propose", {
      method: "POST",
      body: JSON.stringify({
        escrow_id: escrowId,
        milestone_index: milestoneIndex,
        recipient_address: recipientAddress,
        amount_zats: amountZats,
        idempotency_key: idempotencyKey,
      }),
    });

    return {
      proposalId: data.proposal.proposal_id,
      escrowId: data.proposal.escrow_id,
      milestoneIndex: data.proposal.milestone_index,
      recipientAddress: data.proposal.recipient.raw,
      amountZats: data.proposal.amount_zats,
      feeZats: data.proposal.fee_zats,
      totalDeductionZats: data.proposal.total_deduction_zats,
      pcztHex: data.proposal.pczt_hex,
      createdAt: data.proposal.created_at,
    };
  }

  async authorizeAndSign(proposalId: string, authorizedBy: string): Promise<SignedSettlement> {
    const data = await this.request<{
      success: boolean;
      signed: {
        proposal_id: string;
        txid: string;
        raw_tx_hex: string;
        network: string;
        authorization_signature_hex: string;
        signed_at: string;
      };
    }>("/tx/authorize-and-sign", {
      method: "POST",
      body: JSON.stringify({
        proposal_id: proposalId,
        authorized_by: authorizedBy,
      }),
    });

    return {
      proposalId: data.signed.proposal_id,
      txid: data.signed.txid,
      rawTxHex: data.signed.raw_tx_hex,
      network: data.signed.network,
      authorizationSignatureHex: data.signed.authorization_signature_hex,
      signedAt: data.signed.signed_at,
    };
  }

  async broadcast(proposalId: string, txid: string, rawTxHex: string): Promise<OnChainTransactionStatus> {
    const data = await this.request<{
      success: boolean;
      transaction: {
        txid: string;
        proposal_id?: string;
        raw_tx_hex: string;
        network: string;
        confirmations: number;
        status: "broadcast" | "confirmed" | "failed";
        broadcast_at: string;
        confirmed_at?: string;
      };
    }>("/tx/broadcast", {
      method: "POST",
      body: JSON.stringify({
        proposal_id: proposalId,
        txid,
        raw_tx_hex: rawTxHex,
      }),
    });

    return {
      txid: data.transaction.txid,
      proposalId: data.transaction.proposal_id,
      rawTxHex: data.transaction.raw_tx_hex,
      network: data.transaction.network,
      confirmations: data.transaction.confirmations,
      status: data.transaction.status,
      broadcastAt: data.transaction.broadcast_at,
      confirmedAt: data.transaction.confirmed_at,
    };
  }

  async getTransactionStatus(txid: string): Promise<OnChainTransactionStatus> {
    const data = await this.request<{
      success: boolean;
      transaction: {
        txid: string;
        proposal_id?: string;
        raw_tx_hex: string;
        network: string;
        confirmations: number;
        status: "broadcast" | "confirmed" | "failed";
        broadcast_at: string;
        confirmed_at?: string;
      };
    }>(`/tx/status/${encodeURIComponent(txid)}`);

    return {
      txid: data.transaction.txid,
      proposalId: data.transaction.proposal_id,
      rawTxHex: data.transaction.raw_tx_hex,
      network: data.transaction.network,
      confirmations: data.transaction.confirmations,
      status: data.transaction.status,
      broadcastAt: data.transaction.broadcast_at,
      confirmedAt: data.transaction.confirmed_at,
    };
  }

  async simulateDeposit(
    amountZats: number,
    memo?: string,
    confirmations = 3
  ): Promise<{ success: boolean; noteId: string }> {
    const data = await this.request<{
      success: boolean;
      note: { id: string };
      message: string;
    }>("/escrow/deposit/simulate", {
      method: "POST",
      body: JSON.stringify({
        amount_zats: amountZats,
        memo,
        confirmations,
      }),
    });

    return {
      success: data.success,
      noteId: data.note.id,
    };
  }

  async createShieldedPayment(request: ShieldedPaymentRequest): Promise<ShieldedPaymentReceipt> {
    const idempotencyKey = request.idempotencyKey || `snz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const authorizedBy = request.authorizedBy || "payer_authorized";

    // 1. Propose settlement
    const proposal = await this.proposeSettlement(
      request.escrowId,
      1,
      request.recipientUnifiedAddress,
      Number(request.amountZatoshi),
      idempotencyKey
    );

    // 2. Authorize and Sign
    const signed = await this.authorizeAndSign(proposal.proposalId, authorizedBy);

    // 3. Broadcast to network
    const broadcasted = await this.broadcast(proposal.proposalId, signed.txid, signed.rawTxHex);

    return {
      network: this.network,
      transactionId: broadcasted.txid,
      simulated: false,
      createdAt: broadcasted.broadcastAt,
      rawTxHex: signed.rawTxHex,
      signatureHex: signed.authorizationSignatureHex,
      feeZats: proposal.feeZats,
    };
  }
}

export class DemoZcashAdapter implements ZcashWalletAdapter {
  readonly network = "demo" as const;

  async createShieldedPayment(request: ShieldedPaymentRequest): Promise<ShieldedPaymentReceipt> {
    if (!request.recipientUnifiedAddress.startsWith("u1") && !request.recipientUnifiedAddress.startsWith("utest1")) {
      throw new Error("Expected a Zcash Unified Address (u1... or utest1...).");
    }
    if (request.amountZatoshi <= 0n) throw new Error("Payment amount must be positive.");

    const randomId = globalThis.crypto.randomUUID().replaceAll("-", "");
    return {
      network: "demo",
      transactionId: `SIMULATED-${randomId}`,
      simulated: true,
      createdAt: new Date().toISOString(),
      feeZats: 10_000,
    };
  }

  async getAddress(): Promise<WalletAddressInfo> {
    return {
      accountId: "demo_acc_001",
      name: "Sentinel Demo Vault",
      unifiedAddress: "utest1demo9999999999999999999999999999999999999999999999999999999999999999999999999",
      fvkHex: "fvk_demo_simulated_orchard_fvk",
      network: "demo",
    };
  }

  async getBalance(): Promise<WalletBalanceInfo> {
    return {
      totalZats: 1_000_000_000,
      confirmedZats: 1_000_000_000,
      unconfirmedZats: 0,
      spendableZats: 1_000_000_000,
      totalZec: 10.0,
      spendableZec: 10.0,
      network: "demo",
    };
  }
}

export function getZcashNetwork(): ZcashNetwork {
  const value = process.env.ZCASH_NETWORK_MODE;
  if (value === "testnet" || value === "mainnet") return value;
  return "testnet";
}

export function getZcashAdapter(): ZcashWalletAdapter {
  const network = getZcashNetwork();
  const signerUrl = process.env.ZCASH_SIGNER_URL || "http://127.0.0.1:8232";
  const authToken = process.env.ZCASH_SIGNER_AUTH_TOKEN;

  if (network === "testnet" || network === "mainnet") {
    return new LiveZcashSignerAdapter(network, signerUrl, authToken);
  }
  return new DemoZcashAdapter();
}
