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

// --- FIX: Add a 'start' step for stories with no questions ---
type IntroStep = 'name' | 'gender' | 'age' | 'start';

export default function IntroScreen() {
    const { sessionId, story: storyString } = useLocalSearchParams<{ sessionId: string; story?: string }>();
    const router = useRouter();

    const [story, setStory] = useState<StoryDocument | null>(null);
    const [steps, setSteps] = useState<IntroStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [playerData, setPlayerData] = useState<PlayerData>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!storyString) {
            Alert.alert("Error", "Story data is missing.", [{ text: "OK", onPress: () => router.back() }]);
            return;
        }
        const parsedStory = JSON.parse(storyString) as StoryDocument;
        setStory(parsedStory);

        const requiredSteps: IntroStep[] = [];
        if (parsedStory.ask_user_name) requiredSteps.push('name');
        if (parsedStory.ask_user_gender) requiredSteps.push('gender');
        if (parsedStory.ask_user_age) requiredSteps.push('age');
        
        // --- FIX: Instead of redirecting, show a 'start' screen ---
        if(requiredSteps.length === 0) {
            // If no questions are needed, just show the start button.
            setSteps(['start']);
        } else {
            setSteps(requiredSteps);
        }
    }, [storyString]);

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
            // Only save if there's actually new data
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
        router.replace({
            pathname: `/play/${sessionId}`,
            params: { sessionId, story: storyString },
        });
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
            // --- FIX: Add the new 'start' step renderer ---
            case 'start':
                return <StartStep onComplete={() => finishIntro(playerData)} />;
            default:
                return null;
        }
    };
    
    // --- FIX: Logic to decide if the "Create Character" title should be shown ---
    const showCreateCharacterTitle = steps.length > 1 || (steps.length === 1 && steps[0] !== 'start');

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}>
                {/* --- FIX: Display Story Title and Description in Header --- */}
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
                <View style={styles.content}>
                    {/* --- FIX: Conditionally render the character creation title --- */}
                    {showCreateCharacterTitle && <Text style={styles.contentTitle}>Create Your Character</Text>}
                    {renderCurrentStep()}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// --- Step Components ---

// --- FIX: Add a new StartStep component ---
const StartStep = ({ onComplete }: { onComplete: () => void }) => (
    <View style={styles.stepContainer}>
        <Text style={styles.stepLabel}>Your adventure is ready to begin!</Text>
        <TouchableOpacity style={styles.button} onPress={onComplete}>
            <Text style={styles.buttonText}>Start Story</Text>
            <Feather name="play" size={20} color="#FFFFFF" style={{ marginLeft: 10 }} />
        </TouchableOpacity>
    </View>
);

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
    keyboardAvoidingView: {
        flex: 1,
    },
    header: {
        paddingVertical: 30,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
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
