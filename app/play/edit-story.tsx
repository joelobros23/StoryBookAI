import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStorySession, saveSessionPlayerData, updateStoryInSession } from '../../lib/history';
import { DEFAULT_AI_INSTRUCTIONS } from '../../lib/quickstart';
import { PlayerData, StoryDocument } from '../types/story';

// Styles moved above components that use them
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  formContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#c792ea',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
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
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#6200ee',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
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
});

// Reuse the FormInput component from create-story.tsx
type FormInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  height?: number;
  showDefaultButton?: boolean;
  onInsertDefault?: () => void;
  editable?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad'; // Add this
};
const FormInput: React.FC<FormInputProps> = ({ label, value, onChangeText, placeholder, multiline = false, height = 40, showDefaultButton = false, onInsertDefault, editable = true }) => (
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
      style={[styles.input, multiline && { height, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#666"
      multiline={multiline}
      editable={editable}
    />
  </View>
);

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

export default function EditStoryScreen() {
    const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const router = useRouter();
  const { sessionId, story: storyString } = useLocalSearchParams<{ sessionId: string; story?: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'Details' | 'Plot'>('Details');
  // Parse story data
  const initialStory = storyString ? JSON.parse(storyString) as StoryDocument : null;
  
  // State for form fields
  const [title, setTitle] = useState(initialStory?.title || '');
  const [description, setDescription] = useState(initialStory?.description || '');
  const [tags, setTags] = useState(initialStory?.tags || '');
  const [aiInstructions, setAiInstructions] = useState(initialStory?.ai_instruction || '');
  const [storySummary, setStorySummary] = useState(initialStory?.story_summary || '');
  const [plotEssentials, setPlotEssentials] = useState(initialStory?.plot_essentials || '');
  const [askName, setAskName] = useState(initialStory?.ask_user_name || false);
  const [askAge, setAskAge] = useState(initialStory?.ask_user_age || false);
  const [askGender, setAskGender] = useState(initialStory?.ask_user_gender || false);
  const [playerName, setPlayerName] = useState('');
  const [playerAge, setPlayerAge] = useState('');
  const [playerGender, setPlayerGender] = useState('');

useEffect(() => {
    const fetchPlayerData = async () => {
      if (!sessionId) return;
      
      try {
        const session = await getStorySession(sessionId);
        if (session?.playerData) {
          setPlayerName(session.playerData.name || '');
          setPlayerAge(session.playerData.age || '');
          setPlayerGender(session.playerData.gender || '');
        }
      } catch (error) {
        console.error("Failed to load player data:", error);
      }
    };
    
    fetchPlayerData();
  }, [sessionId]);


  const handleSave = async () => {
    if (!sessionId || !initialStory) return;

    setIsLoading(true);

    const updatedStory: StoryDocument = {
      ...initialStory,
      title,
      description,
      tags,
      ai_instruction: aiInstructions,
      story_summary: storySummary,
      plot_essentials: plotEssentials,
      ask_user_name: askName,
      ask_user_age: askAge,
      ask_user_gender: askGender
    };

    try {
      // Update player data
      const updatedPlayerData: PlayerData = {
        name: playerName,
        age: playerAge,
        gender: playerGender
      };
      
      // Save both story and player data
      await updateStoryInSession(sessionId, updatedStory);
      await saveSessionPlayerData(sessionId, updatedPlayerData);
      
      Alert.alert("Success", "Story settings and player data updated!");
      router.back();
    } catch (error) {
      console.error("Failed to update:", error);
      Alert.alert("Error", "Could not update settings");
    } finally {
      setIsLoading(false);
    }
  };

  if (!initialStory) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Story data not found</Text>
      </View>
    );
  }

 return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Story</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.container}>
        {/* Add tab navigation */}
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

        {/* Conditional rendering based on active tab */}
        {activeTab === 'Details' ? (
          <View style={styles.formContainer}>
            <FormInput label="Title" value={title} onChangeText={setTitle} placeholder="Story title" />
            <FormInput label="Description" value={description} onChangeText={setDescription} placeholder="Story description" multiline height={100} />
            <FormInput label="Tags" value={tags} onChangeText={setTags} placeholder="Comma separated tags" />
            
            {/* Player Information Section */}
            <Text style={styles.sectionTitle}>Player Information</Text>

     {askName && (
      <FormInput 
        label="Player Name" 
        value={playerName} 
        onChangeText={setPlayerName}
        placeholder="Enter player name"
      />
    )}

    {askAge && (
      <FormInput 
        label="Player Age" 
        value={playerAge} 
        onChangeText={setPlayerAge}
        placeholder="Enter player age"
        keyboardType="numeric"
      />
    )}

    {askGender && (
      <FormInput 
        label="Player Gender" 
        value={playerGender} 
        onChangeText={setPlayerGender}
        placeholder="Enter player gender"
      />
    )}

            <ToggleSwitch 
              label="Ask for User's Name" 
              value={askName} 
              onValueChange={setAskName} 
            />
            <ToggleSwitch 
              label="Ask for User's Age" 
              value={askAge} 
              onValueChange={setAskAge} 
            />
            <ToggleSwitch 
              label="Ask for User's Gender" 
              value={askGender} 
              onValueChange={setAskGender} 
            />
          </View>
        ) : (
          <View style={styles.formContainer}>
            <FormInput 
              label="AI Instructions" 
              value={aiInstructions} 
              onChangeText={setAiInstructions} 
              placeholder="AI behavior instructions" 
              multiline 
              height={120}
              showDefaultButton={true}
              onInsertDefault={() => setAiInstructions(DEFAULT_AI_INSTRUCTIONS)}
            />
            <FormInput label="Story Summary" value={storySummary} onChangeText={setStorySummary} placeholder="Main story summary" multiline height={100} />
            <FormInput label="Plot Essentials" value={plotEssentials} onChangeText={setPlotEssentials} placeholder="Key plot points" multiline height={100} />
          </View>
        )}

        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave} 
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.saveButtonText}>Save Changes</Text>
              <Feather name="save" size={20} color="#FFFFFF" style={{ marginLeft: 10 }} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}