# Contributing to Sentinel-Z

## Branch model

- `main` is the protected production branch.
- `dev` is the integration branch.
- Create focused branches from `dev`: `feat/<topic>`, `fix/<topic>`, or `docs/<topic>`.
- Open pull requests into `dev`; promote reviewed, tested releases from `dev` to `main`.

## Quality gates

Before requesting review:

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

Keep TypeScript strict. Do not add `any` unless there is a documented reason. Add tests for security-sensitive state transitions and API behavior as the test suite is introduced.

## Privacy and security review

- Never commit credentials, wallet seeds, private keys, viewing keys, or real user data.
- Keep Appwrite API keys and signer credentials server-only.
- Treat AI output and submitted evidence as untrusted.
- AI assessment must never directly authorize or sign a payment.
- Do not describe simulated receipts as Zcash transactions.
- Do not claim cryptographic verification unless a real supported verifier is wired in and tested.

## Pull request process

1. Explain the user-facing change and security impact.
2. Link related issues.
3. Include screenshots for UI changes.
4. Confirm typecheck, lint, and production build.
5. Request review from the relevant code owner.
6. Merge only after review and passing CI.
