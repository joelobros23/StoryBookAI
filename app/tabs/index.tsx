import { Feather } from '@expo/vector-icons';
import { Query } from 'appwrite';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useAuth } from '../../context/AuthContext'; // Assuming AuthContext is available
import { databaseId, databases, storiesCollectionId } from '../../lib/appwrite';
import { handleQuickStart } from '../../lib/quickstart'; // Assuming quickstart.ts exists and has this function
import { StoryDocument } from '../types/story';

// --- Genre Selection Modal ---
const GENRES = ["Adventure", "Horror", "Modern Day Drama", "Medieval Drama", "Action", "Sci-fi", "Fairy Tale"];

type QuickStartModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectGenre: (genre: string) => void;
};

const QuickStartModal = ({ visible, onClose, onSelectGenre }: QuickStartModalProps) => (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
            <View style={modalStyles.modalOverlay}>
                <TouchableWithoutFeedback>
                    <View style={modalStyles.modalContent}>
                        <Text style={modalStyles.modalTitle}>Choose a Genre</Text>
                        <FlatList
                            data={GENRES}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={modalStyles.modalOption} onPress={() => onSelectGenre(item)}>
                                    <Text style={modalStyles.modalOptionText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                            ItemSeparatorComponent={() => <View style={modalStyles.separator} />}
                        />
                    </View>
                </TouchableWithoutFeedback>
            </View>
        </TouchableWithoutFeedback>
    </Modal>
);

// --- Main Play Button Modal ---
type PlayButtonModalProps = {
  visible: boolean;
  onClose: () => void;
  onQuickStart: () => void;
};

const PlayButtonModal = ({ visible, onClose, onQuickStart }: PlayButtonModalProps) => {
  const router = useRouter();
  const handleNavigate = (path: '/create-story' | '/tabs/profile') => {
    onClose();
    router.push(path);
  };
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={modalStyles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={modalStyles.modalContent}>
              <TouchableOpacity style={modalStyles.modalOption} onPress={onQuickStart}>
                <Feather name="zap" size={24} color="#FFFFFF" />
                <Text style={modalStyles.modalOptionText}>Quick Start</Text>
              </TouchableOpacity>
              <View style={modalStyles.separator} />
              <TouchableOpacity style={modalStyles.modalOption} onPress={() => handleNavigate('/create-story')}>
                <Feather name="plus-circle" size={24} color="#FFFFFF" />
                <Text style={modalStyles.modalOptionText}>Create Story</Text>
              </TouchableOpacity>
              <View style={modalStyles.separator} />
              <TouchableOpacity style={modalStyles.modalOption} onPress={() => handleNavigate('/tabs/profile')}>
                <Feather name="book" size={24} color="#FFFFFF" />
                <Text style={modalStyles.modalOptionText}>Creations & History</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};


export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth(); // Get user from AuthContext
  const [allStories, setAllStories] = useState<StoryDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playModalVisible, setPlayModalVisible] = useState(false); // State for the main play modal
  const [quickStartModalVisible, setQuickStartModalVisible] = useState(false); // State for genre selection modal
  const [isGenerating, setIsGenerating] = useState(false); // State for loading indicator

  useEffect(() => {
    const fetchAllStories = async () => {
      setIsLoading(true);
      try {
        const response = await databases.listDocuments(
          databaseId,
          storiesCollectionId,
          [Query.orderDesc('$createdAt')]
        );
        setAllStories(response.documents as StoryDocument[]);
      } catch (error) {
        console.error("Failed to fetch all stories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllStories();
  }, []);

  // This function is called when the "Start New Story" button is pressed
  const handleStartNewStory = () => {
    setPlayModalVisible(true); // This opens the PlayButtonModal
  };

  // This function is passed to PlayButtonModal and opens the QuickStartModal
  const openQuickStart = () => {
    setPlayModalVisible(false); // Close the main play modal
    setQuickStartModalVisible(true); // Open the quick start genre selection modal
  };

  // This function is passed to QuickStartModal and handles genre selection
  const onGenreSelect = async (genre: string) => {
    setQuickStartModalVisible(false); // Close the genre selection modal
    if (!user) return; // Ensure user is logged in for quick start
    setIsGenerating(true); // Show loading indicator
    await handleQuickStart(genre, user, router); // Call the quick start logic
    setIsGenerating(false); // Hide loading indicator
  };

  const renderStoryCard = ({ item }: { item: StoryDocument }) => {
    const truncatedDescription = item.description 
      ? item.description.substring(0, 100) + (item.description.length > 100 ? '...' : '')
      : 'No description provided.';

    return (
      <TouchableOpacity 
        style={styles.storyListItem} 
        onPress={() => router.push({ pathname: `/story-info/[id]`, params: { id: item.$id } })}
      >
        <Text style={styles.storyListItemTitle}>{item.title}</Text>
        <Text style={styles.storyListItemDescription}>{truncatedDescription}</Text>
        <View style={styles.creatorInfo}>
          <Feather name="user" size={16} color="#a9a9a9" style={{ marginRight: 5 }} />
          <Text style={styles.storyListItemCreator}>{item.userName || 'Anonymous'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Storybook AI</Text>
          <Text style={styles.subtitle}>Your collaborative storyteller</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleStartNewStory}>
          <Text style={styles.buttonText}>Start New Story</Text>
          <Feather name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: 10 }}/>
        </TouchableOpacity>

        <View style={styles.allStoriesSection}>
          <Text style={styles.allStoriesTitle}>Explore Stories</Text>
          {isLoading ? (
            <ActivityIndicator size="large" color="#c792ea" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={allStories}
              renderItem={renderStoryCard}
              keyExtractor={(item) => item.$id}
              ListEmptyComponent={<Text style={styles.emptyListText}>No stories found. Be the first to create one!</Text>}
              scrollEnabled={false} // Disable FlatList scrolling as it's inside a ScrollView
            />
          )}
        </View>
      </ScrollView>

      {/* Modals for Play/Quick Start are rendered here */}
      <PlayButtonModal visible={playModalVisible} onClose={() => setPlayModalVisible(false)} onQuickStart={openQuickStart} />
      <QuickStartModal visible={quickStartModalVisible} onClose={() => setQuickStartModalVisible(false)} onSelectGenre={onGenreSelect} />

      {isGenerating && (
        <View style={modalStyles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={modalStyles.loadingText}>Generating your adventure...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'serif', // A more storybook-like font
  },
  subtitle: {
    fontSize: 18,
    color: '#a9a9a9',
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#6200ee',
    paddingVertical: 15,
    paddingHorizontal: 35,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#6200ee",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 10,
    marginBottom: 40,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  allStoriesSection: {
    flex: 1, // Make it take available height
    width: '100%',
    // Removed backgroundColor, borderRadius, padding, and marginBottom
  },
  allStoriesTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  storyListItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  storyListItemTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  storyListItemDescription: {
    fontSize: 14,
    color: '#a9a9a9',
    marginBottom: 10,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyListItemCreator: {
    fontSize: 14,
    color: '#a9a9a9',
    fontStyle: 'italic',
  },
  emptyListText: {
    color: '#a9a9a9',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

// Separate styles for modals to avoid conflicts and keep them organized
const modalStyles = StyleSheet.create({
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
    }
});
