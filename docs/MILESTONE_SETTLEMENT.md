# Sentinel-Z: Milestone-Based Approval & Settlement Engine

## 1. Settlement Protocol Invariants

Sentinel-Z enforces eight immutable rules before any milestone funds can move:

1. **No settlement without a funded escrow**: The escrow must be in `funded` or `in_progress` status.
2. **No settlement without valid milestone approval**: The milestone must be in `approved` status.
3. **No settlement above milestone allocation**: Settlement amount must strictly equal the approved milestone allocation.
4. **No duplicate settlements**: Once a milestone is settled and associated with an on-chain transaction ID, duplicate attempts are rejected.
5. **No settlement exceeding available funds**: Milestone amount plus ZIP-317 marginal fee cannot exceed remaining spendable vault funds.
6. **No unauthorized release**: Releasing funds requires explicit, authenticated caller credentials (`authorizedBy`).
7. **Rejected milestones cannot trigger payment**: If a milestone is marked `rejected`, settlement proposals are blocked.
8. **Fee isolation**: ZIP-317 fees are calculated and accounted for separately from milestone allocations, ensuring that network costs never erode recipient payouts.

---

## 2. Step-by-Step Settlement Lifecycle

### Stage 1: Agreement Initialization & Funding
- Payer creates an escrow specifying title, recipient Unified Address (`utest1...`), and milestone tranches:
  - Total: 10.0 ZEC (1,000,000,000 zats).
  - Milestone 1: 2.0 ZEC (200,000,000 zats).
  - Milestone 2: 3.0 ZEC (300,000,000 zats).
  - Milestone 3: 5.0 ZEC (500,000,000 zats).
- Payer deposits 10.0 ZEC into the shielded vault address.
- Vault detects deposit notes and confirms 3 on-chain confirmations. Status becomes `funded`.

### Stage 2: Milestone Delivery & Advisory AI Assessment
- Recipient submits delivery evidence (e.g., source commit URL, encrypted proof hash, architectural delivery).
- Status becomes `submitted`.
- Advisory AI Oracle assesses evidence against contractual requirements:
  - Validates schema and verifiable delivery criteria.
  - Returns `pass`, `fail`, or `needs_human_review` with confidence metric.
  - Marked clearly as `advisoryOnly: true`.

### Stage 3: Human Review & Approval
- Payer reviews submission and oracle assessment.
- Payer explicitly calls `/api/escrow/:id/milestones/:index/approve`.
- State transitions to `approved`.

### Stage 4: Proposal Generation & PCZT Construction
- Backend calls Rust signer:
  ```http
  POST /tx/propose
  {
    "escrow_id": "SNZ-2026-00421",
    "milestone_index": 1,
    "recipient_address": "utest1recipient...",
    "amount_zats": 200000000,
    "idempotency_key": "snz_m1_settle_001"
  }
  ```
- Signer calculates ZIP-317 fee (10,000 zats), constructs PCZT, and returns proposal record.
- Milestone state transitions to `settling`.

### Stage 5: Authorization & RedPallas Signing
- Payer provides authorization token.
- Signer derives RedPallas spending key, computes Orchard sighash, signs using $\mathsf{rsk}$, and produces complete serialized V5 raw transaction hex.
- Proposal state becomes `signed`.

### Stage 6: Broadcast & Confirmation Monitoring
- Transaction is broadcast to the Zcash network via lightwalletd `SendTransaction`.
- Signer tracks block height and confirmation count.
- Once 3 confirmations are reached, milestone status is set to `settled`.
- Released funds are incremented (+2 ZEC), and remaining spendable balance is decremented (-2 ZEC).
- Escrow remains `in_progress` until all milestones are settled, upon which it transitions to `completed`.

