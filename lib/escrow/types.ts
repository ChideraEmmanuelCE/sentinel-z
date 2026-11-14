export type EscrowStatus = "draft" | "locked" | "review_pending" | "reviewed" | "release_authorized" | "released" | "disputed";

export interface MilestoneEvidence {
  description: string;
  submittedAt: string;
  sourceUrl?: string;
}

export interface EscrowRecord {
  id: string;
  status: EscrowStatus;
  amountZec: number;
  milestone: MilestoneEvidence | null;
  createdAt: string;
  updatedAt: string;
}

export interface OracleAssessment {
  decision: "pass" | "fail" | "needs_human_review";
  confidence: number;
  summary: string;
  criteria: Array<{ criterion: string; passed: boolean; evidence: string }>;
  advisoryOnly: true;
}
