# Sentinel-Z: Security Model, Threat Assessment & Operational Safeguards

## 1. Security Philosophy & Assumptions

Sentinel-Z is designed around defense-in-depth principles:
1. **Zero-Knowledge Privacy by Default**: All sensitive transaction amounts, senders, and receivers are shielded inside the Orchard pool.
2. **Strict Cryptographic Privilege Separation**: Spending keys are physically and architecturally isolated from web clients and application servers.
3. **No Autonomous Oracle Fund Releases**: Automated or AI-driven evaluation is strictly advisory. Fund movements require authenticated human authorization.
4. **Conservation of Value Invariants**: Mathematical checks prevent overspending, double-settlement, or unbudgeted fee deductions.

---

## 2. Threat Model & Mitigations

| Threat | Vulnerability Mechanism | Sentinel-Z Architectural Mitigation |
|---|---|---|
| **Private Key Exfiltration** | Browser memory scraping, XSS, server log leaks. | Private spending keys are never sent to or stored in the Next.js application or browser. They reside exclusively in the Rust signer service. |
| **Transaction Tampering** | MITM altering recipient address or amount before signing. | Signer re-verifies recipient address, network, amount, and ZIP-317 fee against the signed proposal before applying RedPallas signatures. |
| **Double-Spending / Duplicate Release** | Rapid repeated API requests or race conditions. | Unique database constraints on `idempotency_key` and transaction IDs; atomic state updates in SQLite WAL mode; nullifier tracking. |
| **Overspending Beyond Vault Holding** | Milestone allocation exceeds available unspent balance. | Pre-proposal validation checks `amount + fee <= remainingSpendableZats`. Proposing funds beyond spendable balance is rejected. |
| **Rogue Oracle Exploit** | Compromised AI model attempting to authorize releases. | The AI Oracle has zero signing keys or payment endpoints. State engine rejects any transition to `settling` without authenticated human approver. |
| **SSRF (Server-Side Request Forgery)** | Malicious URLs submitted as evidence. | Evidence URLs are recorded as advisory strings only; no automated backend fetches occur without strict domain allowlists. |
| **Transaction Replay Attack** | Re-broadcasting valid signatures across networks or blocks. | Zcash V5 transactions enforce consensus branch IDs (`0xc2d6d0b4`), network discrimination, and 40-block expiry heights. |

---

## 3. Operational Safeguards & Key Management

### Isolated Signer Daemon (`sentinel-zcash`)
- Runs as a dedicated background service or container on `127.0.0.1:8232`.
- Endpoints protected by high-entropy Bearer token authentication (`ZCASH_SIGNER_AUTH_TOKEN`).
- SQLite storage operates in Write-Ahead Logging (WAL) mode with strict foreign key constraints.
- Audit logging records every key derivation, deposit detection, proposal construction, RedPallas signature, and network broadcast.

---

## 4. Production-Readiness & Remaining Limitations

> [!CAUTION]
> **Audit Notice**:
> Sentinel-Z is a comprehensive implementation built for Zcash testnet and institutional pilots. **It must undergo an independent third-party cryptographic and smart-contract security audit before handling high-value mainnet funds.**

### Production Hardening Roadmap:
1. **Hardware Security Module (HSM) Integration**: Integrate PKCS#11 or cloud KMS for spending key storage.
2. **FROST Threshold Multi-Sig**: Transition from application custody to a $2$-of-$3$ threshold signature scheme among payer, recipient, and arbitrator.
3. **Multi-Region Lightwalletd Failover**: Implement automated failover across redundant lightwalletd nodes with health checking.
4. **Formal Verification**: Formally verify the state transition engine against double-settlement edge cases under high concurrency.

