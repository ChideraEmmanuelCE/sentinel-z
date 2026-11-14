# Sentinel-Z Appwrite setup

## Vercel environment variables

Public project configuration:
- NEXT_PUBLIC_APPWRITE_ENDPOINT
- NEXT_PUBLIC_APPWRITE_PROJECT_ID

Server-only configuration:
- APPWRITE_DATABASE_ID
- APPWRITE_ESCROWS_TABLE_ID
- APPWRITE_API_KEY

Never prefix the API key with NEXT_PUBLIC_. Store it as an encrypted Vercel environment variable.

Create an Appwrite server API key with the minimum required scopes:
- rows.read
- rows.write

Do not grant database, table, or column administration scopes to the runtime key.

## Escrows table schema

The `escrows` table must contain:
- payerUserId: string, required
- payeeUserId: string, required
- title: string, required
- description: text/string, required
- amountZatoshi: bigint, required
- status: string, required

Use a Bigint for amountZatoshi. Store integer zatoshi (1 ZEC = 100,000,000 zatoshi), never floating-point ZEC.

Recommended indexes:
- payer_lookup on payerUserId
- payee_lookup on payeeUserId
- status_lookup on status

## API authentication

The API accepts an Appwrite session JWT in the Authorization header:
`Authorization: Bearer <Appwrite JWT>`

The server verifies that JWT with Appwrite Account.get() before reading or writing records. It derives payerUserId from the verified account, never from browser input. The server-side API key is used only for the database operation and must remain private.

## Current API

- GET /api/escrows: list records where the authenticated user is payer or payee.
- POST /api/escrows: create a draft escrow. The authenticated account becomes payer.

These routes are backend primitives. The dashboard still needs its sign-in/session UI wired to obtain an Appwrite JWT and call these routes before demo state can be removed.
