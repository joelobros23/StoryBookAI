import { Models } from 'appwrite';
import { Href } from 'expo-router';
import { Alert } from 'react-native';
import { StoryDocument } from '../app/types/story';
import { databaseId, databases, ID, storiesCollectionId, uploadImageFile } from './appwrite';
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
        // NOTE: This function still uses the older single-key method.
        // It's separate from the multi-key rotation system in gemini.ts.
        // For consistency, this could be updated in the future.
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
 * @param details The generated story details.
 * @param genre The genre of the story.
 * @returns A string suitable for use as an image generation prompt.
 */
async function generateImagePromptFromStory(details: GeneratedStoryDetails, genre: string): Promise<string> {
    // A more direct and simpler prompt to get good keywords for the image generator.
    const prompt = `Create a short, visually descriptive image prompt for a story titled "${details.title}". The story is in the ${genre} genre. The prompt should be a comma-separated list of keywords in a vibrant anime style.`;

    try {
        // FIX: Added a specific, simple generationConfig for this call.
        // This was the source of the original error.
        const imagePrompt = await generateStoryContinuation(
            {} as StoryDocument,
            [],
            { temperature: 0.6, topP: 1.0, maxOutputTokens: 80 }, // Config for short, creative text
            undefined,
            prompt
        );
        // FIX: Enhanced the fallback prompt to be more descriptive.
        return imagePrompt || `${details.title}, ${genre}, vibrant anime style, epic scene, cinematic lighting`;
    } catch (error) {
        console.error("Failed to generate image prompt, using fallback:", error);
        return `${details.title}, ${genre}, vibrant anime style, epic scene, cinematic lighting`;
    }
}


/**
 * The main handler for the quick start process.
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

    let uploadedImageId: string | undefined = undefined;
    try {
        console.log("Generating enhanced image prompt...");
        const imagePrompt = await generateImagePromptFromStory(storyDetails, genre);
        
        console.log("Generating cover image with prompt:", imagePrompt);
        const base64Image = await generateImageFromPrompt(imagePrompt);

        if (base64Image) {
            console.log("Uploading generated image...");
            const fileName = `${storyDetails.title.replace(/\s+/g, '_')}_${Date.now()}.png`;
            uploadedImageId = await uploadImageFile(base64Image, fileName);
            console.log("Image uploaded with ID:", uploadedImageId);
        }
    } catch (error) {
        console.error("Quick Start image generation/upload failed, proceeding without image:", error);
    }

    const storyData: Omit<StoryDocument, keyof Models.Document> = {
        ...storyDetails,
        tags: genre.toLowerCase(),
        ai_instruction: DEFAULT_AI_INSTRUCTIONS,
        ask_user_name: false,
        ask_user_age: false,
        ask_user_gender: false,
        userId: user.$id,
        cover_image_id: uploadedImageId,
    };

    try {
        const newStoryDocument = await databases.createDocument(
            databaseId,
            storiesCollectionId,
            ID.unique(),
            storyData
        );

        const newSession = await createNewSession(newStoryDocument as StoryDocument);

        router.push({
            pathname: '/play/[sessionId]',
            params: { sessionId: newSession.sessionId, story: JSON.stringify(newStoryDocument) }
        });

    } catch (error: any) {
        console.error("Failed to save quick start story:", error);
        Alert.alert("Error", "Could not save the new story.");
    }
}
