import { Feather } from '@expo/vector-icons';
import { Models } from 'appwrite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    LayoutChangeEvent,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { databaseId, databases, storiesCollectionId } from '../../lib/appwrite';
import { generateStoryContinuation as generateAiResponse } from '../../lib/gemini';

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
    isNew?: boolean; // Flag for newly generated AI text
};

type InputMode = 'Do' | 'Say' | 'Story';

// --- Components ---

/**
 * A component to render text with markdown-like formatting (**bold**, *italic*)
 * and underline new AI-generated content.
 */
const FormattedText = ({ text, style, isNew = false }: { text: string; style: any; isNew?: boolean }) => {
    // Regex to find **bold** and *italic* text, and split the string by them.
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g).filter(Boolean);

    const textStyle = [style];
    if (isNew) {
        // Apply underline style only to new AI text
        textStyle.push(styles.newlyGeneratedText);
    }

    return (
        <Text style={textStyle}>
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <Text key={index} style={styles.boldText}>
                            {part.slice(2, -2)}
                        </Text>
                    );
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                    return (
                        <Text key={index} style={styles.italicText}>
                            {part.slice(1, -1)}
                        </Text>
                    );
                }
                return part; // Regular text
            })}
        </Text>
    );
};


const ActionButton = ({ icon, label, onPress, disabled = false }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; disabled?: boolean }) => (
    <TouchableOpacity style={[styles.actionButton, disabled && styles.disabledButton]} onPress={onPress} disabled={disabled}>
        <Feather name={icon} size={18} color={disabled ? "#666" : "#e0e0e0"} />
        <Text style={[styles.actionButtonText, disabled && { color: "#666"}]}>{label}</Text>
    </TouchableOpacity>
);

export default function PlayStoryScreen() {
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);
    const [headerHeight, setHeaderHeight] = useState(0);
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
    
    const handleHeaderLayout = (event: LayoutChangeEvent) => {
        const { height } = event.nativeEvent.layout;
        setHeaderHeight(height);
    };

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
            }
        );
        
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
            }
        );
        
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

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
                    setStoryContent([{ type: 'ai', text: fetchedStory.opening, isNew: true }]);
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
        if (storyContent.length > 1) {
           setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [storyContent]);

    // --- AI Interaction Logic ---
    const handleGenerateStoryContinuation = async (currentHistory: StoryEntry[], action?: string) => {
        if (!story) return;
        setIsAiThinking(true);

        const aiText = await generateAiResponse(story, currentHistory, action);

        if (aiText) {
            setStoryContent(prev => {
                const oldContent = prev.map(entry => ({ ...entry, isNew: false }));
                return [...oldContent, { type: 'ai', text: aiText, isNew: true }];
            });
        }
        
        setIsAiThinking(false);
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

        const newHistory = [
            ...storyContent.map(entry => ({...entry, isNew: false })),
            { type: 'user', text: userTurnText }
        ];
        setStoryContent(newHistory);
        handleGenerateStoryContinuation(newHistory, actionForAI);
        setUserInput('');
        setIsTakingTurn(false);
        setIsSelectingMode(false);
    };

    const handleContinue = () => {
        const newHistory = storyContent.map(entry => ({...entry, isNew: false }));
        setStoryContent(newHistory);
        handleGenerateStoryContinuation(newHistory);
    }

    // --- UI Rendering ---
    const renderContent = () => {
        if (isLoading) return <ActivityIndicator size="large" color="#c792ea" style={styles.centered} />;
        if (error) return <Text style={[styles.storyText, styles.centered, { color: '#ff6b6b' }]}>{error}</Text>;

        return (
            <>
                {storyContent.map((entry, index) => (
                     <FormattedText
                        key={index}
                        text={entry.text}
                        style={entry.type === 'user' ? styles.userText : styles.storyText}
                        isNew={entry.isNew}
                    />
                ))}
                {isAiThinking && <ActivityIndicator style={{ marginVertical: 15 }} color="#c792ea" />}
            </>
        );
    };

    const renderInputArea = () => {
        if (isTakingTurn) {
            return (
                <View style={styles.inputAreaContainer}>
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
        <SafeAreaView 
            style={styles.container} 
            edges={['bottom']} // Only handle bottom safe area
        >
            {/* Header without extra padding */}
            <View 
                style={styles.header}
                onLayout={handleHeaderLayout}
            >
                {/* Back button */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} disabled={isAiThinking}>
                    <Feather name="chevron-left" size={28} color="#FFFFFF" />
                </TouchableOpacity>
                
                {/* Title */}
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {isLoading ? 'Loading...' : story?.title || 'Story'}
                </Text>
                
                {/* Settings button */}
                <TouchableOpacity style={styles.settingsButton} disabled={isAiThinking}>
                    <Feather name="settings" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
            
            {/* Main content area */}
            <View style={styles.flexContainer}>
                <ScrollView 
                    ref={scrollViewRef}
                    style={styles.storyScrollView}
                    contentContainerStyle={styles.storyContainer}
                    keyboardDismissMode="interactive"
                >
                    {renderContent()}
                </ScrollView>
                
                {/* Input area with keyboard padding */}
                <View style={[styles.inputWrapper, { paddingBottom: keyboardHeight }]}>
                    {renderInputArea()}
                </View>
            </View>
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
        paddingHorizontal: 16,
        paddingVertical: 12, // Normal vertical padding
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
        fontSize: 20, 
        fontWeight: 'bold', 
        color: '#FFFFFF',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10,
    },
    storyScrollView: {
        flex: 1,
    },
    storyContainer: {
        flexGrow: 1,
        padding: 20,
        paddingBottom: 10,
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
        fontSize: 18,
        lineHeight: 28,
        marginBottom: 15,
    },
    newlyGeneratedText: {
        textDecorationLine: 'underline',
        textDecorationColor: '#c792ea',
        textDecorationStyle: 'solid',
    },
    boldText: {
        fontWeight: 'bold',
    },
    italicText: {
        fontStyle: 'italic',
    },
    inputWrapper: {
        backgroundColor: '#1e1e1e',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    inputAreaContainer: {
        paddingBottom: 10,
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
        paddingVertical: 12,
        fontSize: 16,
        marginRight: 10,
        minHeight: 50,
    },
    sendButton: {
        padding: 8,
    },
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 12,
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
