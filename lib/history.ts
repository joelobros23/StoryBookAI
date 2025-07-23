import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { GenerationConfig, PlayerData, StoryDocument, StoryEntry, StorySession } from '../app/types/story';
import { downloadAndSaveImage, ID } from './appwrite';

const HISTORY_KEY = 'story_history';
const LOCAL_CREATIONS_KEY = 'local_creations';
const STORY_IMAGE_PATHS_KEY = 'story_image_paths';

// --- Story -> Image Path Map ---

export const getStoryImagePaths = async (): Promise<Record<string, string>> => {
    try {
        const jsonValue = await AsyncStorage.getItem(STORY_IMAGE_PATHS_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : {};
    } catch (e) {
        console.error("Failed to load story image paths.", e);
        return {};
    }
};

const saveStoryImagePaths = async (paths: Record<string, string>) => {
    try {
        const jsonValue = JSON.stringify(paths);
        await AsyncStorage.setItem(STORY_IMAGE_PATHS_KEY, jsonValue);
    } catch (e) {
        console.error("Failed to save story image paths.", e);
    }
};

/**
 * Associates a local image path with a story ID.
 */
export const associateImagePath = async (storyId: string, path: string) => {
    const paths = await getStoryImagePaths();
    paths[storyId] = path;
    await saveStoryImagePaths(paths);
};

export const disassociateImagePath = async (storyId: string) => {
    const paths = await getStoryImagePaths();
    delete paths[storyId];
    await saveStoryImagePaths(paths);
};


// --- Local Creations ---
export const getLocalCreations = async (): Promise<StoryDocument[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(LOCAL_CREATIONS_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error("Failed to load local creations.", e);
        return [];
    }
};

const saveLocalCreations = async (creations: StoryDocument[]) => {
    try {
        const jsonValue = JSON.stringify(creations);
        await AsyncStorage.setItem(LOCAL_CREATIONS_KEY, jsonValue);
    } catch (e) {
        console.error("Failed to save local creations.", e);
    }
};

const addLocalCreation = async (story: StoryDocument) => {
    if (!story.isLocal) return;
    const creations = await getLocalCreations();
    const exists = creations.some(c => c.$id === story.$id);
    if (!exists) {
        const { localCoverImageBase64, ...storyToSave } = story;
        const updatedCreations = [...creations, storyToSave];
        await saveLocalCreations(updatedCreations);
    }
};

export const deleteLocalCreation = async (storyId: string) => {
    let creations = await getLocalCreations();
    creations = creations.filter(c => c.$id !== storyId);
    await saveLocalCreations(creations);
};

// --- History Sessions ---

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

export const createNewSession = async (story: StoryDocument): Promise<StorySession> => {
    const history = await getStoryHistory();
    const storyToSave = { ...story };

    if (storyToSave.isLocal) {
        await addLocalCreation(storyToSave);
    }

    const imagePaths = await getStoryImagePaths();
    let localCoverImagePath: string | null = imagePaths[story.$id] || null;

    if (!localCoverImagePath) {
        let newLocalUri: string | null = null;
        if (storyToSave.localCoverImageBase64) {
            try {
                const newFileName = `${ID.unique()}.png`;
                newLocalUri = FileSystem.documentDirectory + newFileName;
                await FileSystem.writeAsStringAsync(newLocalUri, storyToSave.localCoverImageBase64, {
                    encoding: FileSystem.EncodingType.Base64,
                });
            } catch (e) {
                console.error("Failed to save local base64 image:", e);
                newLocalUri = null;
            }
        } 
        else if (storyToSave.cover_image_id) {
            newLocalUri = await downloadAndSaveImage(storyToSave.cover_image_id);
        }

        if (newLocalUri) {
            localCoverImagePath = newLocalUri;
            await associateImagePath(story.$id, newLocalUri);
        }
    }
    
    delete storyToSave.localCoverImageBase64;

    const newSession: StorySession = {
        story: storyToSave,
        content: [],
        sessionId: ID.unique(),
        sessionDate: new Date().toISOString(),
        playerData: {},
        localCoverImagePath: localCoverImagePath || undefined,
        generationConfig: { temperature: 0.8, topP: 0.9, maxOutputTokens: 200 },
        isLocal: storyToSave.isLocal,
    };
    const updatedHistory = [newSession, ...history];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    return newSession;
};

export const deleteStorySession = async (sessionId: string) => {
    try {
        const history = await getStoryHistory();
        const updatedHistory = history.filter(session => session.sessionId !== sessionId);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
        console.error("Failed to delete story session.", e);
    }
};

// --- RESTORED: Other session update functions ---

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

export const saveSessionPlayerData = async (sessionId: string, playerData: PlayerData) => {
    try {
        const history = await getStoryHistory();
        const sessionIndex = history.findIndex(s => s.sessionId === sessionId);

        if (sessionIndex !== -1) {
            history[sessionIndex].playerData = playerData;
            history[sessionIndex].sessionDate = new Date().toISOString();
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        }
    } catch (e) {
        console.error("Failed to save session player data.", e);
    }
};

export const updateSessionGenerationConfig = async (sessionId: string, config: GenerationConfig) => {
    try {
        const history = await getStoryHistory();
        const sessionIndex = history.findIndex(s => s.sessionId === sessionId);

        if (sessionIndex !== -1) {
            history[sessionIndex].generationConfig = config;
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        }
    } catch (e) {
        console.error("Failed to save session generation config.", e);
    }
};

export const updateSessionCoverImage = async (sessionId: string, newImagePath: string | null) => {
    try {
        const history = await getStoryHistory();
        const sessionIndex = history.findIndex(s => s.sessionId === sessionId);

        if (sessionIndex !== -1) {
            const storyId = history[sessionIndex].story.$id;
            if (newImagePath) {
                await associateImagePath(storyId, newImagePath);
            }
            history[sessionIndex].localCoverImagePath = newImagePath || undefined;
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        }
    } catch (e) {
        console.error("Failed to update session cover image.", e);
    }
};
