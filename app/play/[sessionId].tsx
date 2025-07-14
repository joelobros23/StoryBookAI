import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    LayoutChangeEvent,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateStoryContinuation as generateAiResponse } from '../../lib/gemini';
import { getStorySession, saveStorySessionContent } from '../../lib/history';
import { PlayerData, StoryDocument, StoryEntry } from '../types/story';

type InputMode = 'Do' | 'Say' | 'Story';

const FormattedText = ({ text, style, isNew = false }: { text: string; style: any; isNew?: boolean }) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g).filter(Boolean);
    const textStyle = [style, isNew && styles.newlyGeneratedText];
    return (
        <Text style={textStyle}>
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) return <Text key={index} style={styles.boldText}>{part.slice(2, -2)}</Text>;
                if (part.startsWith('*') && part.endsWith('*')) return <Text key={index} style={styles.italicText}>{part.slice(1, -1)}</Text>;
                return part;
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
    const { sessionId, story: storyString } = useLocalSearchParams<{ sessionId: string; story?: string }>();
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [headerHeight, setHeaderHeight] = useState(0);
    const [story, setStory] = useState<StoryDocument | null>(null);
    const [storyContent, setStoryContent] = useState<StoryEntry[]>([]);
    const [playerData, setPlayerData] = useState<PlayerData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTakingTurn, setIsTakingTurn] = useState(false);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [inputMode, setInputMode] = useState<InputMode>('Do');
    const [isSelectingMode, setIsSelectingMode] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingEntry, setEditingEntry] = useState<{ index: number; text: string } | null>(null);
    
    const handleHeaderLayout = (event: LayoutChangeEvent) => {
        const { height } = event.nativeEvent.layout;
        setHeaderHeight(height);
    };

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    useEffect(() => {
        const loadStory = async () => {
            if (!sessionId) {
                setError("Session ID is missing.");
                setIsLoading(false);
                return;
            }
            if (!storyString) {
                setError("Story data is missing.");
                setIsLoading(false);
                return;
            }

            try {
                const storyData = JSON.parse(storyString) as StoryDocument;
                setStory(storyData);
                
                const savedSession = await getStorySession(sessionId);
                if (savedSession) {
                    // Ensure all entries have a unique ID
                    const contentWithIds = savedSession.content.map((entry, index) => ({ ...entry, id: entry.id || `${Date.now()}-${index}` }));
                    if (contentWithIds.length > 0) {
                        setStoryContent(contentWithIds);
                    } else if (storyData.opening) {
                        setStoryContent([{ id: Date.now().toString(), type: 'ai', text: storyData.opening, isNew: true }]);
                    }
                    if (savedSession.playerData) {
                        setPlayerData(savedSession.playerData);
                    }
                } else if (storyData.opening) {
                     setStoryContent([{ id: Date.now().toString(), type: 'ai', text: storyData.opening, isNew: true }]);
                }
            } catch (e) {
                console.error("Failed to load story session:", e);
                setError("Could not load the story session.");
            } finally {
                setIsLoading(false);
            }
        };
        loadStory();
    }, [sessionId, storyString]);
    
    useEffect(() => {
        if (storyContent.length > 0 && sessionId) {
            saveStorySessionContent(sessionId, storyContent);
            if (storyContent.length > 1) {
                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
            }
        }
    }, [storyContent, sessionId]);

    const handleGenerateStoryContinuation = async (currentHistory: StoryEntry[], action?: string) => {
        if (!story) return;
        setIsAiThinking(true);
        const aiText = await generateAiResponse(story, currentHistory, playerData || undefined, action);
        if (aiText) {
            setStoryContent(prev => {
                const oldContent = prev.map(entry => ({ ...entry, isNew: false }));
                const newEntry: StoryEntry = { id: Date.now().toString(), type: 'ai', text: aiText, isNew: true };
                return [...oldContent, newEntry];
            });
        }
        setIsAiThinking(false);
    };

    const handleSendInput = () => {
        if (userInput.trim() === '') return;
        let userTurnText = '';
        let actionForAI = '';
        switch (inputMode) {
            case 'Say': userTurnText = `You say, "${userInput.trim()}"`; actionForAI = `> You say, "${userInput.trim()}"`; break;
            case 'Story': userTurnText = userInput.trim(); actionForAI = userInput.trim(); break;
            default: userTurnText = `> ${userInput.trim()}`; actionForAI = `> You ${userInput.trim()}`; break;
        }
        const newUserEntry: StoryEntry = { id: Date.now().toString(), type: 'user', text: userTurnText };
        const newHistory = [...storyContent.map(entry => ({...entry, isNew: false })), newUserEntry];
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

    const handleUpdateEntry = () => {
        if (!editingEntry) return;

        const updatedContent = [...storyContent];
        updatedContent[editingEntry.index] = {
            ...updatedContent[editingEntry.index],
            text: editingEntry.text,
            isNew: false,
        };

        setStoryContent(updatedContent);
        setEditingEntry(null); // Close the modal
    };


    const renderContent = () => {
        if (isLoading) return <ActivityIndicator size="large" color="#c792ea" style={styles.centered} />;
        if (error) return <Text style={[styles.storyText, styles.centered, { color: '#ff6b6b' }]}>{error}</Text>;
        return (
            <>
                {storyContent.map((entry, index) => (
                     <Pressable key={entry.id} onLongPress={() => setEditingEntry({ index, text: entry.text })}>
                        <FormattedText text={entry.text} style={entry.type === 'user' ? styles.userText : styles.storyText} isNew={entry.isNew} />
                    </Pressable>
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
                                <TouchableOpacity onPress={() => setIsSelectingMode(false)} style={styles.modeButton}><Feather name="arrow-left" size={20} color="#e0e0e0" /></TouchableOpacity>
                                {(['Do', 'Say', 'Story'] as InputMode[]).map(mode => (
                                    <TouchableOpacity key={mode} onPress={() => { setInputMode(mode); setIsSelectingMode(false); }} style={styles.modeButton}><Text style={styles.modeButtonText}>{mode}</Text></TouchableOpacity>
                                ))}
                            </>
                        ) : (
                            <>
                                <TouchableOpacity onPress={() => setIsSelectingMode(true)} style={styles.modeButton}><Text style={styles.modeButtonText}>{inputMode}</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => { setIsTakingTurn(false); setIsSelectingMode(false); }} style={[styles.modeButton, { marginLeft: 'auto' }]}><Feather name="x" size={20} color="#e0e0e0" /></TouchableOpacity>
                            </>
                        )}
                    </View>
                    <View style={styles.textInputContainer}>
                        <TextInput style={styles.input} placeholder={`What do you ${inputMode.toLowerCase()}?`} placeholderTextColor="#888" value={userInput} onChangeText={setUserInput} autoFocus={true} editable={!isAiThinking} multiline />
                        <TouchableOpacity style={styles.sendButton} onPress={handleSendInput} disabled={isAiThinking || userInput.trim() === ''}><Feather name="send" size={24} color={isAiThinking || userInput.trim() === '' ? "#666" : "#c792ea"} /></TouchableOpacity>
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
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.header} onLayout={handleHeaderLayout}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} disabled={isAiThinking}><Feather name="chevron-left" size={28} color="#FFFFFF" /></TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{isLoading ? 'Loading...' : story?.title || 'Story'}</Text>
                <TouchableOpacity style={styles.settingsButton} disabled={isAiThinking}><Feather name="settings" size={24} color="#FFFFFF" /></TouchableOpacity>
            </View>
            <View style={styles.flexContainer}>
                <ScrollView ref={scrollViewRef} style={styles.storyScrollView} contentContainerStyle={styles.storyContainer} keyboardDismissMode="interactive">
                    {renderContent()}
                </ScrollView>
                <View style={[styles.inputWrapper, { paddingBottom: keyboardHeight }]}>{renderInputArea()}</View>
            </View>

            {editingEntry && (
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={editingEntry !== null}
                    onRequestClose={() => setEditingEntry(null)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalView}>
                            <Text style={styles.modalTitle}>Edit Entry</Text>
                            <TextInput
                                style={styles.editInput}
                                value={editingEntry.text}
                                onChangeText={(text) => setEditingEntry({ ...editingEntry, text })}
                                multiline
                                autoFocus
                            />
                            <View style={styles.modalButtonContainer}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setEditingEntry(null)}
                                >
                                    <Text style={styles.modalButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.saveButton]}
                                    onPress={handleUpdateEntry}
                                >
                                    <Text style={styles.modalButtonText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    flexContainer: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
    backButton: { padding: 5 },
    settingsButton: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', flex: 1, textAlign: 'center', marginHorizontal: 10 },
    storyScrollView: { flex: 1 },
    storyContainer: { flexGrow: 1, padding: 20, paddingBottom: 10 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    storyText: { color: '#e0e0e0', fontSize: 18, lineHeight: 28, marginBottom: 15 },
    userText: { color: '#c792ea', fontStyle: 'italic', fontWeight: 'bold', fontSize: 18, lineHeight: 28, marginBottom: 15 },
    newlyGeneratedText: { textDecorationLine: 'underline', textDecorationColor: '#c792ea', textDecorationStyle: 'solid' },
    boldText: { fontWeight: 'bold' },
    italicText: { fontStyle: 'italic' },
    inputWrapper: { backgroundColor: '#1e1e1e', borderTopWidth: 1, borderTopColor: '#333' },
    inputAreaContainer: { paddingBottom: 10 },
    modeSelectorBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: 8 },
    modeButton: { flexDirection: 'row', alignItems: 'center', padding: 5, marginRight: 10 },
    modeButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
    textInputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8 },
    input: { flex: 1, backgroundColor: '#2a2a2a', color: '#FFFFFF', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, marginRight: 10, minHeight: 50 },
    sendButton: { padding: 8 },
    actionBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 12 },
    actionButton: { alignItems: 'center', padding: 10, borderRadius: 8 },
    actionButtonText: { color: '#e0e0e0', fontSize: 12, marginTop: 4 },
    disabledButton: { opacity: 0.5 },
    // Modal Styles
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    modalView: {
        margin: 20,
        backgroundColor: '#1e1e1e',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
    },
    modalTitle: {
        marginBottom: 15,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    editInput: {
        width: '100%',
        minHeight: 100,
        maxHeight: 300,
        backgroundColor: '#2a2a2a',
        color: '#FFFFFF',
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButton: {
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 20,
        elevation: 2,
        flex: 1,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: '#c792ea',
    },
    cancelButton: {
        backgroundColor: '#333',
    },
    modalButtonText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 16,
    },
});
