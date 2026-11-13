import type { EscrowStatus } from "./types";

const allowed: Record<EscrowStatus, EscrowStatus[]> = {
  draft: ["locked"],
  locked: ["review_pending", "disputed"],
  review_pending: ["reviewed", "disputed"],
  reviewed: ["release_authorized", "disputed", "review_pending"],
  release_authorized: ["released", "disputed"],
  released: [],
  disputed: ["review_pending"]
};

export function canTransition(from: EscrowStatus, to: EscrowStatus): boolean {
  return allowed[from].includes(to);
}

export function assertTransition(from: EscrowStatus, to: EscrowStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid escrow transition: ${from} -> ${to}`);
  }
}
