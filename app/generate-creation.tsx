import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { handleSimplifiedCreation } from '../lib/generation';
import { PlayerData } from './types/story';

type MainCharacterChoice = 'yes' | 'no' | null;

export default function GenerateCreationScreen() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isMainCharacter, setIsMainCharacter] = useState<MainCharacterChoice>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [playerData, setPlayerData] = useState<PlayerData | undefined>(undefined);
    const [characterModalVisible, setCharacterModalVisible] = useState(false);

    const { user } = useAuth();
    const router = useRouter();

    const handleCreate = async () => {
        if (!title.trim() || !description.trim() || !isMainCharacter) {
            Alert.alert('Missing Information', 'Please fill out all fields before creating the story.');
            return;
        }
        if (!user) {
            Alert.alert('Authentication Error', 'You must be logged in to create a story.');
            return;
        }

        if (isMainCharacter === 'yes' && !playerData) {
            setCharacterModalVisible(true);
            return;
        }

        setIsGenerating(true);
        await handleSimplifiedCreation(
            title,
            description,
            isMainCharacter === 'yes',
            user,
            router,
            playerData
        );
        setIsGenerating(false);
    };
    
    const onCharacterComplete = (data: PlayerData) => {
        setPlayerData(data);
        setCharacterModalVisible(false);
        // We need to trigger handleCreate again now that we have player data
        // Using a timeout to allow the modal to close before starting generation
        setTimeout(() => {
            handleSimplifiedCreation(title, description, true, user!, router, data).finally(() => setIsGenerating(false));
        }, 100);
    };


    const renderDropdown = () => (
        <Modal
            transparent={true}
            visible={dropdownVisible}
            onRequestClose={() => setDropdownVisible(false)}
        >
            <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.dropdown}>
                        <TouchableOpacity style={styles.dropdownOption} onPress={() => { setIsMainCharacter('yes'); setDropdownVisible(false); }}>
                            <Text style={styles.dropdownOptionText}>Yes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.dropdownOption} onPress={() => { setIsMainCharacter('no'); setDropdownVisible(false); setPlayerData(undefined); }}>
                            <Text style={styles.dropdownOptionText}>No</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Feather name="arrow-left" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Simplified Creation</Text>
                    </View>

                    <Text style={styles.label}>Story Title</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="e.g., The Last Dragon of Eldoria"
                        placeholderTextColor="#666"
                    />

                    <Text style={styles.label}>Describe your story</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="A young knight discovers a hidden dragon egg, and must protect it from a ruthless king..."
                        placeholderTextColor="#666"
                        multiline
                    />

                    <Text style={styles.label}>Are you the Main Character?</Text>
                    <TouchableOpacity style={styles.dropdownButton} onPress={() => setDropdownVisible(true)}>
                        <Text style={styles.dropdownButtonText}>
                            {isMainCharacter === null ? 'Select an option' : isMainCharacter === 'yes' ? 'Yes' : 'No'}
                        </Text>
                        <Feather name="chevron-down" size={20} color="#FFFFFF" />
                    </TouchableOpacity>

                    {renderDropdown()}

                    <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
                        <Text style={styles.createButtonText}>Create Story</Text>
                        <Feather name="edit-3" size={20} color="#FFFFFF" style={{ marginLeft: 10 }} />
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
            
            <CharacterCreationModal visible={characterModalVisible} onClose={() => setCharacterModalVisible(false)} onComplete={onCharacterComplete} />

            {isGenerating && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.loadingText}>Crafting your world...</Text>
                </View>
            )}
        </SafeAreaView>
    );
}


// --- Character Creation Modal (Copied from _layout.tsx for this screen) ---
type CharacterCreationModalProps = {
    visible: boolean;
    onClose: () => void;
    onComplete: (playerData: PlayerData) => void;
};

