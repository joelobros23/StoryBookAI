import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { databaseId, databases, ID, storiesCollectionId } from '../lib/appwrite';
import { addStoryToHistory } from '../lib/history';
import { StoryDocument } from './types/story'; // Import the shared StoryDocument type

// Define prop types for FormInput
type FormInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  height?: number;
};

// Custom component for input fields to reduce repetition
const FormInput: React.FC<FormInputProps> = ({ label, value, onChangeText, placeholder, multiline = false, height = 40 }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && { height, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#666"
      multiline={multiline}
    />
  </View>
);

// Define prop types for ToggleSwitch
type ToggleSwitchProps = {
    label: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
};

// Custom component for toggle switches
const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, value, onValueChange }) => (
    <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Switch
            trackColor={{ false: "#3e3e3e", true: "#81b0ff" }}
            thumbColor={value ? "#f4f3f4" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={onValueChange}
            value={value}
        />
    </View>
);


export default function CreateStoryScreen() {
  const router = useRouter();
  const { user } = useAuth(); // Get the authenticated user
  const [activeTab, setActiveTab] = useState('Details');
  const [isLoading, setIsLoading] = useState(false);

  // State for Details Tab
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  // State for Plot Tab
  const [opening, setOpening] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');
  const [storySummary, setStorySummary] = useState('');
  const [plotEssentials, setPlotEssentials] = useState('');
  const [askName, setAskName] = useState(false);
  const [askAge, setAskAge] = useState(false);
  const [askGender, setAskGender] = useState(false);

  const handleCreateStory = async () => {
    if (!user) {
        Alert.alert("Error", "You must be logged in to create a story.");
        return;
    }

    if (!title) {
        Alert.alert("Error", "Please provide a title for your story.");
        return;
    }

    setIsLoading(true);

    const storyData = {
        title,
        description,
        tags,
        opening,
        ai_instruction: aiInstructions,
        story_summary: storySummary,
        plot_essentials: plotEssentials,
        ask_user_name: askName,
        ask_user_age: askAge,
        ask_user_gender: askGender,
        userId: user.$id,
    };

    try {
        const newStoryDocument = await databases.createDocument(
            databaseId,
            storiesCollectionId,
            ID.unique(),
            storyData
        );
        
        // Use the correct, full type for the history function
        await addStoryToHistory(newStoryDocument as StoryDocument);

        Alert.alert("Success!", "Your story has been created.");
        
        // Use the correct object syntax for typed routes
        router.push({
            pathname: '/play/[id]',
            params: { id: newStoryDocument.$id, story: JSON.stringify(newStoryDocument) }
        });

    } catch (error: any) {
        console.error("Failed to create story:", error);
        Alert.alert("Creation Failed", error.message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <View style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} disabled={isLoading}>
                    <Feather name="chevron-left" size={28} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Your Story</Text>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Details' && styles.activeTab]}
                    onPress={() => setActiveTab('Details')}>
                    <Text style={styles.tabText}>Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Plot' && styles.activeTab]}
                    onPress={() => setActiveTab('Plot')}>
                    <Text style={styles.tabText}>Plot</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'Details' ? (
                <View style={styles.formContainer}>
                    <FormInput label="Title" value={title} onChangeText={setTitle} placeholder="The Lost Amulet of Gorgon" />
                    <FormInput label="Description" value={description} onChangeText={setDescription} placeholder="A short summary about your story's theme and setting." multiline height={120} />
                    <FormInput label="Tags" value={tags} onChangeText={setTags} placeholder="fantasy, magic, adventure" />
                </View>
            ) : (
                <View style={styles.formContainer}>
                    <FormInput label="Opening" value={opening} onChangeText={setOpening} placeholder="You find yourself in a dimly lit tavern..." multiline height={120} />
                    <FormInput label="AI Instructions" value={aiInstructions} onChangeText={setAiInstructions} placeholder="Generate responses in third-person. Avoid graphic violence." multiline height={120} />
                    <FormInput label="Story Summary" value={storySummary} onChangeText={setStorySummary} placeholder="The main character is searching for a lost family heirloom." multiline height={120} />
                    <FormInput label="Plot Essentials (Memory)" value={plotEssentials} onChangeText={setPlotEssentials} placeholder="The king is secretly a vampire. The amulet glows near undead." multiline height={120} />
                    <ToggleSwitch label="Ask for User's Name" value={askName} onValueChange={setAskName} />
                    <ToggleSwitch label="Ask for User's Age" value={askAge} onValueChange={setAskAge} />
                    <ToggleSwitch label="Ask for User's Gender" value={askGender} onValueChange={setAskGender} />
                </View>
            )}

            <TouchableOpacity style={styles.createButton} onPress={handleCreateStory} disabled={isLoading}>
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <>
                        <Text style={styles.createButtonText}>Create</Text>
                        <Feather name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: 10 }} />
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#121212',
        paddingTop: 40,
    },
    container: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#1e1e1e',
        borderRadius: 10,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: '#c792ea',
    },
    tabText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    formContainer: {
        backgroundColor: '#1e1e1e',
        borderRadius: 15,
        padding: 20,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        color: '#a9a9a9',
        fontSize: 14,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#2a2a2a',
        color: '#FFFFFF',
        paddingHorizontal: 15,
        borderRadius: 8,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    toggleLabel: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    createButton: {
        flexDirection: 'row',
        backgroundColor: '#6200ee',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30,
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
