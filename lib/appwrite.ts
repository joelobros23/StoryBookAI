import { Account, Client, Databases, ID, Storage } from "appwrite";

// It's best practice to use environment variables for sensitive data.
// Make sure you have these in a .env file and have configured expo to use them.
const appwriteEndpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const appwriteProjectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;

// These are the IDs from your Appwrite console
export const databaseId = 'stories';
export const storiesCollectionId = 'stories';
// NEW: Bucket ID for story cover images
export const storyImagesBucketId = 'story_images';


if (!appwriteEndpoint || !appwriteProjectId) {
  throw new Error("Appwrite endpoint or project ID is not set in environment variables.");
}

const client = new Client()
  .setEndpoint(appwriteEndpoint)
  .setProject(appwriteProjectId);

const account = new Account(client);
const databases = new Databases(client);
// NEW: Initialize Appwrite Storage
const storage = new Storage(client);

export { account, client, databases, ID, storage };

// NEW: Function to upload a base64 encoded image to Appwrite Storage
export const uploadImageFile = async (base64: string, fileName: string): Promise<string> => {
    try {
        // In React Native, we can use fetch to convert a data URI to a blob
        const response = await fetch(`data:image/png;base64,${base64}`);
        const blob = await response.blob();

        // The Appwrite Web SDK's createFile method can accept a File object, which we can create from a blob
        const fileToUpload = new File([blob], fileName, { type: 'image/png' });

        const result = await storage.createFile(
            storyImagesBucketId,
            ID.unique(),
            fileToUpload
        );
        return result.$id;
    } catch (error) {
        console.error("Appwrite file upload failed:", error);
        throw new Error("Failed to upload image to storage.");
    }
};

// NEW: Function to get a public URL for an image file
// FIX: The getFilePreview method in your environment returns a string directly.
// This removes the incorrect .href property access.
export const getImageUrl = (fileId: string): string => {
    return storage.getFilePreview(storyImagesBucketId, fileId);
};
