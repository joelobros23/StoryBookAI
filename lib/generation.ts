import { Models } from 'appwrite';
import { Href } from 'expo-router';
import { Alert } from 'react-native';
import { PlayerData, StoryDocument } from '../app/types/story';
import { ID } from './appwrite';
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
    description: string;
    tags: string;
    opening: string;
    story_summary: string;
    plot_essentials: string;
};

/**
 * Generates full story details from a user's title and description.
 */
async function generateStoryFromUserInput(
    title: string,
    userDescription: string,
    isMainCharacter: boolean
): Promise<GeneratedStoryDetails | null> {
    const schema = {
        type: "OBJECT",
        properties: {
            "description": { "type": "STRING" },
            "tags": { "type": "STRING" },
            "opening": { "type": "STRING" },
            "story_summary": { "type": "STRING" },
            "plot_essentials": { "type": "STRING" },
        },
        required: ["description", "tags", "opening", "story_summary", "plot_essentials"]
    };

    const narrativePerspective = isMainCharacter
        ? 'second person (addressing the player as "You")'
        : 'third person (describing a character, for example as "he" or "she")';

    const prompt = `Generate a complete, ready-to-play story premise for a role-playing game based on the user's input.
    
    User's Title: "${title}"
    User's Description: "${userDescription}"

    Your task is to expand on this. Generate the following fields:
    1.  'description': A more polished, engaging version of the user's description.
    2.  'tags': A comma-separated list of 2-3 relevant genres or themes (e.g., Fantasy, Mystery, Cyberpunk).
    3.  'opening': An exciting opening scene to begin the story.
    4.  'story_summary': A brief summary of the overall story arc.
    5.  'plot_essentials': 2-3 essential plot points for the AI to remember and guide the story.

    Crucially, the 'description' and 'opening' fields must be written in the ${narrativePerspective}.
    
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
        console.error("Failed to generate story details from user input:", error);
        return null;
    }
}

/**
 * Generates an image prompt from the AI-generated story details.
 * MODIFIED: Now accepts optional PlayerData to create a more specific prompt.
 */
async function generateImagePromptFromGeneratedStory(
    details: GeneratedStoryDetails,
    title: string,
    playerData?: PlayerData
): Promise<string> {
    let characterInfo = '';
    // If player data is provided, add it to the prompt
    if (playerData && playerData.name && playerData.gender && playerData.age) {
        characterInfo = `
The main character should be depicted according to these details:
- Gender: ${playerData.gender}
- Age: Approximately ${playerData.age} years old

Ensure the character depicted in the image accurately reflects these details.`;
    }

    const prompt = `You are a creative assistant. Based on the following story details, generate a short, visually descriptive prompt for an AI image generator. The prompt should capture the essence of the story in a single, compelling scene. The final image must be in a vibrant "Anime Style".

Story Title: ${title}
Tags: ${details.tags}
Description: ${details.description}
${characterInfo}`;

    try {
        const imagePrompt = await generateStoryContinuation(
            {} as StoryDocument,
            [],
            { temperature: 0.7, topP: 1.0, maxOutputTokens: 100 },
            undefined,
            prompt
        );
        return imagePrompt || `${title}, ${details.tags}, vibrant anime style, epic scene, cinematic lighting`;
    } catch (error) {
        console.error("Failed to generate image prompt, using fallback:", error);
        return `${title}, ${details.tags}, vibrant anime style, epic scene, cinematic lighting`;
    }
}


/**
 * The main handler for the simplified creation process.
 * MODIFIED: Now accepts optional PlayerData.
 */
export async function handleSimplifiedCreation(
    title: string,
    userDescription: string,
    isMainCharacter: boolean,
    user: Models.User<Models.Preferences>,
    router: { push: (href: Href) => void; },
    playerData?: PlayerData
) {
    if (!user || !user.$id) {
        Alert.alert("Error", "You must be logged in to create a story.");
        return;
    }

    const storyDetails = await generateStoryFromUserInput(title, userDescription, isMainCharacter);

    if (!storyDetails) {
        Alert.alert("Generation Failed", "The AI could not create a story. Please try again.");
        return;
    }

    let base64Image: string | null = null;
    try {
        // Pass the optional player data to the image prompt generator
        const imagePrompt = await generateImagePromptFromGeneratedStory(storyDetails, title, playerData);
        base64Image = await generateImageFromPrompt(imagePrompt);
    } catch (error) {
        console.error("Simplified creation image generation failed, proceeding without image:", error);
    }

    const storyData: StoryDocument = {
        title,
        ...storyDetails,
        ai_instruction: DEFAULT_AI_INSTRUCTIONS,
        // If player data was provided, we don't need to ask again.
        ask_user_name: isMainCharacter && !playerData,
        ask_user_age: isMainCharacter && !playerData,
        ask_user_gender: isMainCharacter && !playerData,
        userId: user.$id,
        $id: ID.unique(),
        $createdAt: new Date().toISOString(),
        isLocal: true,
        localCoverImageBase64: base64Image || undefined,
    };

    router.push({
        pathname: '/intro/[sessionId]',
        params: { 
            sessionId: storyData.$id, 
            story: JSON.stringify(storyData),
            // Pass player data to the intro screen if it exists
            ...(playerData && { playerData: JSON.stringify(playerData) })
        }
    });
}
