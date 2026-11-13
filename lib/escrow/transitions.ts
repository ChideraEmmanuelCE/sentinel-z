import type { EscrowRecord, EscrowStatus } from "./types";

const allowedTransitions: Record<EscrowStatus, EscrowStatus[]> = {
  draft: ["unfunded", "funded"],
  unfunded: ["funding_detected", "funded"],
  funding_detected: ["funded", "unfunded"],
  funded: ["in_progress", "disputed", "refunded"],
  in_progress: ["completed", "disputed", "refunded"],
  completed: [],
  disputed: ["in_progress", "refunded", "completed"],
  refunded: [],
};

export function canTransitionEscrow(from: EscrowStatus, to: EscrowStatus): boolean {
  return allowedTransitions[from]?.includes(to) ?? false;
}

export function assertEscrowTransition(from: EscrowStatus, to: EscrowStatus): void {
  if (!canTransitionEscrow(from, to)) {
    throw new Error(`Invalid escrow state transition: ${from} -> ${to}`);
  }
}

export function validateMilestoneSettlement(
  escrow: EscrowRecord,
  milestoneIndex: number,
  authorizedBy: string
): { valid: boolean; reason?: string } {
  // 1. Escrow must be funded or in progress
  if (escrow.status !== "funded" && escrow.status !== "in_progress") {
    return {
      valid: false,
      reason: `Cannot settle milestone: Escrow is in status '${escrow.status}'. Must be funded.`,
    };
  }

  // 2. Locate milestone
  const milestone = escrow.milestones.find((m) => m.index === milestoneIndex);
  if (!milestone) {
    return {
      valid: false,
      reason: `Milestone #${milestoneIndex} not found in escrow ${escrow.id}.`,
    };
  }

  // 3. Duplicate settlement check
  if (milestone.status === "settled" || milestone.txid) {
    return {
      valid: false,
      reason: `Milestone #${milestoneIndex} is already settled (txid: ${milestone.txid || "confirmed"}). Duplicate settlement prevented.`,
    };
  }

  // 4. Milestone must be approved
  if (milestone.status !== "approved") {
    return {
      valid: false,
      reason: `Milestone #${milestoneIndex} is in status '${milestone.status}'. Must be explicitly approved before settlement.`,
    };
  }

  // 5. Sufficient funds check
  const requiredZats = milestone.amountZats;
  if (requiredZats > escrow.remainingSpendableZats) {
    return {
      valid: false,
      reason: `Insufficient escrow funds: Milestone requires ${requiredZats} zats, but remaining spendable balance is ${escrow.remainingSpendableZats} zats.`,
    };
  }

  // 6. Authorization check
  if (!authorizedBy || authorizedBy.trim().length === 0) {
    return {
      valid: false,
      reason: "Unauthorized: Missing explicit approver / signer identity.",
    };
  }

  return { valid: true };
}
