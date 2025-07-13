import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { StoryDocument, StoryEntry, StorySession } from '../app/types/story';

const HISTORY_KEY = 'story_history';

/**
 * Retrieves the list of all story sessions from local history.
 * This is now more robust and filters out any malformed entries.
 * @returns An array of story sessions.
 */
export const getStoryHistory = async (): Promise<StorySession[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(HISTORY_KEY);
        if (jsonValue != null) {
            const parsed = JSON.parse(jsonValue);
            // Filter out any entries that are not valid sessions
            return Array.isArray(parsed) ? parsed.filter(item => item && item.story && item.story.$id) : [];
        }
        return [];
    } catch (e) {
        console.error("Failed to load story history.", e);
        Alert.alert("Error", "Could not load your story history.");
        return [];
    }
};

/**
 * Retrieves a single story session, including its chat content.
 * @param storyId The ID of the story to retrieve.
 * @returns A story session object or null if not found.
 */
export const getStorySession = async (storyId: string): Promise<StorySession | null> => {
    try {
        const history = await getStoryHistory();
        const session = history.find(s => s.story.$id === storyId);
        return session || null;
    } catch (e) {
        console.error("Failed to get story session.", e);
        return null;
    }
};


/**
 * Adds a new story to the local history.
 * It avoids adding duplicate stories.
 * @param newStory - The story document to add.
 */
export const addStoryToHistory = async (newStory: StoryDocument) => {
    try {
        const existingHistory = await getStoryHistory();
        const isAlreadyInHistory = existingHistory.some(session => session.story.$id === newStory.$id);
        
        if (!isAlreadyInHistory) {
            const newSession: StorySession = {
                story: newStory,
                content: [], // Start with empty chat history
            };
            const updatedHistory = [newSession, ...existingHistory];
            const jsonValue = JSON.stringify(updatedHistory);
            await AsyncStorage.setItem(HISTORY_KEY, jsonValue);
        }
    } catch (e) {
        console.error("Failed to save story to history.", e);
        Alert.alert("Error", "Could not save this story to your history.");
    }
};

/**
 * Saves the current chat content for a specific story session.
 * @param storyId The ID of the story being played.
 * @param content The array of story entries (the chat).
 */
export const saveStorySessionContent = async (storyId: string, content: StoryEntry[]) => {
    try {
        const history = await getStoryHistory();
        const sessionIndex = history.findIndex(s => s.story.$id === storyId);

        if (sessionIndex !== -1) {
            // Update the content of the specific session
            // Make sure not to save the 'isNew' flag
            history[sessionIndex].content = content.map(({isNew, ...rest}) => rest);
            const jsonValue = JSON.stringify(history);
            await AsyncStorage.setItem(HISTORY_KEY, jsonValue);
        }
    } catch (e) {
        console.error("Failed to save session content.", e);
    }
};
