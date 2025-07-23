import { Feather } from '@expo/vector-icons';
import { Query } from 'appwrite';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { databaseId, databases, getImageUrl, storiesCollectionId } from '../../lib/appwrite';
import { handleQuickStart } from '../../lib/quickstart';
import { PlayerData, StoryDocument } from '../types/story';

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
                <View style={modalStyles.modalOverlay}>
                    <View style={[modalStyles.modalContent, { paddingBottom: 30 }]}>
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
        <View style={modalStyles.stepContainer}>
            <Text style={modalStyles.modalTitle}>Character's Name?</Text>
            <TextInput style={modalStyles.input} placeholder="e.g., Alistair" placeholderTextColor="#666" value={name} onChangeText={setName} />
            <TouchableOpacity style={[modalStyles.modalButton, !name && modalStyles.disabledButton]} onPress={() => onComplete(name)} disabled={!name}>
                <Text style={modalStyles.modalButtonText}>Next</Text>
            </TouchableOpacity>
        </View>
    );
};
const GenderStep = ({ onComplete }: { onComplete: (gender: string) => void }) => (
    <View style={modalStyles.stepContainer}>
        <Text style={modalStyles.modalTitle}>Character's Gender?</Text>
        <TouchableOpacity style={modalStyles.modalButton} onPress={() => onComplete('Male')}><Text style={modalStyles.modalButtonText}>Male</Text></TouchableOpacity>
        <TouchableOpacity style={modalStyles.modalButton} onPress={() => onComplete('Female')}><Text style={modalStyles.modalButtonText}>Female</Text></TouchableOpacity>
        <TouchableOpacity style={modalStyles.modalButton} onPress={() => onComplete('Non-binary')}><Text style={modalStyles.modalButtonText}>Non-binary</Text></TouchableOpacity>
    </View>
);
const AgeStep = ({ onComplete }: { onComplete: (age: string) => void }) => {
    const [age, setAge] = useState('');
    return (
        <View style={modalStyles.stepContainer}>
            <Text style={modalStyles.modalTitle}>Character's Age?</Text>
            <TextInput style={modalStyles.input} placeholder="e.g., 25" placeholderTextColor="#666" value={age} onChangeText={setAge} keyboardType="number-pad" />
            <TouchableOpacity style={[modalStyles.modalButton, !age && modalStyles.disabledButton]} onPress={() => onComplete(age)} disabled={!age}>
                <Text style={modalStyles.modalButtonText}>Generate Story</Text>
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

const PAGE_SIZE = 6;

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // --- State for Pagination ---
  const [stories, setStories] = useState<StoryDocument[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [shuffledIds, setShuffledIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  // --- State for Modals and Actions ---
  const [playModalVisible, setPlayModalVisible] = useState(false);
  const [quickStartModalVisible, setQuickStartModalVisible] = useState(false);
  const [characterModalVisible, setCharacterModalVisible] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const fetchPageByIds = async (page: number, ids: string[]) => {
    const idSlice = ids.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    if (idSlice.length === 0) {
        setHasMore(false);
        return;
    }

    try {
        const response = await databases.listDocuments(databaseId, storiesCollectionId, [Query.equal('$id', idSlice)]);
        const newDocs = response.documents as StoryDocument[];

        const orderedDocs = idSlice.map(id => newDocs.find(doc => doc.$id === id)).filter(Boolean) as StoryDocument[];

        setStories(prev => {
            const existingIds = new Set(prev.map(s => s.$id));
            const uniqueNewDocs = orderedDocs.filter(doc => !existingIds.has(doc.$id));
            return [...prev, ...uniqueNewDocs];
        });

        if (idSlice.length < PAGE_SIZE) {
            setHasMore(false);
        }
    } catch (error: any) {
        console.error("Failed to fetch page by IDs:", error);
        Alert.alert("Error", "Could not fetch stories.");
    }
  };
  
  const fetchStories = async (refresh = false) => {
    if (isFetchingMore || (!refresh && !hasMore)) return;

    setIsFetchingMore(true);

    if (refresh) {
        setIsRefreshing(true);
        try {
            const idResponse = await databases.listDocuments(databaseId, storiesCollectionId, [Query.limit(5000), Query.select(['$id'])]);
            const ids = idResponse.documents.map(doc => doc.$id);

            for (let i = ids.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [ids[i], ids[j]] = [ids[j], ids[i]];
            }

            setShuffledIds(ids);
            setCurrentPage(0);
            setHasMore(true);
            setStories([]);
            
            await fetchPageByIds(0, ids);

        } catch (error: any) {
             if (error.code !== 401) {
                console.error("Failed to fetch story IDs:", error);
                Alert.alert("Error", "Could not fetch stories.");
            }
        } finally {
            setIsRefreshing(false);
            setIsInitialLoading(false);
        }
    } else {
        const nextPage = currentPage + 1;
        await fetchPageByIds(nextPage, shuffledIds);
        setCurrentPage(nextPage);
    }
    setIsFetchingMore(false);
  };

  useFocusEffect(
    useCallback(() => {
        handleRefresh();
    }, [user])
  );

  const handleRefresh = () => {
    fetchStories(true);
  };

  const handleStartNewStory = () => setPlayModalVisible(true);
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

  const handleStartStory = async (story: StoryDocument) => {
    router.push({
        pathname: '/intro/[sessionId]',
        params: { sessionId: story.$id, story: JSON.stringify(story) },
    });
  };

  const renderStoryCard = ({ item }: { item: StoryDocument }) => {
    const truncatedTitle = item.title.length > 15 ? item.title.substring(0, 15) + '...' : item.title;
    const truncatedDesc = item.description && item.description.length > 50 ? item.description.substring(0, 50) + '...' : item.description;
    const imageSource = item.cover_image_id 
      ? { uri: getImageUrl(item.cover_image_id) } 
      : { uri: 'https://placehold.co/200x300/1e1e1e/FFFFFF?text=No+Image' };

    return (
      <TouchableOpacity style={styles.storyCard} onPress={() => handleStartStory(item)}>
        <Image source={imageSource} style={styles.storyCardImage} resizeMode="cover" />
        <View style={styles.storyCardTextContainer}>
            <Text style={styles.storyCardTitle}>{truncatedTitle}</Text>
            <Text style={styles.storyCardDescription}>{truncatedDesc || 'No description available.'}</Text>
            <View style={styles.metaItem}><Feather style={{marginRight: 5 }} name="tag" size={16} color="#a9a9a9" /><Text style={styles.storyCardMetaText}>{item.tags || 'No tags'}</Text></View>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderHeader = () => (
    <>
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
      </View>
    </>
  );

  const renderFooter = () => {
    if (isInitialLoading) return null;
    if (isFetchingMore) {
        return <ActivityIndicator size="large" color="#c792ea" style={{ marginVertical: 20 }} />;
    }
    return null;
  };

  return (
    <View style={styles.container}>
      {isInitialLoading ? (
         <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#c792ea" /></View>
      ) : (
        <FlatList
            data={stories}
            renderItem={renderStoryCard}
            keyExtractor={(item) => item.$id}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={<Text style={styles.emptyListText}>No stories found. Be the first to create one!</Text>}
            onEndReached={() => fetchStories()}
            onEndReachedThreshold={0.5}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
            contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: insets.top,
                paddingBottom: insets.bottom + 50,
            }}
        />
      )}

      <PlayButtonModal visible={playModalVisible} onClose={() => setPlayModalVisible(false)} onQuickStart={openQuickStart} />
      <QuickStartModal visible={quickStartModalVisible} onClose={() => setQuickStartModalVisible(false)} onSelectGenre={onGenreSelect} />
      <CharacterCreationModal visible={characterModalVisible} onClose={() => setCharacterModalVisible(false)} onComplete={onCharacterComplete} />

      {isGenerating && (
        <View style={modalStyles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={modalStyles.loadingText}>Starting your adventure...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 0 },
  header: { alignItems: 'center', marginBottom: 40, paddingTop: 20 },
  title: { fontSize: 42, fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'serif' },
  subtitle: { fontSize: 18, color: '#a9a9a9', marginTop: 8 },
  button: {
    flexDirection: 'row',
    backgroundColor: '#6200ee',
    paddingVertical: 15,
    paddingHorizontal: 35,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#6200ee",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 10,
    marginBottom: 40,
  },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  allStoriesSection: { width: '100%' },
  allStoriesTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 20, textAlign: 'left' },
  emptyListText: { color: '#a9a9a9', textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
  storyCard: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#1e1e1e',
  },
  storyCardImage: { width: 140, height: 140, backgroundColor: '#333' },
  storyCardTextContainer: { flex: 1, padding: 15, justifyContent: 'space-between' },
  storyCardMetaText: { color: '#a9a9a9', fontSize: 12, textTransform: 'capitalize' },
  storyCardTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  storyCardDescription: { color: '#e0e0e0', fontSize: 14 },
});

const modalStyles = StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
    modalContent: {
        backgroundColor: '#2a2a2a',
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        alignItems: 'stretch',
    },
    modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20 },
    modalOptionText: { color: '#FFFFFF', fontSize: 18, marginLeft: 20, fontWeight: '600' },
    separator: { height: 1, backgroundColor: '#444', width: '100%' },
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
    loadingText: { color: '#FFFFFF', marginTop: 15, fontSize: 16 },
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
