import { Account, Client, Databases, ID, Storage } from "appwrite";
import * as FileSystem from 'expo-file-system';

// It's best practice to use environment variables for sensitive data.
// Make sure you have these in a .env file and have configured expo to use them.
const appwriteEndpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const appwriteProjectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;

// These are the IDs from your Appwrite console
export const databaseId = 'stories';
export const storiesCollectionId = 'stories';
export const storyImagesBucketId = 'story_images';


if (!appwriteEndpoint || !appwriteProjectId) {
  throw new Error("Appwrite endpoint or project ID is not set in environment variables.");
}

const client = new Client()
  .setEndpoint(appwriteEndpoint)
  .setProject(appwriteProjectId);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

export { account, client, databases, ID, storage };

// Function to upload a base64 encoded image to Appwrite Storage
export const uploadImageFile = async (base64: string, fileName: string): Promise<string> => {
    const tempFilePath = FileSystem.cacheDirectory + fileName;
    try {
        await FileSystem.writeAsStringAsync(tempFilePath, base64, {
            encoding: FileSystem.EncodingType.Base64,
        });
        const formData = new FormData();
        const fileId = ID.unique();
        formData.append('fileId', fileId);
        formData.append('file', {
            uri: tempFilePath,
            name: fileName,
            type: 'image/png',
        } as any);
        const response = await fetch(`${appwriteEndpoint}/storage/buckets/${storyImagesBucketId}/files`, {
            method: 'POST',
            headers: {
                'X-Appwrite-Project': appwriteProjectId,
                'Content-Type': 'multipart/form-data',
            },
            body: formData,
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'File upload failed');
        }
        return result.$id;
    } catch (error) {
        console.error("Appwrite file upload failed:", error);
        throw new Error("Failed to upload image to storage.");
    } finally {
        await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
    }
};

// NEW: Function to delete an image file from Appwrite Storage
export const deleteImageFile = async (fileId: string): Promise<void> => {
    try {
        await storage.deleteFile(storyImagesBucketId, fileId);
        console.log(`Image with ID ${fileId} deleted successfully.`);
    } catch (error) {
        console.error(`Failed to delete image with ID ${fileId}:`, error);
        // We don't re-throw the error to allow the story deletion to proceed even if image deletion fails.
        // You could add more robust error handling here if needed.
    }
};


// Function to get a public URL for an image file
export const getImageUrl = (fileId: string): string => {
    const url = storage.getFileView(storyImagesBucketId, fileId);
    return url.toString();
};
