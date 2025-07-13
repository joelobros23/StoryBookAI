import AsyncStorage from '@react-native-async-storage/async-storage';
import { Models } from 'appwrite';
import { Alert } from 'react-native';

// NOTE: You may need to install this package if you haven't already:
// npm install @react-native-async-storage/async-storage

const HISTORY_KEY = 'story_history';

// Define a type for the story documents for type safety
type Story = Models.Document & {
    title: string;
    description: string;
};

/**
 * Retrieves the list of stories from local history.
 * @returns An array of story documents.
 */
export const getStoryHistory = async (): Promise<Story[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(HISTORY_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error("Failed to load story history.", e);
        Alert.alert("Error", "Could not load your story history.");
        return [];
    }
};

/**
 * Adds a new story to the local history.
 * It avoids adding duplicate stories.
 * @param newStory - The story document to add.
 */
export const addStoryToHistory = async (newStory: Story) => {
    try {
        const existingHistory = await getStoryHistory();
        // Prevent duplicates
        const isAlreadyInHistory = existingHistory.some(story => story.$id === newStory.$id);
        
        if (!isAlreadyInHistory) {
            const updatedHistory = [newStory, ...existingHistory];
            const jsonValue = JSON.stringify(updatedHistory);
            await AsyncStorage.setItem(HISTORY_KEY, jsonValue);
        }
    } catch (e) {
        console.error("Failed to save story to history.", e);
        Alert.alert("Error", "Could not save this story to your history.");
    }
};
