import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveSessionPlayerData } from '../../lib/history';
import { PlayerData, StoryDocument } from '../types/story';

// --- FIX: Removed 'start' as it's no longer a step ---
type IntroStep = 'name' | 'gender' | 'age';
type ViewMode = 'details' | 'questions';

export default function IntroScreen() {
    const { sessionId, story: storyString } = useLocalSearchParams<{ sessionId: string; story?: string }>();
    const router = useRouter();

    const [story, setStory] = useState<StoryDocument | null>(null);
    const [steps, setSteps] = useState<IntroStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [playerData, setPlayerData] = useState<PlayerData>({});
    const [isLoading, setIsLoading] = useState(false);
    // --- FIX: Add view mode state to manage the screen's content ---
    const [viewMode, setViewMode] = useState<ViewMode>('details');

    useEffect(() => {
        if (!storyString || !sessionId) {
            Alert.alert("Error", "Story data is missing.", [{ text: "OK", onPress: () => router.back() }]);
            return;
        }
        const parsedStory = JSON.parse(storyString) as StoryDocument;
        setStory(parsedStory);

        const requiredSteps: IntroStep[] = [];
        if (parsedStory.ask_user_name) requiredSteps.push('name');
        if (parsedStory.ask_user_gender) requiredSteps.push('gender');
        if (parsedStory.ask_user_age) requiredSteps.push('age');
        
        setSteps(requiredSteps);
    }, [storyString, sessionId, router]);

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
        if (!sessionId) return;
        setIsLoading(true);
        try {
            if (Object.keys(finalPlayerData).length > 0) {
                await saveSessionPlayerData(sessionId, finalPlayerData);
            }
            proceedToGame();
        } catch (error) {
            Alert.alert("Error", "Could not save character details.");
            setIsLoading(false);
        }
    };

    const proceedToGame = () => {
        if (!sessionId) return;
        router.replace({
            pathname: '/play/[sessionId]',
            params: { sessionId: sessionId, story: storyString },
        });
    };

    const handlePrimaryButtonPress = () => {
        if (steps.length > 0) {
            setViewMode('questions');
        } else {
            finishIntro({});
        }
    };

    const renderCurrentStep = () => {
        if (isLoading || steps.length === 0) {
            return <ActivityIndicator size="large" color="#c792ea" />;
        }

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
            <View style={styles.header}>
                {story ? (
                    <>
                        <Text style={styles.storyTitle}>{story.title}</Text>
                        <Text style={styles.storyDescription}>{story.description || 'No description provided.'}</Text>
                    </>
                ) : (
                    <ActivityIndicator color="#c792ea" />
                )}
            </View>
            <View style={styles.footer}>
                <TouchableOpacity style={styles.button} onPress={handlePrimaryButtonPress}>
                    <Text style={styles.buttonText}>{steps.length > 0 ? 'Play' : 'Start Story'}</Text>
                    <Feather name={steps.length > 0 ? "user-plus" : "play"} size={20} color="#FFFFFF" style={{ marginLeft: 10 }} />
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
            <TextInput
                style={styles.input}
                placeholder="e.g., Alistair"
                placeholderTextColor="#666"
                value={name}
                onChangeText={setName}
            />
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
        <TouchableOpacity style={styles.button} onPress={() => onComplete('Male')}>
            <Text style={styles.buttonText}>Male</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => onComplete('Female')}>
            <Text style={styles.buttonText}>Female</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => onComplete('Non-binary')}>
            <Text style={styles.buttonText}>Non-binary</Text>
        </TouchableOpacity>
    </View>
);

const AgeStep = ({ onComplete }: { onComplete: (age: string) => void }) => {
    const [age, setAge] = useState('');
    return (
        <View style={styles.stepContainer}>
            <Text style={styles.stepLabel}>What is your character's age?</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g., 25"
                placeholderTextColor="#666"
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
            />
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
    header: {
        paddingHorizontal: 20,
        paddingTop: 30,
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        top: 30,
        zIndex: 1,
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
