# Sentinel-Z: Zcash Architecture & Protocol Design

## Executive Summary

Sentinel-Z is an institutional-grade, privacy-preserving milestone escrow system built on the **Zcash Orchard** shielded protocol. It provides cryptographic privacy for milestone payments, advisory AI-assisted verification, and strict human authorization controls.

Unlike transparent blockchains or naive pseudonymous layers, Sentinel-Z ensures that transaction participants, transfer values, and payment notes remain confidential within the Orchard shielded pool while providing auditable, tamper-evident escrow state transitions.

---

## 1. High-Level Architecture

The architecture consists of four distinct operational boundaries:

```mermaid
flowchart TD
    subgraph ClientLayer ["Client & Frontend (Browser)"]
        UI["Command Center UI (React / Next.js)"]
        Vault3D["Interactive 3D Vault (Three.js)"]
    end

    subgraph AppServer ["Next.js Backend API"]
        EscrowEngine["Escrow State Engine (Atomic Transitions)"]
        OracleService["AI Advisory Oracle (Schema-Validated)"]
        Adapter["Live Zcash Signer Adapter (lib/zcash)"]
    end

    subgraph SignerService ["Rust Zcash Signer Daemon (:8232)"]
        KeyManager["ZIP-32 / Orchard Key Manager"]
        Store["SQLite Wallet & Audit Store"]
        ZIP317["ZIP-317 Marginal Fee Estimator"]
        PCZTModule["PCZT Engine (ZIP-370)"]
        RedPallas["RedPallas Signer (Spend Authorization)"]
    end

    subgraph ZcashNetwork ["Zcash Testnet / Network"]
        LWD["Lightwalletd (gRPC :9067)"]
        OrchardPool["Orchard Shielded Pool (Halo 2 Proofs)"]
    end

    UI --> AppServer
    AppServer --> Adapter
    Adapter -->|Authenticated Bearer REST| SignerService
    SignerService -->|Raw V5 Transactions| LWD
    LWD --> OrchardPool
```

---

## 2. Key Architectural Components

### A. The Next.js Application Layer (`app/`, `lib/escrow/`, `lib/zcash/`)
- **Interactive UI**: Responsive command center built with Tailwind CSS and React Three Fiber rendering the real-time shielded vault state.
- **Escrow State Machine**: Pure domain model enforcing valid state transitions (`unfunded` -> `funded` -> `in_progress` -> `completed` / `disputed` / `refunded`).
- **Signer Adapter Boundary (`lib/zcash/adapter.ts`)**: Strict abstraction between application logic and cryptographic operations. Refuses to fabricate transactions in client-side JavaScript.

### B. The Rust Zcash Signer Daemon (`crates/sentinel-zcash`)
- Built using official, maintained crates:
  - `orchard 0.16`: Shielded note management, RedPallas spend authorization, Orchard action builders.
  - `zcash_primitives 0.31` & `zcash_protocol 0.11`: Consensus parameters, network rules, consensus branch IDs (NU5 `0xc2d6d0b4`).
  - `zcash_keys 0.17`: Unified Address encoding/decoding and full viewing key management.
  - `pczt 0.10`: Partially Created Zcash Transaction (ZIP-370) creation and serialization.
  - `rusqlite 0.33`: WAL-mode SQLite database tracking accounts, shielded notes, proposals, and audit logs.
  - `axum 0.8` & `tokio 1.54`: Authenticated REST microservice exposing secure signing capabilities on `http://127.0.0.1:8232`.

### C. Zcash Testnet Protocol Layer
- **Orchard Shielded Pool**: Utilizes the Halo 2 zero-knowledge proving system. Spends and outputs are concealed in encrypted notes.
- **Unified Addresses (`utest1...`)**: Modern container format containing Orchard receivers, preventing accidental transparent fallback.
- **ZIP-317 Marginal Fees**: Standard marginal fee calculation (10,000 zatoshi minimum base fee) protecting against transaction censorship and resource abuse.

---

## 3. End-to-End Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Payer as Payer (Workspace Admin)
    actor Payee as Recipient (Service Provider)
    participant UI as Sentinel-Z Command Center
    participant API as Next.js API Routes
    participant Rust as Rust Zcash Signer (:8232)
    participant ZEC as Zcash Network (Lightwalletd)

    Payer->>UI: Create Escrow (10 ZEC: M1 2ZEC, M2 3ZEC, M3 5ZEC)
    UI->>API: POST /api/escrow/create
    API-->>UI: Escrow initialized (Unfunded)

    Payer->>UI: Fund Escrow (10 ZEC deposit)
    UI->>API: POST /api/escrow/:id/deposit
    API->>Rust: POST /escrow/deposit/simulate (1,000,000,000 zats)
    Rust-->>API: Deposit confirmed (3 confirmations)
    API-->>UI: Escrow status: FUNDED

    Payee->>UI: Submit Milestone #1 Evidence
    UI->>API: POST /api/escrow/:id/milestones/1/submit
    API-->>UI: Milestone status: SUBMITTED

    Payer->>UI: Trigger Advisory AI Oracle Check
    UI->>API: POST /api/verify-milestone
    API-->>UI: Verdict: PASS (98% confidence, advisory only)

    Payer->>UI: Approve Milestone #1
    UI->>API: POST /api/escrow/:id/milestones/1/approve
    API-->>UI: Milestone status: APPROVED

    Payer->>UI: Authorize Settlement Release (2 ZEC)
    UI->>API: POST /api/escrow/:id/milestones/1/settle
    API->>Rust: POST /tx/propose (recipient, 200,000,000 zats, ZIP-317 fee)
    Rust-->>API: PCZT Proposal generated (10,000 zats fee)
    API->>Rust: POST /tx/authorize-and-sign (RedPallas sighash sign)
    Rust-->>API: Signed raw transaction & RedPallas signature
    API->>Rust: POST /tx/broadcast
    Rust->>ZEC: Broadcast V5 Orchard transaction
    Rust-->>API: TxID & 1 initial confirmation
    API-->>UI: Milestone status: SETTLED (Confirmed receipt)
```

---

## 4. Architectural Boundaries and Security Guarantees

1. **Isolation of Spending Keys**: Private spending keys derived via ZIP-32 reside exclusively in the Rust daemon's memory or encrypted SQLite database. Neither the frontend browser nor the Next.js API server ever inspects raw private spending keys.
2. **Explicit Authorization**: The AI Oracle is strictly advisory. An affirmative AI review has zero capability to move funds or sign transactions. Only an authenticated human payer can approve milestones and trigger the signer.
3. **Idempotency & Replay Defense**: Proposals and settlements require unique idempotency keys. Duplicate broadcasts of identical transactions or settlements for already-settled milestones are rejected at both API and database layers.

