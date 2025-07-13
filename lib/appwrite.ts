import { Account, Client } from "appwrite";

// It's best practice to use environment variables for sensitive data.
// Make sure you have these in a .env file and have configured expo to use them.
const appwriteEndpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const appwriteProjectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;

if (!appwriteEndpoint || !appwriteProjectId) {
  throw new Error("Appwrite endpoint or project ID is not set in environment variables.");
}

const client = new Client()
  .setEndpoint(appwriteEndpoint)
  .setProject(appwriteProjectId);

const account = new Account(client);

export { account, client };

