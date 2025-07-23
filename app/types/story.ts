import { Models } from 'appwrite';

/**
 * Defines the AI generation settings for a story session.
 */
export type GenerationConfig = {
    temperature: number;
    topP: number;
    maxOutputTokens: number;
};

/**
 * Defines the full structure of a story document.
 * MODIFIED: This type now represents both local and remote stories.
 */
export type StoryDocument = Partial<Models.Document> & {
    title: string;
    description: string;
    tags: string;
    opening: string;
    ai_instruction: string;
    story_summary: string;
    plot_essentials: string;
    ask_user_name: boolean;
    ask_user_age: boolean;
    ask_user_gender: boolean;
    userId: string;
    cover_image_id?: string;
    // NEW: Fields for local-only stories
    isLocal?: boolean;
    localCoverImageBase64?: string;
    // Required Appwrite fields (can be manually added for local stories)
    $id: string;
    $createdAt: string;
};

/**
 * Defines a single entry in the chat/story log.
 */
export type StoryEntry = {
    id: string;
    type: 'ai' | 'user';
    text: string;
    isNew?: boolean;
};

/**
 * Defines the player character's data for a session.
 */
export type PlayerData = {
    name?: string;
    age?: string;
    gender?: string;
};

/**
 * Defines the structure for a saved story session in local history.
 */
export type StorySession = {
    story: StoryDocument;
    content: StoryEntry[];
    sessionId: string;
    sessionDate: string;
    playerData?: PlayerData;
    localCoverImagePath?: string;
    generationConfig?: GenerationConfig;
    isLocal?: boolean;
};
