import { Feather } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { handleQuickStart } from '../../lib/quickstart';
import { PlayerData } from '../types/story';

// --- Genre Selection Modal ---
const GENRES = ["Adventure", "Horror", "Modern Day Drama", "Medieval Drama", "Action", "Sci-fi", "Fairy Tale", "Romance"];

type QuickStartModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectGenre: (genre: string) => void;
};

const QuickStartModal = ({ visible, onClose, onSelectGenre }: QuickStartModalProps) => (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Choose a Genre</Text>
                        <FlatList
                            data={GENRES}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalOption} onPress={() => onSelectGenre(item)}>
                                    <Text style={styles.modalOptionText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                        />
                    </View>
                </TouchableWithoutFeedback>
            </View>
        </TouchableWithoutFeedback>
    </Modal>
);

// --- NEW: Character Creation Modal ---
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

// --- Step Components (for the new modal) ---
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

// --- Main Play Button Modal ---
type PlayButtonModalProps = {
  visible: boolean;
  onClose: () => void;
  onQuickStart: () => void;
};

const PlayButtonModal = ({ visible, onClose, onQuickStart }: PlayButtonModalProps) => {
  const router = useRouter();
  const handleNavigate = (path: '/create-story' | '/tabs/profile') => {
    router.push(path);
    onClose();
  };
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.modalOption} onPress={onQuickStart}>
                <Feather name="zap" size={24} color="#FFFFFF" />
                <Text style={styles.modalOptionText}>Quick Start</Text>
              </TouchableOpacity>
              <View style={styles.separator} />
              <TouchableOpacity style={styles.modalOption} onPress={() => handleNavigate('/create-story')}>
                <Feather name="plus-circle" size={24} color="#FFFFFF" />
                <Text style={styles.modalOptionText}>Create Story</Text>
              </TouchableOpacity>
              <View style={styles.separator} />
              <TouchableOpacity style={styles.modalOption} onPress={() => handleNavigate('/tabs/profile')}>
                <Feather name="book" size={24} color="#FFFFFF" />
                <Text style={styles.modalOptionText}>Creations & History</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// --- Main Tabs Layout ---
export default function TabsLayout() {
  const [playModalVisible, setPlayModalVisible] = useState(false);
  const [quickStartModalVisible, setQuickStartModalVisible] = useState(false);
  const [characterModalVisible, setCharacterModalVisible] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const openQuickStart = () => {
    setPlayModalVisible(false);
    setQuickStartModalVisible(true);
  };

  const onGenreSelect = (genre: string) => {
    setQuickStartModalVisible(false);
    setSelectedGenre(genre);
    setCharacterModalVisible(true);
  };

  const onCharacterComplete = async (playerData: PlayerData) => {
    setCharacterModalVisible(false);
    if (!user || !selectedGenre) return;

    let tag = selectedGenre;
    if (selectedGenre === "Modern Day Drama") tag = "Drama, 21st Century";
    if (selectedGenre === "Medieval Drama") tag = "Drama, Medieval Times";
    if (selectedGenre === "Romance") tag = "Romance, Drama";

    setIsGenerating(true);
    await handleQuickStart(selectedGenre, tag, playerData, user, router);
    setIsGenerating(false);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#c792ea',
          tabBarInactiveTintColor: '#a9a9a9',
          tabBarStyle: { backgroundColor: '#1e1e1e', borderTopWidth: 0, height: 90, paddingBottom: 10 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Feather name="home" size={28} color={color} /> }} />
        <Tabs.Screen
          name="play"
          options={{ title: 'Play', tabBarIcon: ({ color }) => <Feather name="play" size={28} color={color} /> }}
          listeners={{ tabPress: (e) => { e.preventDefault(); setPlayModalVisible(true); } }}
        />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Feather name="user" size={28} color={color} /> }} />
      </Tabs>
      
      <PlayButtonModal visible={playModalVisible} onClose={() => setPlayModalVisible(false)} onQuickStart={openQuickStart} />
      <QuickStartModal visible={quickStartModalVisible} onClose={() => setQuickStartModalVisible(false)} onSelectGenre={onGenreSelect} />
      <CharacterCreationModal visible={characterModalVisible} onClose={() => setCharacterModalVisible(false)} onComplete={onCharacterComplete} />

      {isGenerating && (
        <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Generating your adventure...</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    modalContent: {
        backgroundColor: '#2a2a2a',
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        alignItems: 'stretch',
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
    },
    modalOptionText: {
        color: '#FFFFFF',
        fontSize: 18,
        marginLeft: 20,
        fontWeight: '600',
    },
    separator: {
      height: 1,
      backgroundColor: '#444',
      width: '100%',
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
    stepContainer: {
        alignItems: 'center',
        width: '100%',
    },
    input: {
        backgroundColor: '#1e1e1e',
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
