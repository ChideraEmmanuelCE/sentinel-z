# Sentinel-Z: Zcash Testnet Deployment & Execution Guide

This guide provides step-by-step, reproducible instructions for running Sentinel-Z on the official Zcash testnet.

---

## 1. Prerequisites & Environment Setup

### Required Tools
- Node.js 20 or newer
- Rust 1.88 or newer (`cargo`, `rustc`)
- SQLite 3

### Environment Configuration
Copy `.env.example` to `.env.local` and configure testnet parameters:

```bash
# Network Mode: testnet | mainnet | demo
ZCASH_NETWORK_MODE=testnet

# Rust Signer Microservice URL
ZCASH_SIGNER_URL=http://127.0.0.1:8232
ZCASH_SIGNER_AUTH_TOKEN=sentinel_testnet_secret_key_88319

# Lightwalletd Testnet Endpoint
ZCASH_LIGHTWALLETD_URL=https://testnet.lightwalletd.com:9067
```

---

## 2. Launching the Services

### Terminal 1: Start the Rust Signer Daemon
```bash
# From repository root
cargo run --bin sentinel-zcash
```
Output:
```
INFO Initializing Sentinel-Z Zcash Signer Daemon on network: testnet
INFO Primary wallet loaded. UA: utest1... (Fingerprint: a9f8c02b)
INFO Sentinel-Z Zcash Signer Daemon listening on http://127.0.0.1:8232
```

### Terminal 2: Start the Next.js Frontend & API
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 3. Step-by-Step Testnet Escrow Demonstration

### Scenario Specifications:
- **Total Escrow Commitment**: 10.0 ZEC (1,000,000,000 zatoshi).
- **Milestone 1**: 2.0 ZEC (200,000,000 zatoshi) - Wallet SDK & Key Derivation.
- **Milestone 2**: 3.0 ZEC (300,000,000 zatoshi) - PCZT Construction & Signing.
- **Milestone 3**: 5.0 ZEC (500,000,000 zatoshi) - Network Broadcast & Confirmation.

---

### Step 1: Generate & Inspect Unified Address
1. In the Sentinel-Z Command Center, navigate to the **Overview** tab.
2. Note the generated Orchard Unified Address starting with `utest1...`.
3. Verify that the address contains an Orchard receiver using the CLI or API:
```bash
curl -X GET http://localhost:3000/api/wallet/address
```

### Step 2: Fund the Escrow Vault with 10 Testnet ZEC
1. Click **Fund Escrow** in the top navigation.
2. Confirm the 10.0 ZEC deposit (1,000,000,000 zats).
3. The vault records the incoming notes and verifies 3 on-chain confirmations:
```bash
curl -X POST http://localhost:3000/api/escrow/SNZ-2026-00421/deposit \
  -H "Content-Type: application/json" \
  -d '{"amountZats": 1000000000}'
```
4. Observe the balance update:
   - **Total in Escrow**: `10.0 ZEC`
   - **Available to Settle**: `10.0 ZEC`
   - **Vault Status**: `Locked (Orchard Pool)`

### Step 3: Submit Delivery Evidence for Milestone #1
1. Under **Milestones**, locate Milestone #1.
2. Click **Submit Evidence**.
3. Enter delivery description:
   `"Completed ZIP-32 Orchard key derivation, Unified Address generation, and unit test suite."`
4. Attach repository URL: `https://github.com/ChideraEmmanuelCE/sentinel-z/commit/91f3f7c`
5. Click **Submit Evidence**. Milestone status becomes `SUBMITTED`.

### Step 4: Run Advisory AI Oracle Assessment
1. Click **Advisory AI Review** on the 3D Vault panel.
2. The AI Oracle inspects the submission against contractual parameters.
3. Verdict returned: `PASS (98% confidence)`.
4. Note that funds remain safely locked—the AI Oracle cannot release funds.

### Step 5: Approve Milestone #1
1. Click **Approve Milestone**.
2. Payer identity is attached, and status transitions to `APPROVED`.

### Step 6: Construct, Authorize, and Broadcast Settlement
1. Click **Settle On-Chain (RedPallas)**.
2. A settlement modal appears showing the PCZT proposal parameters:
   - Recipient: `utest1...`
   - Release: `2.0 ZEC` (200,000,000 zats)
   - ZIP-317 Marginal Fee: `0.0001 ZEC` (10,000 zats)
   - Total Deduction: `2.0001 ZEC`
3. Click **Authorize & Broadcast 2.0 ZEC**.
4. The Rust signer:
   - Verifies the proposal.
   - Computes the Orchard sighash.
   - Signs using the RedPallas spend authorizing key.
   - Broadcasts the serialized V5 transaction to the Zcash network.
5. Milestone status transitions to `SETTLED`.
6. The interactive 3D Vault transitions to `RELEASED` mode.
7. A transaction receipt is displayed containing the live TxID, 64-byte RedPallas signature, and confirmation counter (3/3 Confirmed).

---

## 4. Testnet Faucets & Block Explorers

- **Official Zcash Testnet Faucet**: https://faucet.zecpages.com/ or https://testnet.zcash.org
- **Zcash Testnet Block Explorer**: https://testnet.zcashblockexplorer.com
- **Lightwalletd Testnet Server**: `testnet.lightwalletd.com:9067`

