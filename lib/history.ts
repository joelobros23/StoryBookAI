import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { PlayerData, StoryDocument, StoryEntry, StorySession } from '../app/types/story';
// FIX: Import the new download function
import { downloadAndSaveImage, ID } from './appwrite';

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
export const createNewSession = async (story: StoryDocument & { cover_image_id?: string }): Promise<StorySession> => {
    const history = await getStoryHistory();
    
    // FIX: Download the cover image if it exists
    let localCoverImagePath: string | null = null;
    if (story.cover_image_id) {
        localCoverImagePath = await downloadAndSaveImage(story.cover_image_id);
    }

    const newSession: StorySession = {
        story: story,
        content: [],
        sessionId: ID.unique(),
        sessionDate: new Date().toISOString(),
        playerData: {},
        // FIX: Add the local image path to the session object
        localCoverImagePath: localCoverImagePath || undefined,
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
        
        // FIX: Find the session to delete to check for a local image
        const sessionToDelete = history.find(session => session.sessionId === sessionId);
        if (sessionToDelete && sessionToDelete.localCoverImagePath) {
            // Delete the local image file to clean up storage
            await FileSystem.deleteAsync(sessionToDelete.localCoverImagePath, { idempotent: true });
            console.log(`Local image ${sessionToDelete.localCoverImagePath} deleted.`);
        }

        const updatedHistory = history.filter(session => session.sessionId !== sessionId);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
        console.log(`Session with ID ${sessionId} deleted.`);
    } catch (e) {
        console.error("Failed to delete story session.", e);
    }
};
