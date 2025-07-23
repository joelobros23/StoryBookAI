import { Feather } from '@expo/vector-icons';
import { Query } from 'appwrite';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { databaseId, databases, deleteImageFile, getImageUrl, storiesCollectionId } from '../../lib/appwrite';
import { deleteLocalCreation, deleteStorySession, disassociateImagePath, getLocalCreations, getStoryHistory, getStoryImagePaths } from '../../lib/history';
import { StoryDocument, StorySession } from '../types/story';

type ProfileTab = 'Creations' | 'History';
type SortOrder = 'Recent' | 'Oldest';
type DeleteType = 'Creation' | 'History';

const PAGE_SIZE = 8;

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();
    
    // --- State for Creations Tab ---
    const [creations, setCreations] = useState<StorySession[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasMoreCreations, setHasMoreCreations] = useState(true);
    const [lastFetchedId, setLastFetchedId] = useState<string | null>(null);
    
    // --- State for History Tab ---
    const [history, setHistory] = useState<StorySession[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState<SortOrder>('Recent');

    // --- General State ---
    const [activeTab, setActiveTab] = useState<ProfileTab>('Creations');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<StorySession | null>(null);
    const [deleteType, setDeleteType] = useState<DeleteType | null>(null);

    // --- Data Fetching ---

    const fetchCreations = async (refresh = false) => {
        if (isFetchingMore) return;
        if (!refresh && !hasMoreCreations) return;

        setIsFetchingMore(true);
        if (refresh) {
            setIsRefreshing(true);
        }

        try {
            const cursor = refresh ? null : lastFetchedId;
            
            // --- Fetch from Appwrite ---
            const appwriteQueries = [
                Query.equal('userId', user!.$id), 
                Query.orderDesc('$createdAt'), 
                Query.limit(PAGE_SIZE)
            ];
            if (cursor) {
                appwriteQueries.push(Query.cursorAfter(cursor));
            }
            const appwriteResponse = await databases.listDocuments(databaseId, storiesCollectionId, appwriteQueries);
            const appwriteDocs = appwriteResponse.documents as StoryDocument[];

            // --- Fetch ALL Local Creations (as they are few) ---
            // We only fetch local stories once during a refresh, then merge with Appwrite results.
            const localDocs = refresh ? (await getLocalCreations()).filter(s => s.userId === user!.$id) : [];

            const allNewDocs = [...appwriteDocs, ...localDocs];

            if (allNewDocs.length === 0 && !refresh) {
                setHasMoreCreations(false);
                return;
            }

            const imagePaths = await getStoryImagePaths();
            const newSessions = allNewDocs.map(story => ({
                story,
                sessionId: story.$id,
                sessionDate: story.$createdAt,
                isLocal: !!story.isLocal,
                content: [],
                playerData: {},
                localCoverImagePath: imagePaths[story.$id] || undefined
            }));

            setCreations(prev => {
                const combined = refresh ? newSessions : [...prev, ...newSessions];
                const unique = combined.filter((session, index, self) =>
                    index === self.findIndex((s) => s.story.$id === session.story.$id)
                );
                return unique.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
            });

            if (appwriteDocs.length > 0) {
                setLastFetchedId(appwriteDocs[appwriteDocs.length - 1].$id);
            }
            if (appwriteDocs.length < PAGE_SIZE) {
                setHasMoreCreations(false);
            }

        } catch (error) {
            console.error("Failed to fetch creations:", error);
            Alert.alert("Error", "Could not fetch your creations.");
        } finally {
            setIsFetchingMore(false);
            setIsInitialLoading(false);
            setIsRefreshing(false);
        }
    };

    const fetchHistory = async () => {
        setIsHistoryLoading(true);
        try {
            const historySessions = await getStoryHistory();
            const sortedHistory = [...historySessions].sort((a, b) => {
                const dateA = new Date(a.sessionDate).getTime();
                const dateB = new Date(b.sessionDate).getTime();
                return sortOrder === 'Recent' ? dateB - dateA : dateA - dateB;
            });
            setHistory(sortedHistory);
        } catch (error) {
             console.error("Failed to fetch history:", error);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (user) {
                if (activeTab === 'Creations') {
                    handleRefreshCreations();
                } else {
                    fetchHistory();
                }
            }
        }, [user, activeTab, sortOrder])
    );
    
    const handleRefreshCreations = () => {
        setCreations([]);
        setLastFetchedId(null);
        setHasMoreCreations(true);
        fetchCreations(true);
    };

    // --- Handlers ---
    const handleLogout = async () => { await logout(); };

    const handleStartCreation = (session: StorySession) => {
        router.push({
            pathname: '/intro/[sessionId]',
            params: { sessionId: session.story.$id, story: JSON.stringify(session.story) },
        });
    };

    const handleContinueSession = (session: StorySession) => {
        router.push({
            pathname: '/play/[sessionId]',
            params: { sessionId: session.sessionId, story: JSON.stringify(session.story) },
        });
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;

        try {
            if (deleteType === 'Creation') {
                const storyIdToDelete = itemToDelete.story.$id;
                const imagePaths = await getStoryImagePaths();
                const imagePathToDelete = imagePaths[storyIdToDelete];
                
                const allHistory = await getStoryHistory();
                for (const session of allHistory.filter(s => s.story.$id === storyIdToDelete)) {
                    await deleteStorySession(session.sessionId);
                }

                if (itemToDelete.isLocal) {
                    await deleteLocalCreation(storyIdToDelete);
                } else {
                    if (itemToDelete.story.cover_image_id) await deleteImageFile(itemToDelete.story.cover_image_id);
                    await databases.deleteDocument(databaseId, storiesCollectionId, storyIdToDelete);
                }

                if (imagePathToDelete) {
                    await disassociateImagePath(storyIdToDelete);
                    await FileSystem.deleteAsync(imagePathToDelete, { idempotent: true });
                }
                
                Alert.alert("Success", "Creation and all associated history deleted.");
                setCreations(prev => prev.filter(c => c.story.$id !== storyIdToDelete));

            } else if (deleteType === 'History') {
                await deleteStorySession(itemToDelete.sessionId);
                Alert.alert("Success", "History session deleted.");
                setHistory(prev => prev.filter(h => h.sessionId !== itemToDelete.sessionId));
            }
        } catch (error) {
            console.error(`Failed to delete ${deleteType}:`, error);
            Alert.alert("Error", `Could not delete ${deleteType}.`);
        } finally {
            setShowDeleteModal(false);
            setItemToDelete(null);
        }
    };

    const openDeleteModal = (item: StorySession, type: DeleteType) => {
        setItemToDelete(item);
        setDeleteType(type);
        setShowDeleteModal(true);
    };

    // --- Render Functions ---

    const renderCreationsFooter = () => {
        if (!isFetchingMore) return null;
        return <ActivityIndicator style={{ marginVertical: 20 }} size="large" color="#c792ea" />;
    };

    const renderContent = () => {
        if (activeTab === 'Creations') {
            if (isInitialLoading) return <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#c792ea"/>;
            return (
                <FlatList 
                    data={creations} 
                    renderItem={renderCreationItem} 
                    keyExtractor={(item) => item.story.$id} 
                    ListEmptyComponent={<Text style={styles.emptyListText}>You haven't created any stories yet.</Text>}
                    onEndReached={() => fetchCreations()}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderCreationsFooter}
                    onRefresh={handleRefreshCreations}
                    refreshing={isRefreshing}
                />
            );
        }

        if (isHistoryLoading) return <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#c792ea"/>;
        return (
            <>
                <View style={styles.sortContainer}>
                    <TouchableOpacity onPress={() => setSortOrder('Recent')} style={[styles.sortButton, sortOrder === 'Recent' && styles.activeSortButton]}><Text style={styles.sortButtonText}>Recent</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setSortOrder('Oldest')} style={[styles.sortButton, sortOrder === 'Oldest' && styles.activeSortButton]}><Text style={styles.sortButtonText}>Oldest</Text></TouchableOpacity>
                </View>
                <FlatList data={history} renderItem={renderHistoryItem} keyExtractor={(item) => item.sessionId} ListEmptyComponent={<Text style={styles.emptyListText}>Your story history is empty.</Text>} />
            </>
        );
    };

    const renderCreationItem = ({ item }: { item: StorySession }) => (
        <TouchableOpacity style={styles.storyCard} onPress={() => handleStartCreation(item)} onLongPress={() => openDeleteModal(item, 'Creation')}>
            {item.localCoverImagePath ? <Image source={{ uri: item.localCoverImagePath }} style={styles.storyCardImage} /> : item.story.cover_image_id ? <Image source={{ uri: getImageUrl(item.story.cover_image_id) }} style={styles.storyCardImage} /> : <View style={styles.storyCardIcon}><Feather name="book" size={30} color="#c792ea" /></View>}
            <View style={styles.storyCardTextContainer}><Text style={styles.storyTitle} numberOfLines={1}>{item.story.title}</Text><Text style={styles.storyDescription} numberOfLines={2}>{item.story.description || 'No description'}</Text></View>
            <Feather name="chevron-right" size={24} color="#555" style={{ marginRight: 15 }} />
        </TouchableOpacity>
    );

    const renderHistoryItem = ({ item }: { item: StorySession }) => (
        <TouchableOpacity style={styles.storyCard} onPress={() => handleContinueSession(item)} onLongPress={() => openDeleteModal(item, 'History')}>
            {item.localCoverImagePath ? <Image source={{ uri: item.localCoverImagePath }} style={styles.storyCardImage} /> : <View style={styles.storyCardIcon}><Feather name="book-open" size={30} color="#82aaff" /></View>}
            <View style={styles.storyCardTextContainer}><Text style={styles.storyTitle} numberOfLines={1}>{item.story.title}</Text><Text style={styles.storyDescription} numberOfLines={1}>Played on: {new Date(item.sessionDate).toLocaleDateString()}</Text></View>
            <View><Text style={styles.continueText}>Continue</Text></View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Feather name="user-check" size={80} color="#c792ea" />
                    {user && <View style={styles.userInfoContainer}><Text style={styles.name}>{user.name}</Text><Text style={styles.email}>{user.email}</Text></View>}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Text style={styles.logoutButtonText}>Logout</Text><Feather name="log-out" size={20} color="#FFFFFF" style={{ marginLeft: 10 }}/></TouchableOpacity>
                </View>
                <View style={styles.storiesSection}>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity style={[styles.tab, activeTab === 'Creations' && styles.activeTab]} onPress={() => setActiveTab('Creations')}><Text style={styles.tabText}>Creations</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.tab, activeTab === 'History' && styles.activeTab]} onPress={() => setActiveTab('History')}><Text style={styles.tabText}>History</Text></TouchableOpacity>
                    </View>
                    <View style={styles.tabContent}>{renderContent()}</View>
                </View>
            </View>
            <Modal animationType="fade" transparent={true} visible={showDeleteModal} onRequestClose={() => setShowDeleteModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteModal(false)}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Delete {deleteType}</Text>
                        <Text style={styles.modalMessage}>Are you sure you want to delete this {deleteType?.toLowerCase()}? This action cannot be undone.</Text>
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowDeleteModal(false)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.deleteButton]} onPress={handleDelete}><Text style={styles.modalButtonText}>Delete</Text></TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#121212' },
    container: { flex: 1 },
    header: { alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
    userInfoContainer: { alignItems: 'center', marginVertical: 20 },
    name: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
    email: { fontSize: 16, color: '#a9a9a9', marginTop: 4 },
    storiesSection: { flex: 1, width: '100%', backgroundColor: '#1e1e1e' },
    tabContainer: { flexDirection: 'row', backgroundColor: '#121212' },
    tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#c792ea' },
    tabText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    tabContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    storyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a', borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
    storyCardIcon: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', backgroundColor: '#333' },
    storyCardImage: { width: 80, height: 80, backgroundColor: '#333' },
    storyCardTextContainer: { flex: 1, paddingHorizontal: 15, paddingVertical: 15 },
    storyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    storyDescription: { color: '#a9a9a9', fontSize: 14, marginTop: 4 },
    emptyListText: { color: '#a9a9a9', textAlign: 'center', marginTop: 40, fontStyle: 'italic', fontSize: 16 },
    logoutButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#c73e3e', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 30, marginTop: 10 },
    logoutButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    continueText: { color: '#82aaff', fontSize: 14, fontWeight: '600' },
    sortContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15, backgroundColor: '#2a2a2a', borderRadius: 20, padding: 4 },
    sortButton: { flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center' },
    activeSortButton: { backgroundColor: '#c792ea' },
    sortButtonText: { color: '#FFFFFF', fontWeight: '600' },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
    modalView: { margin: 20, backgroundColor: '#1e1e1e', borderRadius: 20, padding: 35, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '90%' },
    modalTitle: { marginBottom: 15, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
    modalMessage: { marginBottom: 20, textAlign: 'center', fontSize: 16, color: '#e0e0e0' },
    modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    modalButton: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, elevation: 2, flex: 1, marginHorizontal: 5, alignItems: 'center' },
    cancelButton: { backgroundColor: '#333' },
    deleteButton: { backgroundColor: '#c73e3e' },
    modalButtonText: { color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
});
