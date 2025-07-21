import { Alert } from 'react-native';
import { PlayerData, StoryDocument, StoryEntry } from '../app/types/story';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
const IMAGE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${API_KEY}`;


/**
 * Finds the last complete sentence in a block of text and discards any trailing fragments.
 * This is useful when an AI response is cut off by token limits.
 * @param text The raw text from the AI.
 * @returns The text trimmed to the last complete sentence, or an empty string if no complete sentence is found.
 */
const trimToCompleteSentence = (text: string): string => {
    // Find the last occurrence of a sentence-ending punctuation mark.
    const lastDot = text.lastIndexOf('.');
    const lastQuestion = text.lastIndexOf('?');
    const lastExclamation = text.lastIndexOf('!');

    // Determine the position of the very last punctuation mark.
    const lastPunctuationIndex = Math.max(lastDot, lastQuestion, lastExclamation);

    if (lastPunctuationIndex > -1) {
        // If a punctuation mark is found, return the substring up to and including it.
        // This effectively cuts off any incomplete sentence that follows.
        return text.substring(0, lastPunctuationIndex + 1);
    }

    // If no sentence-ending punctuation is found, it means the entire text is a single,
    // incomplete fragment. In this case, it's better to return nothing.
    return '';
};


/**
 * Generates the next part of the story using the Gemini API.
 * @param story - The core story document with instructions and summary.
 * @param currentHistory - The existing story entries (user and AI turns).
 * @param playerData - Optional data about the player character.
 * @param action - The latest action or input from the user.
 * @returns The new AI-generated text, or null if an error occurs.
 */
export const generateStoryContinuation = async (
    story: StoryDocument,
    currentHistory: StoryEntry[],
    playerData?: PlayerData,
    action?: string
): Promise<string | null> => {
    if (!API_KEY) {
        Alert.alert("API Key Missing", "The Gemini API key is not configured. Please set EXPO_PUBLIC_GEMINI_API_KEY in your .env file.");
        return null;
    }

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
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 200, temperature: 0.8, topP: 0.9 },
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_HARASSMENT',
                    threshold: 'BLOCK_NONE',
                },
                {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_NONE',
                },
                {
                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                    threshold: 'BLOCK_NONE',
                },
                {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_NONE',
                },
            ]
        };
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];

        if (candidate?.content?.parts?.[0]?.text) {
            const rawText = candidate.content.parts[0].text.trim();
            const finishReason = candidate.finishReason;

            // If the AI was cut off because it hit the token limit,
            // we process the text to remove the final, incomplete sentence.
            if (finishReason === 'MAX_TOKENS') {
                return trimToCompleteSentence(rawText);
            }
            
            // Otherwise, we can assume the response is complete.
            return rawText;

        } else {
            // The response was likely blocked or empty.
            // We've removed the explicit block reason check.
            throw new Error("Invalid or empty response from AI.");
        }
    } catch (err: any) {
        console.error("AI generation failed:", err);
        Alert.alert("AI Error", err.message || "The AI failed to generate a response. Please try again.");
        return null;
    }
};

// Function to generate an image from a text prompt
export const generateImageFromPrompt = async (prompt: string): Promise<string | null> => {
    if (!API_KEY) {
        Alert.alert("API Key Missing", "The Gemini API key is not configured.");
        return null;
    }
    
    console.log("Generating image with prompt:", prompt);
    console.log("Using model: gemini-2.0-flash-preview-image-generation");

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

        const response = await fetch(IMAGE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Image API Error Body:", errorBody);
            throw new Error(`Image API request failed with status ${response.status}`);
        }

        const result = await response.json();
        
        const candidate = result.candidates?.[0];
        // FIX: Explicitly typed the parameter 'p' as 'any' to resolve the implicit 'any' type error.
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
