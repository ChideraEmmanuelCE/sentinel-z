import test from "node:test";
import assert from "node:assert/strict";
import { escrowStore } from "../lib/escrow/store.ts";
import { validateMilestoneSettlement, canTransitionEscrow } from "../lib/escrow/transitions.ts";

test("Escrow State Machine Transitions", () => {
  assert.equal(canTransitionEscrow("draft", "funded"), true);
  assert.equal(canTransitionEscrow("unfunded", "funding_detected"), true);
  assert.equal(canTransitionEscrow("funded", "in_progress"), true);
  assert.equal(canTransitionEscrow("completed", "in_progress"), false); // terminal state
  assert.equal(canTransitionEscrow("refunded", "in_progress"), false); // terminal state
});

test("Settlement Validation: Requires Funded Escrow", () => {
  const unfundedEscrow = escrowStore.createEscrow({
    title: "Unfunded Test",
    payerAddress: "Payer",
    recipientUnifiedAddress: "utest1test",
    vaultShieldedAddress: "utest1vault",
    milestones: [{ title: "M1", amountZec: 2.0 }],
  });

  const res = validateMilestoneSettlement(unfundedEscrow, 1, "Payer");
  assert.equal(res.valid, false);
  assert.match(res.reason, /Must be funded/);
});

test("Settlement Validation: Requires Explicit Approval", () => {
  const fundedEscrow = escrowStore.createEscrow({
    id: "SNZ-TEST-VALIDATION",
    title: "Funded Test",
    payerAddress: "Payer",
    recipientUnifiedAddress: "utest1test",
    vaultShieldedAddress: "utest1vault",
    milestones: [{ title: "M1", amountZec: 2.0 }],
  });
  escrowStore.recordDeposit(fundedEscrow.id, 200_000_000);

  // Milestone is pending (not approved yet)
  const res = validateMilestoneSettlement(fundedEscrow, 1, "Payer");
  assert.equal(res.valid, false);
  assert.match(res.reason, /Must be explicitly approved/);
});

test("Settlement Validation: Prevents Duplicate Settlements", () => {
  const escrow = escrowStore.getEscrow("SNZ-2026-00421");
  assert.ok(escrow);

  // Settle Milestone 1
  escrowStore.markSettled(escrow.id, 1, "TXID_TEST_SETTLED_001", 3);

  // Attempt duplicate settlement
  const res = validateMilestoneSettlement(escrow, 1, "Payer");
  assert.equal(res.valid, false);
  assert.match(res.reason, /already settled/);
});

test("Settlement Validation: Prevents Overspending Escrow Balance", () => {
  const escrow = escrowStore.createEscrow({
    id: "SNZ-TEST-LOW-FUNDS",
    title: "Low Funds Test",
    payerAddress: "Payer",
    recipientUnifiedAddress: "utest1test",
    vaultShieldedAddress: "utest1vault",
    milestones: [
      { title: "M1", amountZec: 4.0 },
      { title: "M2", amountZec: 2.0 },
    ],
  });
  // Fund full 6 ZEC (600_000_000 zats)
  escrowStore.recordDeposit(escrow.id, 600_000_000);

  // Settle M1 (4 ZEC), leaving 2 ZEC
  escrowStore.markSettled(escrow.id, 1, "TXID_M1_SETTLED", 3);
  
  // Artificially reduce spendable balance to test boundary
  escrow.remainingSpendableZats = 50_000_000; // 0.5 ZEC < 2.0 ZEC

  escrowStore.approveMilestone(escrow.id, 2, "Payer");
  const res = validateMilestoneSettlement(escrow, 2, "Payer");
  assert.equal(res.valid, false);
  assert.match(res.reason, /Insufficient escrow funds/);
});
