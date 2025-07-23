import { Feather } from '@expo/vector-icons';
import { Query } from 'appwrite';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
// MODIFIED: Import useSafeAreaInsets to manually control padding
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { databaseId, databases, getImageUrl, storiesCollectionId } from '../../lib/appwrite';
import { handleQuickStart } from '../../lib/quickstart';
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

const PAGE_SIZE = 6;

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // MODIFIED: Get insets to apply manual padding
  const insets = useSafeAreaInsets();

  // --- State for Pagination ---
  const [stories, setStories] = useState<StoryDocument[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastFetchedId, setLastFetchedId] = useState<string | null>(null);

  // --- State for Modals and Actions ---
  const [playModalVisible, setPlayModalVisible] = useState(false);
  const [quickStartModalVisible, setQuickStartModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const fetchStories = async (refresh = false) => {
    if (isFetchingMore) return;
    if (!refresh && !hasMore) return;

    setIsFetchingMore(true);
    if (refresh) {
        setIsRefreshing(true);
    }

    try {
        const cursor = refresh ? null : lastFetchedId;
        const queries = [
            Query.orderDesc('$createdAt'),
            Query.limit(PAGE_SIZE)
        ];
        if (cursor) {
            queries.push(Query.cursorAfter(cursor));
        }

        const response = await databases.listDocuments(databaseId, storiesCollectionId, queries);
        const newDocs = response.documents as StoryDocument[];

        if (newDocs.length === 0) {
            setHasMore(false);
        } else {
            setStories(prev => refresh ? newDocs : [...prev, ...newDocs]);
            setLastFetchedId(newDocs[newDocs.length - 1].$id);
            if (newDocs.length < PAGE_SIZE) {
                setHasMore(false);
            }
        }
    } catch (error: any) {
        if (error.code !== 401) {
            console.error("Failed to fetch stories:", error);
            Alert.alert("Error", "Could not fetch stories.");
        }
    } finally {
        setIsFetchingMore(false);
        setIsInitialLoading(false);
        setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
        handleRefresh();
    }, [user])
  );

  const handleRefresh = () => {
    setStories([]);
    setLastFetchedId(null);
    setHasMore(true);
    fetchStories(true);
  };

  const handleStartNewStory = () => setPlayModalVisible(true);
  const openQuickStart = () => {
    setPlayModalVisible(false);
    setQuickStartModalVisible(true);
  };

  const onGenreSelect = async (genre: string) => {
    setQuickStartModalVisible(false);
    if (!user) return;

    let tag = genre;
    if (genre === "Modern Day Drama") {
        tag = "Drama, 21st Century";
    } else if (genre === "Medieval Drama") {
        tag = "Drama, Medieval Times";
    }

    setIsGenerating(true);
    await handleQuickStart(genre, tag, user, router);
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
    // MODIFIED: Replaced SafeAreaView with a standard View
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
            // MODIFIED: Use the insets to apply dynamic padding
            contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: insets.top,
                paddingBottom: insets.bottom + 50, // Add extra space below the last item
            }}
        />
      )}

      <PlayButtonModal visible={playModalVisible} onClose={() => setPlayModalVisible(false)} onQuickStart={openQuickStart} />
      <QuickStartModal visible={quickStartModalVisible} onClose={() => setQuickStartModalVisible(false)} onSelectGenre={onGenreSelect} />

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
    loadingText: { color: '#FFFFFF', marginTop: 15, fontSize: 16 }
});
