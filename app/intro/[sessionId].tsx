import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../lib/appwrite';
// MODIFIED: Import getStoryImagePaths to reliably find the cover image
import { createNewSession, getStoryImagePaths, getStorySession, saveSessionPlayerData } from '../../lib/history';
import { PlayerData, StoryDocument, StorySession } from '../types/story';

type IntroStep = 'name' | 'gender' | 'age';
type ViewMode = 'details' | 'questions';

export default function IntroScreen() {
    const { sessionId, story: storyString } = useLocalSearchParams<{ sessionId: string; story?: string }>();
    const router = useRouter();
    const { user } = useAuth();

    const [story, setStory] = useState<StoryDocument | null>(null);
    const [session, setSession] = useState<StorySession | null>(null);
    const [steps, setSteps] = useState<IntroStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [playerData, setPlayerData] = useState<PlayerData>({});
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('details');
    const [creatorName, setCreatorName] = useState('');

    useEffect(() => {
        const loadStoryData = async () => {
            if (!storyString || !sessionId) {
                Alert.alert("Error", "Story data is missing.", [{ text: "OK", onPress: () => router.back() }]);
                return;
            }
            const parsedStory = JSON.parse(storyString) as StoryDocument;
            setStory(parsedStory);

            // --- MODIFIED: This logic now correctly finds the image path ---
            // 1. Directly get the reliable image path from our dedicated map.
            const imagePaths = await getStoryImagePaths();
            const reliableImagePath = imagePaths[parsedStory.$id];

            // 2. Try to find an actual session. This is for "Continue from History".
            const storySession = await getStorySession(sessionId);

            // 3. If a session exists, use it, but ensure its image path is up-to-date.
            if (storySession) {
                storySession.localCoverImagePath = reliableImagePath || storySession.localCoverImagePath;
                setSession(storySession);
            } else {
                // 4. If no session exists (e.g., starting from Creations), create a temporary
                // session object for rendering, using the reliable image path.
                setSession({
                    story: parsedStory,
                    sessionId: parsedStory.$id, // Use story ID as a placeholder
                    localCoverImagePath: reliableImagePath,
                    content: [],
                    sessionDate: new Date().toISOString(),
                    playerData: {},
                    isLocal: parsedStory.isLocal,
                });
            }
            // --- End of modification ---

            if (parsedStory.userId === user?.$id) {
                setCreatorName(user.name);
            } else {
                setCreatorName('A Storyteller');
            }

            const requiredSteps: IntroStep[] = [];
            if (parsedStory.ask_user_name) requiredSteps.push('name');
            if (parsedStory.ask_user_gender) requiredSteps.push('gender');
            if (parsedStory.ask_user_age) requiredSteps.push('age');
            
            setSteps(requiredSteps);
        };
        loadStoryData();
    }, [storyString, sessionId, router, user]);

    const handleNextStep = (data: Partial<PlayerData>) => {
        const newPlayerData = { ...playerData, ...data };
        setPlayerData(newPlayerData);

        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            finishIntro(newPlayerData);
        }
    };
    
    const finishIntro = async (finalPlayerData: PlayerData) => {
        if (!story) return;
        setIsLoading(true);
        try {
            const newSession = await createNewSession(story);
            if (Object.keys(finalPlayerData).length > 0) {
                await saveSessionPlayerData(newSession.sessionId, finalPlayerData);
            }
            router.replace({
                pathname: '/play/[sessionId]',
                params: { sessionId: newSession.sessionId, story: JSON.stringify(story) },
            });
        } catch (error) {
            Alert.alert("Error", "Could not create a new session.");
            setIsLoading(false);
        }
    };

    const handlePrimaryButtonPress = () => {
        if (steps.length > 0) {
            setViewMode('questions');
        } else {
            finishIntro({});
        }
    };

    const renderCurrentStep = () => {
        if (isLoading) {
            return <ActivityIndicator size="large" color="#c792ea" />;
        }
        if (steps.length === 0) return null;
        const currentStep = steps[currentStepIndex];
        switch (currentStep) {
            case 'name':
                return <NameStep onComplete={(name) => handleNextStep({ name })} />;
            case 'gender':
                return <GenderStep onComplete={(gender) => handleNextStep({ gender })} />;
            case 'age':
                return <AgeStep onComplete={(age) => handleNextStep({ age })} />;
            default:
                return null;
        }
    };
    
    const renderStoryDetails = () => (
        <View style={styles.viewContainer}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {story ? (
                    <>
                        {session?.localCoverImagePath ? (
                            <Image
                                source={{ uri: session.localCoverImagePath }}
                                style={styles.coverImage}
                                resizeMode="cover"
                            />
                        ) : story.cover_image_id ? (
                            <Image
                                source={{ uri: getImageUrl(story.cover_image_id) }}
                                style={styles.coverImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={[styles.coverImage, styles.placeholderImage]} >
                                <Feather name="image" size={50} color="#444" />
                            </View>
                        )}
                        <Text style={styles.storyTitle}>{story.title}</Text>
                        <Text style={styles.storyDescription}>{story.description || 'No description provided.'}</Text>
                        
                        <View style={styles.metaContainer}>
                            <View style={styles.metaItem}>
                                <Feather name="tag" size={16} color="#a9a9a9" />
                                <Text style={styles.metaText}>{story.tags || 'No genre'}</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Feather name="user" size={16} color="#a9a9a9" />
                                <Text style={styles.metaText}>{creatorName || 'Loading...'}</Text>
                            </View>
                        </View>
                    </>
                ) : (
                    <ActivityIndicator color="#c792ea" />
                )}
            </ScrollView>
            <View style={styles.footer}>
                <TouchableOpacity style={styles.button} onPress={handlePrimaryButtonPress} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color="#FFFFFF" /> : (
                        <>
                            <Text style={styles.buttonText}>{steps.length > 0 ? 'Play' : 'Start Story'}</Text>
                            <Feather name={steps.length > 0 ? "user-plus" : "play"} size={20} color="#FFFFFF" style={{ marginLeft: 10 }} />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderCharacterCreation = () => (
         <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.viewContainer}>
            <View style={styles.header}>
                 <TouchableOpacity onPress={() => setViewMode('details')} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.contentTitle}>Create Your Character</Text>
            </View>
            <View style={styles.content}>
                {renderCurrentStep()}
            </View>
        </KeyboardAvoidingView>
    );

    return (
        <SafeAreaView style={styles.container}>
           {viewMode === 'details' ? renderStoryDetails() : renderCharacterCreation()}
        </SafeAreaView>
    );
}

