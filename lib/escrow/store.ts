import type { EscrowRecord, EscrowMilestone, MilestoneEvidence, OracleAssessment } from "./types";

class EscrowMemoryStore {
  private escrows: Map<string, EscrowRecord> = new Map();

  constructor() {
    this.seedDefaultEscrow();
  }

  private seedDefaultEscrow() {
    const defaultEscrow: EscrowRecord = {
      id: "SNZ-2026-00421",
      title: "Core Privacy Protocol & Shielded Milestone Escrow",
      payerAddress: "CE (Workspace Admin)",
      recipientUnifiedAddress: "utest1zcs08q98z9hfk6w3uclq7k840vymj0k562kyp8f0c57n252c79a9wslq72sydwvv70t5p0r4q3y",
      vaultShieldedAddress: "utest1vault00421zcashshieldedpool000000000000000000000000000000000000000000000000",
      status: "funded",
      totalAmountZec: 10.0,
      totalAmountZats: 1_000_000_000,
      depositedAmountZats: 1_000_000_000,
      allocatedMilestonesZats: 1_000_000_000,
      releasedZats: 0,
      remainingSpendableZats: 1_000_000_000,
      createdAt: "2026-11-13T14:20:00Z",
      updatedAt: new Date().toISOString(),
      milestones: [
        {
          index: 1,
          title: "Milestone 1: Zcash Orchard Wallet SDK & Key Derivation",
          amountZec: 2.0,
          amountZats: 200_000_000,
          status: "approved",
          evidence: {
            description: "Completed ZIP-32 Orchard key derivation, Unified Address generation (utest1...), and ZIP-317 fee module.",
            submittedAt: "2026-11-13T14:28:51Z",
            sourceUrl: "https://github.com/ChideraEmmanuelCE/sentinel-z/commit/91f3f7c",
          },
          oracleAssessment: {
            decision: "pass",
            confidence: 0.98,
            summary: "Cryptographic specifications, RedPallas signature schemes, and Orchard receiver formats match NU5 standards.",
            criteria: [
              { criterion: "ZIP-32 Seed & Key Derivation", passed: true, evidence: "Orchard SpendingKey, FVK, and IVK verified." },
              { criterion: "Unified Address Encoding", passed: true, evidence: "Valid Bech32m utest1... address generated with Orchard receiver." },
              { criterion: "ZIP-317 Fee Calculation", passed: true, evidence: "10,000 zats base marginal fee enforced." },
            ],
            advisoryOnly: true,
          },
          approvedBy: "CE (Workspace Admin)",
          approvedAt: "2026-11-13T14:32:00Z",
          confirmations: 0,
        },
        {
          index: 2,
          title: "Milestone 2: PCZT Construction & Payer Authorization",
          amountZec: 3.0,
          amountZats: 300_000_000,
          status: "pending",
          evidence: null,
          oracleAssessment: null,
          confirmations: 0,
        },
        {
          index: 3,
          title: "Milestone 3: On-Chain Broadcast & Testnet Confirmation",
          amountZec: 5.0,
          amountZats: 500_000_000,
          status: "pending",
          evidence: null,
          oracleAssessment: null,
          confirmations: 0,
        },
      ],
    };

    this.escrows.set(defaultEscrow.id, defaultEscrow);
  }

  getEscrow(id: string): EscrowRecord | undefined {
    return this.escrows.get(id);
  }

  listEscrows(): EscrowRecord[] {
    return Array.from(this.escrows.values());
  }

