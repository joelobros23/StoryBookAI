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

// Note for developer: Ensure you have 'expo-file-system' installed in your project.
// You can install it by running: npx expo install expo-file-system
export { account, client, databases, ID, storage };

// Function to upload a base64 encoded image to Appwrite Storage
export const uploadImageFile = async (base64: string, fileName: string): Promise<string> => {
    // Define a temporary path for the image file in the app's cache directory.
    const tempFilePath = FileSystem.cacheDirectory + fileName;

    try {
        // 1. Write the base64 image data to the temporary file.
        await FileSystem.writeAsStringAsync(tempFilePath, base64, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // 2. Prepare the payload using FormData for a multipart/form-data request.
        const formData = new FormData();
        const fileId = ID.unique();
        
        formData.append('fileId', fileId);
        formData.append('file', {
            uri: tempFilePath,
            name: fileName,
            type: 'image/png',
        } as any);

        // 3. Manually perform the fetch request to the Appwrite storage endpoint.
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
        // 4. Clean up by deleting the temporary file after the upload attempt.
        await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
    }
};

// Function to get a public URL for an image file
export const getImageUrl = (fileId: string): string => {
    // FIX: Use storage.getFileView to get a publicly accessible URL for the image.
    // The getFilePreview method returns a URL that requires authentication, causing the image to fail to load.
    // getFileView provides a direct, public link suitable for the <Image> component.
    const url = storage.getFileView(storyImagesBucketId, fileId);
    return url.toString();
};
