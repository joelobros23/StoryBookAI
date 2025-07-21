import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerData, StoryDocument, StoryEntry, StorySession } from '../app/types/story';
import { ID } from './appwrite';

const HISTORY_KEY = 'story_history';

/**
 * Retrieves the list of all story sessions from local history.
 */
export const getStoryHistory = async (): Promise<StorySession[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(HISTORY_KEY);
        if (jsonValue != null) {
            const parsed = JSON.parse(jsonValue);
            return Array.isArray(parsed) ? parsed.filter(item => item && item.story && item.story.$id && item.sessionId) : [];
        }
        return [];
    } catch (e) {
        console.error("Failed to load story history.", e);
        return [];
    }
};

/**
 * Retrieves a single story session by its unique session ID.
 */
export const getStorySession = async (sessionId: string): Promise<StorySession | null> => {
    try {
        const history = await getStoryHistory();
        const session = history.find(s => s.sessionId === sessionId);
        return session || null;
    } catch (e) {
        console.error("Failed to get story session.", e);
        return null;
    }
};

// Add this function to history.ts
export const updateStoryInSession = async (sessionId: string, updatedStory: StoryDocument) => {
  try {
    const history = await getStoryHistory();
    const sessionIndex = history.findIndex(s => s.sessionId === sessionId);

    if (sessionIndex !== -1) {
      history[sessionIndex].story = updatedStory;
      history[sessionIndex].sessionDate = new Date().toISOString();
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      return true;
    }
    return false;
  } catch (e) {
    console.error("Failed to update story in session:", e);
    return false;
  }
};

/**
 * Creates a new, unique session for a story and saves it.
 * @param story - The base story document.
 * @returns The newly created session.
 */
export const createNewSession = async (story: StoryDocument): Promise<StorySession> => {
    const history = await getStoryHistory();
    const newSession: StorySession = {
        story: story,
        content: [],
        sessionId: ID.unique(),
        sessionDate: new Date().toISOString(),
        playerData: {}, // Initialize with empty object
    };
    const updatedHistory = [newSession, ...history];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    return newSession;
};

/**
 * Saves the current chat content for a specific story session.
 */
export const saveStorySessionContent = async (sessionId: string, content: StoryEntry[]) => {
    try {
        const history = await getStoryHistory();
        const sessionIndex = history.findIndex(s => s.sessionId === sessionId);

        if (sessionIndex !== -1) {
            history[sessionIndex].content = content.map(({isNew, ...rest}) => rest);
            history[sessionIndex].sessionDate = new Date().toISOString();
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        }
    } catch (e) {
        console.error("Failed to save session content.", e);
    }
};

/**
 * Saves player data for a specific story session.
 */
export const saveSessionPlayerData = async (sessionId: string, playerData: PlayerData) => {
    try {
        const history = await getStoryHistory();
        const sessionIndex = history.findIndex(s => s.sessionId === sessionId);

        if (sessionIndex !== -1) {
            history[sessionIndex].playerData = playerData;
            history[sessionIndex].sessionDate = new Date().toISOString(); // Also update timestamp
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        }
    } catch (e) {
        console.error("Failed to save session player data.", e);
    }
};

/**
 * Deletes a story session from local history.
 * @param sessionId - The ID of the session to delete.
 */
export const deleteStorySession = async (sessionId: string) => {
    try {
        const history = await getStoryHistory();
        const updatedHistory = history.filter(session => session.sessionId !== sessionId);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
        console.log(`Session with ID ${sessionId} deleted.`);
    } catch (e) {
        console.error("Failed to delete story session.", e);
    }
};
