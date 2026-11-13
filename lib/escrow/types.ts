export type EscrowStatus =
  | "draft"
  | "unfunded"
  | "funding_detected"
  | "funded"
  | "in_progress"
  | "completed"
  | "disputed"
  | "refunded";

export type MilestoneStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "rejected"
  | "disputed"
  | "settling"
  | "settled";

export interface MilestoneEvidence {
  description: string;
  submittedAt: string;
  sourceUrl?: string;
  artifactUrls?: string[];
}

export interface OracleAssessment {
  decision: "pass" | "fail" | "needs_human_review";
  confidence: number;
  summary: string;
  criteria: Array<{ criterion: string; passed: boolean; evidence: string }>;
  advisoryOnly: true;
}

export interface EscrowMilestone {
  index: number;
  title: string;
  amountZec: number;
  amountZats: number;
  status: MilestoneStatus;
  evidence: MilestoneEvidence | null;
  oracleAssessment: OracleAssessment | null;
  approvedBy?: string;
  approvedAt?: string;
  proposalId?: string;
  txid?: string;
  confirmations: number;
  settledAt?: string;
}

export interface EscrowRecord {
  id: string;
  title: string;
  payerAddress: string;
  recipientUnifiedAddress: string;
  vaultShieldedAddress: string;
  status: EscrowStatus;
  totalAmountZec: number;
  totalAmountZats: number;
  depositedAmountZats: number;
  allocatedMilestonesZats: number;
  releasedZats: number;
  remainingSpendableZats: number;
  milestones: EscrowMilestone[];
  createdAt: string;
  updatedAt: string;
}
