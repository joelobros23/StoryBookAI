import { Alert } from 'react-native';
import { PlayerData, StoryDocument, StoryEntry } from '../app/types/story';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

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
            generationConfig: { maxOutputTokens: 200, temperature: 0.8, topP: 0.9 }
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

        if (result.candidates && result.candidates.length > 0 && result.candidates[0].content.parts[0].text) {
            return result.candidates[0].content.parts[0].text.trim();
        } else {
            if (result.promptFeedback?.blockReason) {
                 throw new Error(`Response blocked due to: ${result.promptFeedback.blockReason}`);
            }
            throw new Error("Invalid response structure from AI.");
        }
    } catch (err: any) {
        console.error("AI generation failed:", err);
        Alert.alert("AI Error", err.message || "The AI failed to generate a response. Please try again.");
        return null;
    }
};
