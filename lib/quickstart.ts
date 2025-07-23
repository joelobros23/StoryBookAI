import { Models } from 'appwrite';
import { Href } from 'expo-router';
import { Alert } from 'react-native';
import { PlayerData, StoryDocument } from '../app/types/story';
import { ID } from './appwrite';
// MODIFIED: Removed generateStoryContinuation as it's no longer needed
import * as FileSystem from 'expo-file-system';
import { generateImageFromPrompt } from './gemini';
import { associateImagePath } from './history';

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
 * Generates story details from the Gemini API based on a genre and player data.
 */
async function generateStoryDetails(genre: string, playerData: PlayerData): Promise<GeneratedStoryDetails | null> {
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
    const prompt = `Generate a complete, ready-to-play story premise for a role-playing game in the '${genre}' genre. The story must be tailored for the following player character:
    - Name: ${playerData.name}
    - Gender: ${playerData.gender}
    - Age: ${playerData.age}

    Provide a title, a short description, an exciting opening scene for the player, a brief summary of the overall story, and 2-3 essential plot points for the AI to remember. The story should revolve around the player's character.
    
    Crucially, the 'description' and 'opening' fields must be written in the second person, addressing the player directly as 'You'.
    
    Respond with only a valid JSON object that conforms to the following schema: ${JSON.stringify(schema)}`;

    try {
        const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { 
                    responseMimeType: "application/json",
                    temperature: 0.8,
                    topP: 0.9
                }
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
 * MODIFIED: This function now directly constructs the prompt in a single step.
 */
function generateImagePromptFromStory(details: GeneratedStoryDetails, genre: string, playerData: PlayerData): string {
    const characterDescription = `${playerData.gender} character aged ${playerData.age}`;
    const prompt = `${details.title}, ${characterDescription}, based on the description: "${details.description}", ${genre}, vibrant anime style, epic scene, cinematic lighting`;
    console.log("Generating image with prompt:", prompt); // For debugging
    return prompt;
}


/**
 * The main handler for the quick start process.
 */
export async function handleQuickStart(
    genre: string, 
    tag: string, 
    playerData: PlayerData,
    user: Models.User<Models.Preferences>, 
    router: { push: (href: Href) => void; }
) {
    if (!user || !user.$id) {
        Alert.alert("Error", "You must be logged in to create a story.");
        return;
    }

    const storyDetails = await generateStoryDetails(genre, playerData);

    if (!storyDetails) {
        Alert.alert("Generation Failed", "The AI could not create a story. Please try again.");
        return;
    }

    const storyId = ID.unique();
    let base64Image: string | null = null;

    try {
        // MODIFIED: This now uses the simplified, single-step prompt generation.
        const imagePrompt = generateImagePromptFromStory(storyDetails, genre, playerData);
        base64Image = await generateImageFromPrompt(imagePrompt);

        if (base64Image) {
            const newFileName = `${storyId}.png`;
            const newLocalUri = FileSystem.documentDirectory + newFileName;
            await FileSystem.writeAsStringAsync(newLocalUri, base64Image, {
                encoding: FileSystem.EncodingType.Base64,
            });
            await associateImagePath(storyId, newLocalUri);
        }
    } catch (error) {
        console.error("Quick Start image generation/saving failed:", error);
    }

    const storyData: StoryDocument = {
        ...storyDetails,
        tags: tag,
        ai_instruction: DEFAULT_AI_INSTRUCTIONS,
        ask_user_name: false,
        ask_user_age: false,
        ask_user_gender: false,
        userId: user.$id,
        $id: storyId,
        $createdAt: new Date().toISOString(),
        isLocal: true,
    };

    router.push({
        pathname: '/intro/[sessionId]',
        params: { 
            sessionId: storyData.$id, 
            story: JSON.stringify(storyData),
            playerData: JSON.stringify(playerData) 
        }
    });
}
