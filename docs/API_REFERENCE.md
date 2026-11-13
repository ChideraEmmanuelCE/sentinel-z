# Sentinel-Z: REST API Reference

This specification covers both the application REST API (Next.js server) and the isolated Rust signer daemon microservice.

---

## 1. Application Backend API (Next.js)

Base URL: `http://localhost:3000/api`

### Wallet Endpoints

#### `GET /api/wallet/address`
Retrieves the vault's Orchard Unified Address.
- **Response `200 OK`**:
```json
{
  "success": true,
  "accountId": "acc_3a8f9c2d1b",
  "name": "Sentinel Primary Vault",
  "unifiedAddress": "utest1sentinelprimaryvault9999999999999999999999999999999999999999999999999999999999999",
  "network": "testnet"
}
```

#### `GET /api/wallet/balance`
Retrieves the vault balance breakdown.
- **Response `200 OK`**:
```json
{
  "success": true,
  "network": "testnet",
  "totalZats": 1000000000,
  "confirmedZats": 1000000000,
  "unconfirmedZats": 0,
  "spendableZats": 1000000000,
  "totalZec": 10.0,
  "spendableZec": 10.0
}
```

#### `POST /api/wallet/sync`
Triggers synchronization against Zcash testnet lightwalletd.
- **Response `200 OK`**:
```json
{
  "success": true,
  "status": "synced",
  "network": "testnet",
  "latestBlockHeight": 2854120,
  "syncedAt": "2026-11-13T20:30:00Z"
}
```

---

### Escrow Endpoints

#### `POST /api/escrow/create`
Initializes a new milestone escrow agreement.
- **Request Body**:
```json
{
  "title": "Core Protocol Implementation",
  "payerAddress": "Buyer Organization",
  "recipientUnifiedAddress": "utest1recipient...",
  "milestones": [
    { "title": "Milestone 1", "amountZec": 2.0 },
    { "title": "Milestone 2", "amountZec": 3.0 },
    { "title": "Milestone 3", "amountZec": 5.0 }
  ]
}
```

#### `POST /api/escrow/:id/deposit`
Records/credits a shielded deposit to the escrow.
- **Request Body**:
```json
{
  "amountZats": 1000000000
}
```

#### `POST /api/escrow/:id/milestones/:index/submit`
Submits milestone evidence for review.
- **Request Body**:
```json
{
  "description": "Completed ZIP-32 derivation and RedPallas test suite",
  "sourceUrl": "https://github.com/..."
}
```

#### `POST /api/escrow/:id/milestones/:index/approve`
Payer approval of submitted milestone.
- **Request Body**:
```json
{
  "approvedBy": "CE (Workspace Admin)"
}
```

#### `POST /api/escrow/:id/milestones/:index/settle`
Executes on-chain settlement: proposes, signs with RedPallas, and broadcasts transaction.
- **Request Body**:
```json
{
  "authorizedBy": "CE (Workspace Admin)"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Milestone #1 settlement successfully broadcast and confirmed!",
  "settlement": {
    "proposalId": "prop_8f3a9e21",
    "txid": "7b84f3e9a02d8471b058a94628f8473919e8371a62947190f847291a038f7491",
    "network": "testnet",
    "amountZats": 200000000,
    "amountZec": 2.0,
    "feeZats": 10000,
    "confirmations": 3,
    "settledAt": "2026-11-13T20:35:10Z"
  }
}
```

---

## 2. Rust Signer Microservice API (`sentinel-zcash`)

Base URL: `http://127.0.0.1:8232`
Headers: `Authorization: Bearer <ZCASH_SIGNER_AUTH_TOKEN>`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Daemon status and network mode |
| `POST` | `/wallet/create` | Derive new ZIP-32 Orchard account |
| `GET` | `/wallet/address` | Get Orchard Unified Address |
| `GET` | `/wallet/balance` | Query confirmed vs spendable balance |
| `GET` | `/wallet/history` | Query transaction audit history |
| `POST` | `/tx/propose` | Construct ZIP-370 PCZT proposal & ZIP-317 fee |
| `POST` | `/tx/authorize-and-sign` | Authorize and sign sighash using RedPallas |
| `POST` | `/tx/broadcast` | Broadcast raw V5 transaction to network |
| `GET` | `/tx/status/:txid` | Query transaction confirmations |
| `POST` | `/escrow/deposit/simulate` | Credit testnet deposit |

