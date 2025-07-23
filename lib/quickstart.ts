import { Models } from 'appwrite';
import { Href } from 'expo-router';
import { Alert } from 'react-native';
import { StoryDocument } from '../app/types/story';
import { ID } from './appwrite';
import { generateImageFromPrompt, generateStoryContinuation } from './gemini';
import { createNewSession } from './history';

// --- Constants ---
export const DEFAULT_AI_INSTRUCTIONS = `You are an AI dungeon master that provides any kind of roleplaying game content.

Instructions: 
- Be specific, descriptive, and creative. 
- Avoid repetition and avoid summarization. 
- Generally use second person (like this: 'He looks at you.'). But use third person if that's what the story seems to follow. 
- Never decide or write for the user. If the input ends mid sentence, continue where it left off.
- > tokens mean a character action attempt. You should describe what happens when the player attempts that action. Generating '###' is forbidden.`;

type GeneratedStoryDetails = {
    title: string;
    description: string;
    opening: string;
    story_summary: string;
    plot_essentials: string;
};

/**
 * Generates story details from the Gemini API based on a genre.
 */
async function generateStoryDetailsFromGenre(genre: string): Promise<GeneratedStoryDetails | null> {
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
        const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

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
 * Generates a high-quality, concise image prompt from story details.
 */
async function generateImagePromptFromStory(details: GeneratedStoryDetails, genre: string): Promise<string> {
    const prompt = `You are a creative assistant. Based on the following story details, generate a short, visually descriptive prompt for an AI image generator. The prompt should capture the essence of the story in a single, compelling scene. The final image must be in a vibrant "Anime Style".

Story Title: ${details.title}
Genre: ${genre}
Description: ${details.description}`;

    try {
        const imagePrompt = await generateStoryContinuation(
            {} as StoryDocument,
            [],
            { temperature: 0.7, topP: 1.0, maxOutputTokens: 100 },
            undefined,
            prompt
        );
        return imagePrompt || `${details.title}, ${genre}, vibrant anime style, epic scene, cinematic lighting`;
    } catch (error) {
        console.error("Failed to generate image prompt, using fallback:", error);
        return `${details.title}, ${genre}, vibrant anime style, epic scene, cinematic lighting`;
    }
}


/**
 * The main handler for the quick start process.
 */
export async function handleQuickStart(
    genre: string, 
    tag: string, 
    user: Models.User<Models.Preferences>, 
    router: { push: (href: Href) => void; }
) {
    if (!user || !user.$id) {
        Alert.alert("Error", "You must be logged in to create a story.");
        return;
    }

    const storyDetails = await generateStoryDetailsFromGenre(genre);

    if (!storyDetails) {
        Alert.alert("Generation Failed", "The AI could not create a story. Please try again.");
        return;
    }

    let base64Image: string | null = null;
    try {
        const imagePrompt = await generateImagePromptFromStory(storyDetails, genre);
        base64Image = await generateImageFromPrompt(imagePrompt);
    } catch (error) {
        console.error("Quick Start image generation failed, proceeding without image:", error);
    }

    // MODIFIED: Set character questions based on genre
    const isRomance = genre === 'Romance';

    const storyData: StoryDocument = {
        ...storyDetails,
        tags: tag,
        ai_instruction: DEFAULT_AI_INSTRUCTIONS,
        ask_user_name: isRomance,
        ask_user_age: isRomance,
        ask_user_gender: isRomance,
        userId: user.$id,
        $id: ID.unique(),
        $createdAt: new Date().toISOString(),
        isLocal: true,
        localCoverImageBase64: base64Image || undefined,
    };

    try {
        const newSession = await createNewSession(storyData);
        
        router.push({
            pathname: '/intro/[sessionId]',
            params: { sessionId: newSession.sessionId, story: JSON.stringify(newSession.story) }
        });

    } catch (error: any) {
        console.error("Failed to save quick start story locally:", error);
        Alert.alert("Error", "Could not save the new story.");
    }
}