  createEscrow(params: {
    id?: string;
    title: string;
    payerAddress: string;
    recipientUnifiedAddress: string;
    vaultShieldedAddress: string;
    milestones: Array<{ title: string; amountZec: number }>;
  }): EscrowRecord {
    const id = params.id || `SNZ-${Date.now().toString(36).toUpperCase()}`;
    const totalAmountZec = params.milestones.reduce((acc, m) => acc + m.amountZec, 0);
    const totalAmountZats = Math.round(totalAmountZec * 100_000_000);

    const compiledMilestones: EscrowMilestone[] = params.milestones.map((m, idx) => ({
      index: idx + 1,
      title: m.title,
      amountZec: m.amountZec,
      amountZats: Math.round(m.amountZec * 100_000_000),
      status: "pending",
      evidence: null,
      oracleAssessment: null,
      confirmations: 0,
    }));

    const record: EscrowRecord = {
      id,
      title: params.title,
      payerAddress: params.payerAddress,
      recipientUnifiedAddress: params.recipientUnifiedAddress,
      vaultShieldedAddress: params.vaultShieldedAddress,
      status: "unfunded",
      totalAmountZec,
      totalAmountZats,
      depositedAmountZats: 0,
      allocatedMilestonesZats: totalAmountZats,
      releasedZats: 0,
      remainingSpendableZats: 0,
      milestones: compiledMilestones,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.escrows.set(id, record);
    return record;
  }

  recordDeposit(id: string, amountZats: number): EscrowRecord {
    const escrow = this.escrows.get(id);
    if (!escrow) throw new Error(`Escrow not found: ${id}`);

    escrow.depositedAmountZats += amountZats;
    escrow.remainingSpendableZats += amountZats;

    if (escrow.depositedAmountZats >= escrow.totalAmountZats) {
      escrow.status = "funded";
    } else {
      escrow.status = "funding_detected";
    }

    escrow.updatedAt = new Date().toISOString();
    return escrow;
  }

  submitEvidence(id: string, milestoneIndex: number, evidence: MilestoneEvidence): EscrowRecord {
    const escrow = this.escrows.get(id);
    if (!escrow) throw new Error(`Escrow not found: ${id}`);

    const milestone = escrow.milestones.find((m) => m.index === milestoneIndex);
    if (!milestone) throw new Error(`Milestone #${milestoneIndex} not found`);

    if (milestone.status === "settled") throw new Error("Cannot submit evidence for already settled milestone");

    milestone.evidence = evidence;
    milestone.status = "submitted";
    escrow.updatedAt = new Date().toISOString();
    return escrow;
  }

  attachOracleAssessment(id: string, milestoneIndex: number, assessment: OracleAssessment): EscrowRecord {
    const escrow = this.escrows.get(id);
    if (!escrow) throw new Error(`Escrow not found: ${id}`);

    const milestone = escrow.milestones.find((m) => m.index === milestoneIndex);
    if (!milestone) throw new Error(`Milestone #${milestoneIndex} not found`);

    milestone.oracleAssessment = assessment;
    escrow.updatedAt = new Date().toISOString();
    return escrow;
  }

  approveMilestone(id: string, milestoneIndex: number, approver: string): EscrowRecord {
    const escrow = this.escrows.get(id);
    if (!escrow) throw new Error(`Escrow not found: ${id}`);

    const milestone = escrow.milestones.find((m) => m.index === milestoneIndex);
    if (!milestone) throw new Error(`Milestone #${milestoneIndex} not found`);

    if (milestone.status === "settled") throw new Error("Milestone is already settled");

    milestone.status = "approved";
    milestone.approvedBy = approver;
    milestone.approvedAt = new Date().toISOString();
    escrow.updatedAt = new Date().toISOString();
    return escrow;
  }

  rejectMilestone(id: string, milestoneIndex: number): EscrowRecord {
    const escrow = this.escrows.get(id);
    if (!escrow) throw new Error(`Escrow not found: ${id}`);

    const milestone = escrow.milestones.find((m) => m.index === milestoneIndex);
    if (!milestone) throw new Error(`Milestone #${milestoneIndex} not found`);

    if (milestone.status === "settled") throw new Error("Milestone is already settled");

    milestone.status = "rejected";
    escrow.updatedAt = new Date().toISOString();
    return escrow;
  }

  markSettling(id: string, milestoneIndex: number, proposalId: string): EscrowRecord {
    const escrow = this.escrows.get(id);
    if (!escrow) throw new Error(`Escrow not found: ${id}`);

    const milestone = escrow.milestones.find((m) => m.index === milestoneIndex);
    if (!milestone) throw new Error(`Milestone #${milestoneIndex} not found`);

    milestone.status = "settling";
    milestone.proposalId = proposalId;
    escrow.status = "in_progress";
    escrow.updatedAt = new Date().toISOString();
    return escrow;
  }

  markSettled(id: string, milestoneIndex: number, txid: string, confirmations = 3): EscrowRecord {
    const escrow = this.escrows.get(id);
    if (!escrow) throw new Error(`Escrow not found: ${id}`);

    const milestone = escrow.milestones.find((m) => m.index === milestoneIndex);
    if (!milestone) throw new Error(`Milestone #${milestoneIndex} not found`);

    milestone.status = "settled";
    milestone.txid = txid;
    milestone.confirmations = confirmations;
    milestone.settledAt = new Date().toISOString();

    escrow.releasedZats += milestone.amountZats;
    escrow.remainingSpendableZats = Math.max(0, escrow.remainingSpendableZats - milestone.amountZats);

    const allSettled = escrow.milestones.every((m) => m.status === "settled");
    if (allSettled) {
      escrow.status = "completed";
    } else {
      escrow.status = "in_progress";
    }

    escrow.updatedAt = new Date().toISOString();
    return escrow;
  }
}

// Global singleton for Next.js API routes
declare global {
  var __sentinel_escrow_store: EscrowMemoryStore | undefined;
}

export const escrowStore: EscrowMemoryStore =
  globalThis.__sentinel_escrow_store ?? (globalThis.__sentinel_escrow_store = new EscrowMemoryStore());
