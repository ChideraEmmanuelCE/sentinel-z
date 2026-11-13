import { Client, Account, Databases } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

export function createAppwriteClient(): Client {
  if (!endpoint || !projectId) {
    throw new Error("Appwrite endpoint and project ID are not configured.");
  }
  return new Client().setEndpoint(endpoint).setProject(projectId);
}

export function getAppwriteBrowserServices() {
  const client = createAppwriteClient();
  return { client, account: new Account(client), databases: new Databases(client) };
}
