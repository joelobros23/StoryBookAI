import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StoryDocument } from '../types/story';

// --- Reusable Form Component ---
// Note: This is copied from create-story.tsx for simplicity.
// In a larger app, you might move this to a shared file.
type FormInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  height?: number;
};

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

// --- Main Modal Component ---

type StorySettingsModalProps = {
    isVisible: boolean;
    onClose: () => void;
    onSave: (updatedStory: StoryDocument) => void;
    story: StoryDocument | null;
};

export default function StorySettingsModal({ isVisible, onClose, onSave, story }: StorySettingsModalProps) {
    const [activeTab, setActiveTab] = useState('Plot');

    // State for form fields, initialized from the story prop
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [opening, setOpening] = useState('');
    const [aiInstructions, setAiInstructions] = useState('');
    const [storySummary, setStorySummary] = useState('');
    const [plotEssentials, setPlotEssentials] = useState('');

    // When the story prop changes (i.e., when the modal is opened),
    // populate the form fields with the current story data.
    useEffect(() => {
        if (story) {
            setTitle(story.title || '');
            setDescription(story.description || '');
            setTags(story.tags || '');
            setOpening(story.opening || '');
            setAiInstructions(story.ai_instruction || '');
            setStorySummary(story.story_summary || '');
            setPlotEssentials(story.plot_essentials || '');
        }
    }, [story]);

    const handleSaveChanges = () => {
        if (!story) return;

        if (!title) {
            Alert.alert("Error", "Title cannot be empty.");
            return;
        }

        // Construct the updated story object
        const updatedStory: StoryDocument = {
            ...story,
            title,
            description,
            tags,
            opening,
            ai_instruction: aiInstructions,
            story_summary: storySummary,
            plot_essentials: plotEssentials,
        };

        // Call the onSave prop function passed from the parent (PlayStoryScreen)
        onSave(updatedStory);
    };

    if (!story) {
        return null; // Don't render anything if there's no story data
    }

    return (
        <Modal
            animationType="slide"
            transparent={false}
            visible={isVisible}
            onRequestClose={onClose}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Feather name="x" size={28} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Edit Story Details</Text>
                    </View>

                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'Plot' && styles.activeTab]}
                            onPress={() => setActiveTab('Plot')}>
                            <Text style={styles.tabText}>Plot & Memory</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'Details' && styles.activeTab]}
                            onPress={() => setActiveTab('Details')}>
                            <Text style={styles.tabText}>Other Details</Text>
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
                            <FormInput label="Opening Scene" value={opening} onChangeText={setOpening} placeholder="You find yourself in a dimly lit tavern..." multiline height={120} />
                            <FormInput
                                label="AI Instructions"
                                value={aiInstructions}
                                onChangeText={setAiInstructions}
                                placeholder="Generate responses in third-person. Avoid graphic violence."
                                multiline
                                height={120}
                            />
                            <FormInput label="Story Summary" value={storySummary} onChangeText={setStorySummary} placeholder="The main character is searching for a lost family heirloom." multiline height={120} />
                            <FormInput label="Plot Essentials (Memory)" value={plotEssentials} onChangeText={setPlotEssentials} placeholder="The king is secretly a vampire. The amulet glows near undead." multiline height={120} />
                        </View>
                    )}

                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                        <Feather name="check" size={20} color="#FFFFFF" style={{ marginLeft: 10 }} />
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#121212',
    },
    container: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingTop: 10,
    },
    closeButton: {
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
        paddingVertical: 10,
        borderRadius: 8,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    saveButton: {
        flexDirection: 'row',
        backgroundColor: '#6200ee',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
