import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { databaseId, databases, ID, storiesCollectionId, uploadImageFile } from '../lib/appwrite';
import { generateImageFromPrompt } from '../lib/gemini';
import { DEFAULT_AI_INSTRUCTIONS } from '../lib/quickstart';

// --- Components ---

type FormInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  height?: number;
  showDefaultButton?: boolean;
  onInsertDefault?: () => void;
};

// MODIFIED: FormInput component now automatically adjusts its height for multiline inputs.
const FormInput: React.FC<FormInputProps> = ({ label, value, onChangeText, placeholder, multiline = false, height = 40, showDefaultButton = false, onInsertDefault }) => {
  const [inputHeight, setInputHeight] = useState(height);

  return (
    <View style={styles.inputContainer}>
      <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {showDefaultButton && (
              <TouchableOpacity onPress={onInsertDefault} style={styles.defaultButton}>
                  <Text style={styles.defaultButtonText}>Insert Default</Text>
              </TouchableOpacity>
          )}
      </View>
      <TextInput
        style={[
            styles.input,
            multiline && {
                height: inputHeight,
                textAlignVertical: 'top'
            }
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#666"
        multiline={multiline}
        onContentSizeChange={(e) => {
            if (multiline) {
                // Set the height based on content, but not less than the initial height prop.
                setInputHeight(Math.max(height, e.nativeEvent.contentSize.height));
            }
        }}
      />
    </View>
  );
};

type ToggleSwitchProps = {
    label: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
};

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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Details');
  const [isLoading, setIsLoading] = useState(false);

  // State for Details Tab
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // State for Plot Tab
  const [opening, setOpening] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');
  const [storySummary, setStorySummary] = useState('');
  const [plotEssentials, setPlotEssentials] = useState('');
  const [askName, setAskName] = useState(false);
  const [askAge, setAskAge] = useState(false);
  const [askGender, setAskGender] = useState(false);

  const handleGenerateImage = async () => {
    if (!imagePrompt) {
        Alert.alert("Prompt missing", "Please enter a prompt for the image.");
        return;
    }
    setIsGeneratingImage(true);
    setGeneratedImage(null);
    try {
        const base64 = await generateImageFromPrompt(imagePrompt);
        if (base64) {
            setGeneratedImage(base64);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setIsGeneratingImage(false);
    }
  };

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

    try {
        let uploadedImageId: string | undefined = undefined;
        if (generatedImage) {
            console.log("Uploading generated image...");
            const fileName = `${title.replace(/\s+/g, '_')}_${Date.now()}.png`;
            uploadedImageId = await uploadImageFile(generatedImage, fileName);
            console.log("Image uploaded with ID:", uploadedImageId);
        }

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
            cover_image_id: uploadedImageId,
        };

        const newStoryDocument = await databases.createDocument(
            databaseId,
            storiesCollectionId,
            ID.unique(),
            storyData
        );
        
        Alert.alert("Success!", "Your story has been created.");
        
        router.replace({
            pathname: '/story-info/[id]',
            params: { id: newStoryDocument.$id }
        });

    } catch (error: any) {
        console.error("Failed to create story:", error);
        Alert.alert("Creation Failed", error.message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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
                        
                        <View style={styles.imageGenContainer}>
                            <Text style={styles.label}>Cover Image (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                value={imagePrompt}
                                onChangeText={setImagePrompt}
                                placeholder="e.g., A mystical amulet glowing in a dark cave"
                                placeholderTextColor="#666"
                            />
                            <TouchableOpacity 
                                style={[styles.generateButton, (!imagePrompt || isGeneratingImage) && styles.disabledButton]} 
                                onPress={handleGenerateImage}
                                disabled={!imagePrompt || isGeneratingImage}
                            >
                                {isGeneratingImage ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.generateButtonText}>Generate Image</Text>
                                )}
                            </TouchableOpacity>
                            {generatedImage && (
                                <View style={styles.imagePreviewContainer}>
                                    <Image 
                                        source={{ uri: `data:image/png;base64,${generatedImage}` }} 
                                        style={styles.imagePreview}
                                    />
                                </View>
                            )}
                        </View>

                    </View>
                ) : (
                    <View style={styles.formContainer}>
                        <FormInput label="Opening" value={opening} onChangeText={setOpening} placeholder="You find yourself in a dimly lit tavern..." multiline height={120} />
                        <FormInput
                            label="AI Instructions"
                            value={aiInstructions}
                            onChangeText={setAiInstructions}
                            placeholder="Generate responses in third-person. Avoid graphic violence."
                            multiline
                            height={120}
                            showDefaultButton={true}
                            onInsertDefault={() => setAiInstructions(DEFAULT_AI_INSTRUCTIONS)}
                        />
                        <FormInput label="Story Summary" value={storySummary} onChangeText={setStorySummary} placeholder="The main character is searching for a lost family heirloom." multiline height={120} />
                        <FormInput label="Plot Essentials (Memory)" value={plotEssentials} onChangeText={setPlotEssentials} placeholder="The king is secretly a vampire. The amulet glows near undead." multiline height={120} />
                        <ToggleSwitch label="Ask for User's Name" value={askName} onValueChange={setAskName} />
                        <ToggleSwitch label="Ask for User's Age" value={askAge} onValueChange={setAskAge} />
                        <ToggleSwitch label="Ask for User's Gender" value={askGender} onValueChange={setAskGender} />
                    </View>
                )}

                <TouchableOpacity style={styles.createButton} onPress={handleCreateStory} disabled={isLoading || isGeneratingImage}>
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
        </KeyboardAvoidingView>
    </SafeAreaView>
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
        paddingTop: 20,
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
    labelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        color: '#a9a9a9',
        fontSize: 14,
        marginBottom: 8,
    },
    defaultButton: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: '#333',
        borderRadius: 5,
    },
    defaultButtonText: {
        color: '#c792ea',
        fontSize: 12,
        fontWeight: '600',
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
    imageGenContainer: {
        marginTop: 10,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    generateButton: {
        backgroundColor: '#c792ea',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    generateButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    disabledButton: {
        backgroundColor: '#333',
    },
    imagePreviewContainer: {
        marginTop: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        padding: 10,
    },
    imagePreview: {
        width: 256,
        height: 256,
        borderRadius: 8,
    },
});
