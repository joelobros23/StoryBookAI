import { Models } from 'appwrite';
import { Href } from 'expo-router';
import { Alert } from 'react-native';
import { StoryDocument } from '../app/types/story';
import { databaseId, databases, ID, storiesCollectionId } from './appwrite';
import { createNewSession } from './history';

// --- Constants ---
export const DEFAULT_AI_INSTRUCTIONS = `You are an AI dungeon master that provides any kind of roleplaying game content.

Instructions: 
- Be specific, descriptive, and creative. 
- Avoid repetition and avoid summarization. 
- Generally use second person (like this: 'He looks at you.'). But use third person if that's what the story seems to follow. 
- Never decide or write for the user. If the input ends mid sentence, continue where it left off.
- > tokens mean a character action attempt. You should describe what happens when the player attempts that action. Generating '###' is forbidden.`;

// --- Gemini API Configuration ---
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

/**
 * Generates story details from the Gemini API based on a genre.
 * @param genre The selected genre for the story.
 * @returns A promise that resolves to the generated story data or null.
 */
async function generateStoryDetailsFromGenre(genre: string): Promise<Omit<StoryDocument, keyof Models.Document | 'userId' | 'ask_user_name' | 'ask_user_age' | 'ask_user_gender' | 'tags' | 'ai_instruction'> | null> {
    const schema = {
        type: "OBJECT",
        properties: {
            "title": { "type": "STRING" },
            "description": { "type": "STRING" },
            "opening": { "type": "STRING" },
            "story_summary": { "type": "STRING" },
            "plot_essentials": { "type": "STRING" },
        },
        required: ["title", "description", "opening", "story_summary", "plot_essentials"]
    };

    const prompt = `Generate a complete, ready-to-play story premise for a role-playing game in the '${genre}' genre. Provide a title, a short description, an exciting opening scene for the player, a brief summary of the overall story, and 2-3 essential plot points for the AI to remember. Respond with only a valid JSON object that conforms to the following schema: ${JSON.stringify(schema)}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const result = await response.json();
        const jsonString = result.candidates[0].content.parts[0].text;
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Failed to generate story details:", error);
        return null;
    }
}

/**
 * The main handler for the quick start process.
 * Generates, saves, and navigates to a new story.
 * @param genre The selected genre.
 * @param user The current user object.
 * @param router The Expo router instance.
 */
export async function handleQuickStart(genre: string, user: Models.User<Models.Preferences>, router: { push: (href: Href) => void; }) {
    if (!user) {
        Alert.alert("Error", "You must be logged in to create a story.");
        return;
    }

    const storyDetails = await generateStoryDetailsFromGenre(genre);

    if (!storyDetails) {
        Alert.alert("Generation Failed", "The AI could not create a story. Please try again.");
        return;
    }

    const storyData: Omit<StoryDocument, keyof Models.Document> = {
        ...storyDetails,
        tags: genre.toLowerCase(),
        ai_instruction: DEFAULT_AI_INSTRUCTIONS,
        ask_user_name: false,
        ask_user_age: false,
        ask_user_gender: false,
        userId: user.$id,
    };

    try {
        const newStoryDocument = await databases.createDocument(
            databaseId,
            storiesCollectionId,
            ID.unique(),
            storyData
        );

        const newSession = await createNewSession(newStoryDocument as StoryDocument);

        // FIX: Use the correct object syntax for typed routes
        router.push({
            pathname: '/play/[sessionId]',
            params: { sessionId: newSession.sessionId, story: JSON.stringify(newStoryDocument) }
        });

    } catch (error: any) {
        console.error("Failed to save quick start story:", error);
        Alert.alert("Error", "Could not save the new story.");
    }
}
