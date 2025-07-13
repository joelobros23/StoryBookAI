import { Models } from 'appwrite';

/**
 * Defines the full structure of a story document, including all AI-related fields.
 * This is the single source of truth for what a story object contains.
 */
export type StoryDocument = Models.Document & {
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
};

/**
 * Defines a single entry in the chat/story log.
 */
export type StoryEntry = {
    type: 'ai' | 'user';
    text: string;
    isNew?: boolean;
};

/**
 * Defines the structure for a saved story session in local history,
 * containing the full story document and its chat content.
 */
export type StorySession = {
    story: StoryDocument;
    content: StoryEntry[];
    sessionId: string; // FIX: Added missing property
    sessionDate: string; // FIX: Added missing property
};
