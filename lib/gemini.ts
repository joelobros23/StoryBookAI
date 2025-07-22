import { Alert } from 'react-native';
import { GenerationConfig, PlayerData, StoryDocument, StoryEntry } from '../app/types/story';

// An array of API keys to use for requests.
const API_KEYS = [
    'AIzaSyAhz-vMTfd4NjDreB-qz0mjGVBVYvNon00',
    'AIzaSyCFUZQnETsNs4eGafD1_9P4fh-RdA0TqVE',
    'AIzaSyA9Ak4knLXSNP2Q510eEvpObApuE3QGTOM',
    'AIzaSyAhXBYMc_rY_ILGseYrausyoZAQHaMm-Ac',
    'AIzaSyBnBNjIkFDu5Y2tnI5M46G7gUTTnhTy5mo'
];

// Base URLs for the Gemini API
const API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=';
const IMAGE_API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=';


/**
 * A utility function to try fetching from the Gemini API with key rotation.
 */
const fetchWithKeyRotation = async (baseUrl: string, payload: object) => {
    for (const key of API_KEYS) {
        const fullUrl = `${baseUrl}${key}`;
        try {
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                return await response.json(); // Success, return the response
            }
            console.warn(`API request with a key failed with status: ${response.status}`);

        } catch (error) {
            console.error(`Fetch failed for a key:`, error);
        }
    }
    throw new Error('All API keys failed to fetch a response.');
};


/**
 * Finds the last complete sentence in a block of text.
 */
const trimToCompleteSentence = (text: string): string => {
    const lastDot = text.lastIndexOf('.');
    const lastQuestion = text.lastIndexOf('?');
    const lastExclamation = text.lastIndexOf('!');
    const lastPunctuationIndex = Math.max(lastDot, lastQuestion, lastExclamation);

    if (lastPunctuationIndex > -1) {
        return text.substring(0, lastPunctuationIndex + 1);
    }
    return '';
};


/**
 * Generates the next part of the story using the Gemini API.
 * @param story - The core story document.
 * @param currentHistory - The existing story entries.
 * @param generationConfig - The AI generation settings (temperature, topP, etc.).
 * @param playerData - Optional data about the player character.
 * @param action - The latest action or input from the user.
 * @returns The new AI-generated text, or null if an error occurs.
 */
export const generateStoryContinuation = async (
    story: StoryDocument,
    currentHistory: StoryEntry[],
    generationConfig: GenerationConfig, // MODIFIED: Added generationConfig as a required parameter
    playerData?: PlayerData,
    action?: string
): Promise<string | null> => {

    const historyText = currentHistory.map(entry => entry.text).join('\n\n');

    let playerInfo = '';
    if (playerData) {
        const parts = [];
        if (playerData.name) parts.push(`the player's name is ${playerData.name}`);
        if (playerData.gender) parts.push(`their gender is ${playerData.gender}`);
        if (playerData.age) parts.push(`their age is ${playerData.age}`);
        if (parts.length > 0) {
            playerInfo = `Remember these key details about the main character: ${parts.join(', ')}. Refer to them in the story when relevant.`;
        }
    }

    const prompt = `${story.ai_instruction || ''}
    ${playerInfo}
    **IMPORTANT RULE:** Your response must be a complete thought. Do not end your response with a partial sentence or phrase. Always finish the paragraph.
    **Story Summary:** ${story.story_summary || 'Not provided.'}
    **Plot Essentials (Memory):** ${story.plot_essentials || 'Not provided.'}
    **Story So Far:**
    ${historyText}
    ${action || 'Continue the story.'}`;

    try {
        // MODIFIED: The payload now uses the passed-in generationConfig.
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: generationConfig, // Use the dynamic config
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ]
        };

        const result = await fetchWithKeyRotation(API_URL_BASE, payload);
        const candidate = result.candidates?.[0];

        if (candidate?.content?.parts?.[0]?.text) {
            const rawText = candidate.content.parts[0].text.trim();
            const finishReason = candidate.finishReason;

            if (finishReason === 'MAX_TOKENS') {
                return trimToCompleteSentence(rawText);
            }
            return rawText;
        } else {
            throw new Error("Invalid or empty response from AI.");
        }
    } catch (err: any) {
        console.error("AI generation failed:", err);
        Alert.alert("AI Error", err.message || "The AI failed to generate a response. Please try again.");
        return null;
    }
};

// Function to generate an image from a text prompt (unchanged)
export const generateImageFromPrompt = async (prompt: string): Promise<string | null> => {
    console.log("Generating image with prompt:", prompt);
    try {
        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                responseModalities: ["IMAGE", "TEXT"]
            }
        };
        const result = await fetchWithKeyRotation(IMAGE_API_URL_BASE, payload);
        const candidate = result.candidates?.[0];
        const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);

        if (imagePart?.inlineData?.data) {
            return imagePart.inlineData.data;
        } else {
            if (candidate?.finishReason === 'SAFETY') {
                throw new Error("The prompt was blocked for safety reasons. Please try a different prompt.");
            }
            console.error("Invalid response from Image API:", result);
            throw new Error("Invalid or empty response from Image AI. The prompt may have been blocked.");
        }
    } catch (err: any) {
        console.error("Image generation failed:", err);
        Alert.alert("Image Generation Error", err.message || "The AI failed to generate an image. Please try again.");
        return null;
    }
};
