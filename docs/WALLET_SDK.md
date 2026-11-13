# Sentinel-Z: Zcash Orchard Wallet SDK

The Sentinel-Z Wallet SDK provides a high-level, production-ready interface for managing Zcash Orchard shielded accounts, Unified Addresses, spendable balances, transaction proposals, PCZT generation, and on-chain settlements.

---

## 1. Core Architecture & Standards

- **Protocol**: Zcash Orchard (NU5 network upgrade).
- **Proving System**: Halo 2 (recursive, trustless zero-knowledge proofs).
- **Address Standard**: ZIP-316 Unified Addresses (containing Orchard receiver).
- **Key Derivation**: ZIP-32 hierarchical deterministic key derivation from BIP-39 mnemonic phrases.
- **Transaction Format**: Zcash Transaction Version 5 (V5) with Orchard bundles.
- **Fee Standard**: ZIP-317 standard marginal fee algorithm.
- **Accounting Unit**: Integer Zatoshi (1 ZEC = 100,000,000 zatoshi). Floating point arithmetic is strictly forbidden in accounting logic.

---

## 2. Rust SDK API (`sentinel_zcash`)

### Wallet Initialization

```rust
use sentinel_zcash::config::Config;
use sentinel_zcash::crypto::keys::{generate_new_wallet, derive_wallet_from_mnemonic};
use sentinel_zcash::wallet::manager::WalletManager;
use sentinel_zcash::wallet::store::WalletStore;
use zcash_protocol::consensus::Network;

// 1. Initialize SQLite store and WalletManager
let config = Config::from_env();
let store = WalletStore::open("sentinel_wallet.db")?;
let manager = WalletManager::new(config, store);

// 2. Generate a new 24-word BIP-39 mnemonic and derive Orchard keys
let (account, mnemonic) = manager.create_wallet("Primary Vault Account", "")?;
println!("Account ID: {}", account.id);
println!("Unified Address: {}", account.unified_address);
println!("Seed Fingerprint: {}", account.seed_fingerprint);
```

### Unified Address Generation & Parsing

```rust
use sentinel_zcash::crypto::address::validate_and_parse_address;

let network = Network::TestNetwork;
let ua_str = "utest1...";

// Validate that address belongs to target network and carries an Orchard receiver
let validated = validate_and_parse_address(&network, ua_str)?;
assert!(validated.has_orchard);
println!("Orchard Raw Receiver: {:?}", validated.orchard_receiver_hex);
```

### Balance Breakdown

```rust
let balance = manager.get_balance()?;
println!("Total Balance: {} zats ({} ZEC)", balance.total_zats, balance.total_zec);
println!("Confirmed Spendable: {} zats ({} ZEC)", balance.spendable_zats, balance.spendable_zec);
println!("Unconfirmed: {} zats", balance.unconfirmed_zats);
```

### ZIP-317 Fee Calculation

```rust
// actions = max(spends, outputs)
// fee = max(grace_actions = 2, actions) * 5,000 zats
let fee = WalletManager::calculate_zip317_fee(1, 2);
assert_eq!(fee, 10_000); // 0.0001 ZEC base fee
```

### Transaction Proposal & PCZT

```rust
let proposal = manager.propose_settlement(
    "SNZ-2026-00421",
    1, // Milestone index
    "utest1recipient...",
    200_000_000, // 2.0 ZEC in zats
    "idempotency_key_unique_001",
)?;

println!("Proposal ID: {}", proposal.proposal_id);
println!("ZIP-317 Fee: {} zats", proposal.fee_zats);
println!("PCZT Hex: {}", proposal.pczt_hex);
```

### RedPallas Authorization & Network Broadcast

```rust
// Sign proposal using isolated RedPallas spending key
let signed = manager.authorize_and_sign(&proposal.proposal_id, "authorized_payer")?;
println!("TxID: {}", signed.txid);
println!("RedPallas Sig: {}", signed.authorization_signature_hex);

// Broadcast raw V5 transaction
let broadcast_tx = manager.broadcast_transaction(
    &proposal.proposal_id,
    &signed.txid,
    &signed.raw_tx_hex,
)?;
println!("Broadcast status: {}", broadcast_tx.status);
```

---

## 3. TypeScript Client SDK (`lib/zcash/adapter.ts`)

The Next.js backend and client components consume the wallet capabilities through the `LiveZcashSignerAdapter`:

```typescript
import { getZcashAdapter } from "@/lib/zcash/adapter";

const adapter = getZcashAdapter();

// Retrieve vault address
const addressInfo = await adapter.getAddress!();
console.log("Vault UA:", addressInfo.unifiedAddress);

// Retrieve balance breakdown
const balance = await adapter.getBalance!();
console.log("Spendable ZEC:", balance.spendableZec);

// Propose settlement
const proposal = await adapter.proposeSettlement!(
  "SNZ-2026-00421",
  1,
  "utest1recipient...",
  200_000_000,
  `idemp_${Date.now()}`
);

// Sign with RedPallas
const signed = await adapter.authorizeAndSign!(proposal.proposalId, "CE");

// Broadcast on-chain
const txStatus = await adapter.broadcast!(proposal.proposalId, signed.txid, signed.rawTxHex);
console.log("Confirmed TxID:", txStatus.txid);
```

---

## 4. Error Handling Matrix

| Error Scenario | HTTP Code | Error Code / Message | Remediation |
|---|---|---|---|
| Invalid Unified Address | `400 Bad Request` | `Expected a Zcash testnet address (e.g. utest1...)` | Verify address prefix and checksum |
| Missing Orchard Receiver | `400 Bad Request` | `Unified Address does not contain an Orchard receiver` | Ensure address was generated with Orchard capability |
| Insufficient Funds | `400 Bad Request` | `Insufficient spendable funds. Needed X zats, but confirmed is Y` | Fund vault and wait for 3 confirmations |
| Missing Authorization | `401 Unauthorized` | `Missing or invalid Bearer token` | Provide `ZCASH_SIGNER_AUTH_TOKEN` header |
| Duplicate Settlement | `400 Bad Request` | `Milestone #X is already settled (txid: ...)` | Milestone has already been paid; duplicate blocked |
| Duplicate Proposal | `200 OK` (Idempotent) | Returns identical previous proposal | Safe replay defense |