// --- Step Components ---
const NameStep = ({ onComplete }: { onComplete: (name: string) => void }) => {
    const [name, setName] = useState('');
    return (
        <View style={styles.stepContainer}>
            <Text style={styles.stepLabel}>What is your character's name?</Text>
            <TextInput style={styles.input} placeholder="e.g., Alistair" placeholderTextColor="#666" value={name} onChangeText={setName} />
            <TouchableOpacity style={[styles.button, !name && styles.disabledButton]} onPress={() => onComplete(name)} disabled={!name}>
                <Text style={styles.buttonText}>Next</Text>
                <Feather name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: 10 }} />
            </TouchableOpacity>
        </View>
    );
};
const GenderStep = ({ onComplete }: { onComplete: (gender: string) => void }) => (
    <View style={styles.stepContainer}>
        <Text style={styles.stepLabel}>What is your character's gender?</Text>
        <TouchableOpacity style={styles.button} onPress={() => onComplete('Male')}><Text style={styles.buttonText}>Male</Text></TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => onComplete('Female')}><Text style={styles.buttonText}>Female</Text></TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => onComplete('Non-binary')}><Text style={styles.buttonText}>Non-binary</Text></TouchableOpacity>
    </View>
);
const AgeStep = ({ onComplete }: { onComplete: (age: string) => void }) => {
    const [age, setAge] = useState('');
    return (
        <View style={styles.stepContainer}>
            <Text style={styles.stepLabel}>What is your character's age?</Text>
            <TextInput style={styles.input} placeholder="e.g., 25" placeholderTextColor="#666" value={age} onChangeText={setAge} keyboardType="number-pad" />
            <TouchableOpacity style={[styles.button, !age && styles.disabledButton]} onPress={() => onComplete(age)} disabled={!age}>
                <Text style={styles.buttonText}>Finish</Text>
                <Feather name="check" size={20} color="#FFFFFF" style={{ marginLeft: 10 }} />
            </TouchableOpacity>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    viewContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    scrollContent: {
        padding: 20,
        alignItems: 'center',
    },
    header: {
        width: '100%',
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        top: 10,
        zIndex: 1,
    },
    coverImage: {
        width: '100%',
        height: 250,
        borderRadius: 12,
        marginBottom: 20,
        backgroundColor: '#1e1e1e',
    },
    placeholderImage: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    storyTitle: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    storyDescription: {
        color: '#a9a9a9',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    metaContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: 10,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#2a2a2a',
        width: '100%',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 15,
    },
    metaText: {
        color: '#a9a9a9',
        fontSize: 14,
        marginLeft: 8,
        textTransform: 'capitalize',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    contentTitle: {
        color: '#e0e0e0',
        fontSize: 22,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 30,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderColor: '#1e1e1e',
    },
    stepContainer: {
        alignItems: 'center',
        width: '100%',
    },
    stepLabel: {
        color: '#e0e0e0',
        fontSize: 20,
        textAlign: 'center',
        marginBottom: 30,
    },
    input: {
        backgroundColor: '#2a2a2a',
        color: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 10,
        fontSize: 18,
        borderWidth: 1,
        borderColor: '#333',
        width: '100%',
        textAlign: 'center',
        marginBottom: 20,
    },
    button: {
        flexDirection: 'row',
        backgroundColor: '#6200ee',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: 10,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    disabledButton: {
        backgroundColor: '#333',
    },
});
