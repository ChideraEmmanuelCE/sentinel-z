# Production Readiness Gates

Last reviewed: 2026-11-14

This file is an implementation gate, not a claim that the items below are complete.

## Verified in the repository

- [x] Next.js application and 3D vault interface are present.
- [x] Escrow status transition rules are present as domain logic.
- [x] Milestone request and AI response schemas are validated with Zod.
- [x] AI assessment is advisory and cannot trigger a payment.
- [x] Demo Zcash adapter labels receipts as simulated and refuses real-network mode without a signer.
- [x] Vercel has produced a successful preview deployment from the `dev` branch.

## Implemented in this branch

- [x] Optional server-side OpenAI Chat Completions integration for milestone assessment.
- [x] Strict structured-output schema validation and exact criterion matching.
- [x] Fail-closed human-review fallback when the API key is absent, the provider fails, or output is invalid.
- [x] Config documentation for `AI_ORACLE_API_KEY` and `AI_ORACLE_MODEL`.

## Required before a real pilot

### 1. Appwrite persistence and identity

- [ ] Supply and configure the Appwrite endpoint, project ID, database ID, escrow collection ID, and server API key in Vercel.
- [ ] Define and deploy collections, indexes, permissions, and migration/versioning rules.
- [ ] Implement server-verified user sessions and role/ownership checks on every escrow read and write.
- [ ] Persist agreements, milestones, evidence metadata, reviews, disputes, and immutable audit events.
- [ ] Add idempotency, concurrency control, retention/deletion rules, backups, and restore testing.
- [ ] Verify that browser clients cannot access another user's escrow or privileged fields.

### 2. AI evidence review

- [ ] Add `AI_ORACLE_API_KEY` and `AI_ORACLE_MODEL` as Vercel server-side environment variables.
- [ ] Review the evidence data-processing disclosure and obtain user consent before sending evidence to OpenAI.
- [ ] Add authentication, abuse controls, rate limits, request budgets, and monitoring to the assessment endpoint.
- [ ] Add adversarial prompt-injection tests, provider outage tests, and human-review workflows.
- [ ] Keep all AI decisions advisory; only a separately authenticated human authorization flow may advance escrow state.

### 3. Zcash testnet settlement

- [ ] Select and provision a supported Zcash wallet/signer implementation and a testnet lightwalletd service.
- [ ] Build the signer as a separately deployed, isolated service; do not place spending keys or seeds in Next.js, Appwrite, browser storage, logs, or AI prompts.
- [ ] Implement deposit address lifecycle, transaction discovery, confirmation/finality policy, reorg handling, fee policy, and reconciliation.
- [ ] Implement independently authenticated release authorization, replay protection, idempotency, and a complete transaction audit trail.
- [ ] Run end-to-end tests on Zcash testnet with test funds and verify receipts against the network.
- [ ] Have the key-management and settlement design independently reviewed before handling real funds.

### 4. Production and security

- [ ] Run CI typecheck, lint, production build, and end-to-end tests on the proposed merge commit.
- [ ] Add server-side rate limiting, CSRF/origin protections appropriate to each authenticated mutation, secure headers, and observability.
- [ ] Complete dependency, application, API, privacy, and threat-model reviews.
- [ ] Test backup restoration, incident response, signer outage, stuck transactions, disputes, and refunds/recovery.
- [ ] Complete an independent security audit and legal/compliance review before mainnet or customer funds.

## Current release decision

**Not production-ready.** The current application remains a prototype. The Zcash adapter is demo-only, Appwrite configuration is not evidence of deployed persistence, and a configured AI API is not evidence of reliable evidence verification. Do not represent demo receipts as on-chain transactions or accept customer funds until every relevant gate is implemented, tested, and reviewed.
