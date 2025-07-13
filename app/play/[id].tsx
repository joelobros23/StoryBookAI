import { Feather } from '@expo/vector-icons';
import { Models } from 'appwrite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { databaseId, databases, storiesCollectionId } from '../../lib/appwrite';

// --- Gemini API Configuration ---
const API_KEY = ""; // Use your Gemini API Key here.
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;


// --- Type Definitions ---
type StoryDocument = Models.Document & {
    title: string;
    opening: string;
    ai_instruction: string;
    story_summary: string;
    plot_essentials: string;
};

type StoryEntry = {
    type: 'ai' | 'user';
    text: string;
};

type InputMode = 'Do' | 'Say' | 'Story';

// --- Components ---
const ActionButton = ({ icon, label, onPress, disabled = false }) => (
    <TouchableOpacity style={[styles.actionButton, disabled && styles.disabledButton]} onPress={onPress} disabled={disabled}>
        <Feather name={icon} size={18} color={disabled ? "#666" : "#e0e0e0"} />
        <Text style={[styles.actionButtonText, disabled && { color: "#666"}]}>{label}</Text>
    </TouchableOpacity>
);

export default function PlayStoryScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);

    // --- State Management ---
    const [story, setStory] = useState<StoryDocument | null>(null);
    const [storyContent, setStoryContent] = useState<StoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTakingTurn, setIsTakingTurn] = useState(false);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [inputMode, setInputMode] = useState<InputMode>('Do');
    const [isSelectingMode, setIsSelectingMode] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Data Fetching Effect ---
    useEffect(() => {
        const fetchStory = async () => {
            if (!id || typeof id !== 'string') {
                setError("Invalid Story ID.");
                setIsLoading(false);
                return;
            }
            try {
                const response = await databases.getDocument(databaseId, storiesCollectionId, id);
                const fetchedStory = response as StoryDocument;
                setStory(fetchedStory);
                if (fetchedStory.opening) {
                    setStoryContent([{ type: 'ai', text: fetchedStory.opening }]);
                }
            } catch (err: any) {
                console.error("Failed to fetch story:", err);
                setError("Could not load the story. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchStory();
    }, [id]);
    
    // --- Auto-scroll Effect ---
    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [storyContent]);

    // --- AI Interaction Logic ---
    const generateStoryContinuation = async (currentHistory: StoryEntry[], action?: string) => {
        if (!story) return;
        setIsAiThinking(true);

        const historyText = currentHistory.map(entry => entry.text).join('\n\n');

        const prompt = `${story.ai_instruction || ''}
        **Story Summary:** ${story.story_summary || 'Not provided.'}
        **Plot Essentials (Memory):** ${story.plot_essentials || 'Not provided.'}
        **Story So Far:**
        ${historyText}
        ${action || 'Continue the story.'}`;

        try {
            const payload = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 2000, temperature: 0.8, topP: 0.9 }
            };
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
            const result = await response.json();
            if (result.candidates && result.candidates.length > 0) {
                const aiText = result.candidates[0].content.parts[0].text;
                setStoryContent(prev => [...prev, { type: 'ai', text: aiText.trim() }]);
            } else {
                throw new Error("Invalid response structure from AI.");
            }
        } catch (err: any) {
            console.error("AI generation failed:", err);
            Alert.alert("AI Error", "The AI failed to generate a response. Please try again.");
        } finally {
            setIsAiThinking(false);
        }
    };

    const handleSendInput = () => {
        if (userInput.trim() === '') return;
        let userTurnText = '';
        let actionForAI = '';

        switch (inputMode) {
            case 'Say':
                userTurnText = `You say, "${userInput.trim()}"`;
                actionForAI = `> You say, "${userInput.trim()}"`;
                break;
            case 'Story':
                userTurnText = userInput.trim();
                actionForAI = userInput.trim();
                break;
            case 'Do':
            default:
                userTurnText = `> ${userInput.trim()}`;
                actionForAI = `> You ${userInput.trim()}`;
                break;
        }

        const newHistory = [...storyContent, { type: 'user', text: userTurnText }];
        setStoryContent(newHistory);
        generateStoryContinuation(newHistory, actionForAI);
        setUserInput('');
        setIsTakingTurn(false);
        setIsSelectingMode(false);
    };

    const handleContinue = () => generateStoryContinuation(storyContent);

    // --- UI Rendering ---
    const renderContent = () => {
        if (isLoading) return <ActivityIndicator size="large" color="#c792ea" style={styles.centered} />;
        if (error) return <Text style={[styles.storyText, styles.centered, { color: '#ff6b6b' }]}>{error}</Text>;

        return (
            <ScrollView ref={scrollViewRef} contentContainerStyle={styles.storyContainer}>
                {storyContent.map((entry, index) => (
                    <Text key={index} style={[styles.storyText, entry.type === 'user' && styles.userText]}>
                        {entry.text}
                    </Text>
                ))}
                {isAiThinking && <ActivityIndicator style={{ marginVertical: 15 }} color="#c792ea" />}
            </ScrollView>
        );
    };

    const renderInputArea = () => {
        if (isTakingTurn) {
            return (
                <View>
                    <View style={styles.modeSelectorBar}>
                        {isSelectingMode ? (
                            <>
                                <TouchableOpacity onPress={() => setIsSelectingMode(false)} style={styles.modeButton}>
                                    <Feather name="arrow-left" size={20} color="#e0e0e0" />
                                </TouchableOpacity>
                                {(['Do', 'Say', 'Story'] as InputMode[]).map(mode => (
                                    <TouchableOpacity key={mode} onPress={() => { setInputMode(mode); setIsSelectingMode(false); }} style={styles.modeButton}>
                                        <Text style={styles.modeButtonText}>{mode}</Text>
                                    </TouchableOpacity>
                                ))}
                            </>
                        ) : (
                            <>
                                <TouchableOpacity onPress={() => setIsSelectingMode(true)} style={styles.modeButton}>
                                    <Text style={styles.modeButtonText}>{inputMode}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { setIsTakingTurn(false); setIsSelectingMode(false); }} style={[styles.modeButton, { marginLeft: 'auto' }]}>
                                    <Feather name="x" size={20} color="#e0e0e0" />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                    <View style={styles.textInputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder={`What do you ${inputMode.toLowerCase()}?`}
                            placeholderTextColor="#888"
                            value={userInput}
                            onChangeText={setUserInput}
                            autoFocus={true}
                            editable={!isAiThinking}
                        />
                        <TouchableOpacity style={styles.sendButton} onPress={handleSendInput} disabled={isAiThinking || userInput.trim() === ''}>
                            <Feather name="send" size={24} color={isAiThinking || userInput.trim() === '' ? "#666" : "#c792ea"} />
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.actionBar}>
                <ActionButton icon="edit" label="Take a Turn" onPress={() => setIsTakingTurn(true)} disabled={isAiThinking} />
                <ActionButton icon="fast-forward" label="Continue" onPress={handleContinue} disabled={isAiThinking} />
                <ActionButton icon="rotate-ccw" label="Retry" onPress={() => { /* TODO */ }} disabled={isAiThinking} />
                <ActionButton icon="delete" label="Erase" onPress={() => { /* TODO */ }} disabled={isAiThinking} />
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAvoidingView 
                style={styles.flexContainer} 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton} disabled={isAiThinking}>
                        <Feather name="chevron-left" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {isLoading ? 'Loading...' : story?.title || 'Story'}
                    </Text>
                     <TouchableOpacity style={styles.settingsButton} disabled={isAiThinking}>
                        <Feather name="settings" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.flexContainer}>
                    {renderContent()}
                </View>
                <View style={styles.inputWrapper}>
                    {renderInputArea()}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    flexContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    backButton: {
        padding: 5,
    },
    settingsButton: {
        padding: 5,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10,
    },
    storyContainer: {
        flexGrow: 1,
        padding: 20,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    storyText: {
        color: '#e0e0e0',
        fontSize: 18,
        lineHeight: 28,
        marginBottom: 15,
    },
    userText: {
        color: '#c792ea',
        fontStyle: 'italic',
        fontWeight: 'bold',
    },
    inputWrapper: {
        backgroundColor: '#1e1e1e',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    modeSelectorBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 8,
    },
    modeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 5,
        marginRight: 10,
    },
    modeButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    textInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#2a2a2a',
        color: '#FFFFFF',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        marginRight: 10,
    },
    sendButton: {
        padding: 5,
    },
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 10,
    },
    actionButton: {
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
    },
    actionButtonText: {
        color: '#e0e0e0',
        fontSize: 12,
        marginTop: 4,
    },
    disabledButton: {
        opacity: 0.5,
    },
});
