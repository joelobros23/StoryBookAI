import { Models } from 'appwrite';
import { Href } from 'expo-router';
import { Alert } from 'react-native';
import { StoryDocument } from '../app/types/story';
import { databaseId, databases, ID, storiesCollectionId, uploadImageFile } from './appwrite';
import { generateImageFromPrompt, generateStoryContinuation } from './gemini';

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
 * This function is now robust to handle different call signatures.
 */
export async function handleQuickStart(
    genre: string, 
    p2: string | Models.User<Models.Preferences>, 
    p3: Models.User<Models.Preferences> | { push: (href: Href) => void; }, 
    p4?: { push: (href: Href) => void; }
) {
    let tag: string;
    let user: Models.User<Models.Preferences>;
    let router: { push: (href: Href) => void; };

    if (typeof p2 === 'string') {
        tag = p2;
        user = p3 as Models.User<Models.Preferences>;
        router = p4!;
    } else {
        user = p2 as Models.User<Models.Preferences>;
        router = p3 as { push: (href: Href) => void; };
        tag = genre;
        if (genre === "Modern Day Drama") tag = "Drama, 21st Century";
        if (genre === "Medieval Drama") tag = "Drama, Medieval Times";
    }

    if (!user || !user.$id) {
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
        tags: tag,
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

        // MODIFIED: Removed createNewSession and now passing the new document ID directly.
        router.push({
            pathname: '/intro/[sessionId]',
            params: { sessionId: newStoryDocument.$id, story: JSON.stringify(newStoryDocument) }
        });

    } catch (error: any) {
        console.error("Failed to save quick start story:", error);
        Alert.alert("Error", "Could not save the new story.");
    }
}
