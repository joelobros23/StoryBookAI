import { Account, Client, Databases, ID } from "appwrite";

// It's best practice to use environment variables for sensitive data.
// Make sure you have these in a .env file and have configured expo to use them.
const appwriteEndpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const appwriteProjectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;

// These are the IDs from your Appwrite console
export const databaseId = 'stories';
export const storiesCollectionId = 'stories';


if (!appwriteEndpoint || !appwriteProjectId) {
  throw new Error("Appwrite endpoint or project ID is not set in environment variables.");
}

const client = new Client()
  .setEndpoint(appwriteEndpoint)
  .setProject(appwriteProjectId);

const account = new Account(client);
const databases = new Databases(client);

export { account, client, databases, ID };