const CharacterCreationModal = ({ visible, onClose, onComplete }: CharacterCreationModalProps) => {
    const [step, setStep] = useState(0);
    const [playerData, setPlayerData] = useState<PlayerData>({});

    const handleNext = (data: Partial<PlayerData>) => {
        const newPlayerData = { ...playerData, ...data };
        setPlayerData(newPlayerData);
        if (step < 2) {
            setStep(step + 1);
        } else {
            onComplete(newPlayerData);
        }
    };

    const reset = () => {
        setStep(0);
        setPlayerData({});
        onClose();
    };

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={reset}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: 30 }]}>
                        {step === 0 && <NameStep onComplete={(name) => handleNext({ name })} />}
                        {step === 1 && <GenderStep onComplete={(gender) => handleNext({ gender })} />}
                        {step === 2 && <AgeStep onComplete={(age) => handleNext({ age })} />}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const NameStep = ({ onComplete }: { onComplete: (name: string) => void }) => {
    const [name, setName] = useState('');
    return (
        <View style={styles.stepContainer}>
            <Text style={styles.modalTitle}>Character's Name?</Text>
            <TextInput style={styles.input} placeholder="e.g., Alistair" placeholderTextColor="#666" value={name} onChangeText={setName} />
            <TouchableOpacity style={[styles.modalButton, !name && styles.disabledButton]} onPress={() => onComplete(name)} disabled={!name}>
                <Text style={styles.modalButtonText}>Next</Text>
            </TouchableOpacity>
        </View>
    );
};
const GenderStep = ({ onComplete }: { onComplete: (gender: string) => void }) => (
    <View style={styles.stepContainer}>
        <Text style={styles.modalTitle}>Character's Gender?</Text>
        <TouchableOpacity style={styles.modalButton} onPress={() => onComplete('Male')}><Text style={styles.modalButtonText}>Male</Text></TouchableOpacity>
        <TouchableOpacity style={styles.modalButton} onPress={() => onComplete('Female')}><Text style={styles.modalButtonText}>Female</Text></TouchableOpacity>
        <TouchableOpacity style={styles.modalButton} onPress={() => onComplete('Non-binary')}><Text style={styles.modalButtonText}>Non-binary</Text></TouchableOpacity>
    </View>
);
const AgeStep = ({ onComplete }: { onComplete: (age: string) => void }) => {
    const [age, setAge] = useState('');
    return (
        <View style={styles.stepContainer}>
            <Text style={styles.modalTitle}>Character's Age?</Text>
            <TextInput style={styles.input} placeholder="e.g., 25" placeholderTextColor="#666" value={age} onChangeText={setAge} keyboardType="number-pad" />
            <TouchableOpacity style={[styles.modalButton, !age && styles.disabledButton]} onPress={() => onComplete(age)} disabled={!age}>
                <Text style={styles.modalButtonText}>Generate Story</Text>
            </TouchableOpacity>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    scrollContent: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
    },
    backButton: {
        position: 'absolute',
        left: 0,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    label: {
        color: '#a9a9a9',
        fontSize: 16,
        marginBottom: 10,
        marginLeft: 5,
    },
    input: {
        backgroundColor: '#1e1e1e',
        color: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 10,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 25,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    dropdownButton: {
        backgroundColor: '#1e1e1e',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#333',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    dropdown: {
        backgroundColor: '#2a2a2a',
        borderRadius: 10,
        width: '80%',
    },
    dropdownOption: {
        padding: 20,
        alignItems: 'center',
    },
    dropdownOptionText: {
        color: '#FFFFFF',
        fontSize: 18,
    },
    createButton: {
        flexDirection: 'row',
        backgroundColor: '#6200ee',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#FFFFFF',
        marginTop: 15,
        fontSize: 16,
    },
    // Styles for the new character creation modal
    modalContent: {
        backgroundColor: '#2a2a2a',
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderRadius: 20,
        width: '90%',
        alignItems: 'stretch',
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    stepContainer: {
        alignItems: 'center',
        width: '100%',
    },
    modalButton: {
        backgroundColor: '#6200ee',
        paddingVertical: 15,
        borderRadius: 25,
        alignItems: 'center',
        width: '100%',
        marginTop: 10,
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledButton: {
        backgroundColor: '#333',
    },
});
