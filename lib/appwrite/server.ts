import { Account, Client, TablesDB } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

function baseClient() {
  if (!endpoint || !projectId) {
    throw new Error("Appwrite endpoint and project ID are not configured.");
  }

  return new Client().setEndpoint(endpoint).setProject(projectId);
}

/**
 * Verify an end-user JWT with Appwrite. Never trust a user ID supplied by
 * the browser; the authenticated account ID is the source of identity.
 */
export async function getAuthenticatedAppwriteUser(jwt: string) {
  if (!jwt || jwt.length > 8192) {
    throw new Error("A valid Appwrite session JWT is required.");
  }

  const client = baseClient().setJWT(jwt);
  const account = new Account(client);
  return account.get();
}

/**
 * Privileged database access is server-only. The API key must never use a
 * NEXT_PUBLIC_ variable and must never be imported into client components.
 * Route handlers must verify the user's JWT and enforce row ownership before
 * returning or mutating records.
 */
export function getAppwriteAdminServices() {
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const tableId = process.env.APPWRITE_ESCROWS_TABLE_ID;

  if (!apiKey) throw new Error("APPWRITE_API_KEY is not configured.");
  if (!databaseId || !tableId) {
    throw new Error("Appwrite database/table configuration is incomplete.");
  }

  const client = baseClient().setKey(apiKey);
  return {
    tablesDB: new TablesDB(client),
    databaseId,
    tableId
  };
}
