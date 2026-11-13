# Sentinel-Z

**Privacy-preserving AI-assisted escrow for milestone-based work.**

Sentinel-Z is a hackathon prototype exploring a shielded escrow workflow built around Zcash privacy primitives, independently reviewable milestone evidence, and an AI-assisted verification oracle.

## Current implementation status

This repository is being built in clearly separated stages:

- **Demo mode:** deterministic local escrow state and visibly simulated receipts. No real Zcash funds move.
- **Zcash integration boundary:** a server-only adapter contract for a future wallet/signer integration. Unified Addresses, viewing keys, and transaction signing are distinct concepts.
- **AI verification:** structured milestone assessment is advisory. It cannot sign transactions or release funds by itself.
- **Escrow authorization:** a separate, authenticated state transition is required before any configured signer can be called.

## Stack

- Next.js App Router, React, TypeScript (strict)
- Tailwind CSS
- Three.js / React Three Fiber for the vault visualization
- Appwrite for authentication and application metadata (configured separately)
- Zcash wallet/signer adapter boundary (real network integration is not enabled by the demo)

## Local setup

1. Install Node.js 20 or newer.
2. Install dependencies: `npm install`.
3. Copy `.env.example` to `.env.local` and fill in only the values you have configured.
4. Start the development server: `npm run dev`.
5. Open `http://localhost:3000`.

Run checks before opening a pull request:

```bash
npm run typecheck
npm run lint
npm run build
```

## Environment

See [`.env.example`](.env.example). Never commit real API keys, Appwrite server keys, wallet seeds, private keys, or viewing keys.

## Privacy and security boundaries

- A Zcash Unified Address (typically `u1...`) is a payment address, **not** a viewing key.
- Viewing keys are sensitive capabilities. Never put them in browser storage, logs, analytics, or AI prompts.
- Lightwalletd uses gRPC; it is not a generic JSON REST endpoint.
- Real Orchard spends require a supported wallet implementation and secure signer. This Next.js app does not fabricate Orchard transactions.
- Demo receipts are explicitly labelled simulated and are not proof of an on-chain transaction.
- AI output is untrusted, schema-validated input to a review process—not authorization to release funds.
- URL-based evidence inspection must use strict allowlists and SSRF protections before production use.

## Architecture

- `app/`: Next.js routes and API handlers
- `components/`: interface and 3D scene
- `lib/escrow/`: escrow domain state and transition rules
- `lib/zcash/`: wallet/signer adapter contracts and demo adapter
- `lib/ai/`: structured milestone assessment
- `lib/appwrite.ts`: Appwrite client configuration

## Hackathon demo flow

1. Create a demo escrow.
2. Lock it in the local simulated state.
3. Submit milestone evidence.
4. Run the advisory AI assessment.
5. Review the result and explicitly authorize the demo release.
6. Inspect the simulated receipt and event log.

## Team workflow

- `main`: production-ready integration branch
- `dev`: integration branch
- Feature work uses `feat/<topic>` branches and pull requests into `dev`.
- Never merge unreviewed changes directly into `main`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution rules.
