import { Feather } from '@expo/vector-icons';
import { Query } from 'appwrite';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { databaseId, databases, deleteImageFile, getImageUrl, storiesCollectionId } from '../../lib/appwrite';
import { deleteStorySession, getStoryHistory } from '../../lib/history';
import { StoryDocument, StorySession } from '../types/story';

type ProfileTab = 'Creations' | 'History';
type SortOrder = 'Recent' | 'Oldest';
type DeleteType = 'Creation' | 'History';

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();
    
    const [creations, setCreations] = useState<StorySession[]>([]);
    const [history, setHistory] = useState<StorySession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ProfileTab>('Creations');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<StorySession | null>(null);
    const [deleteType, setDeleteType] = useState<DeleteType | null>(null);
    const [sortOrder, setSortOrder] = useState<SortOrder>('Recent');

    useFocusEffect(
        useCallback(() => {
            const fetchData = async () => {
                if (!user) {
                    setIsLoading(false);
                    return;
                }
                setIsLoading(true);

                try {
                    if (activeTab === 'Creations') {
                        const appwriteResponse = await databases.listDocuments(databaseId, storiesCollectionId, [Query.equal('userId', user.$id)]);
                        const appwriteCreations = appwriteResponse.documents as StoryDocument[];

                        const localHistory = await getStoryHistory();
                        const localCreations = localHistory.filter(s => s.isLocal && s.story.userId === user.$id);

                        const allCreationsMap = new Map<string, StorySession>();

                        appwriteCreations.forEach(story => {
                            allCreationsMap.set(story.$id, {
                                story,
                                sessionId: story.$id,
                                sessionDate: story.$createdAt,
                                isLocal: false,
                                content: [],
                                playerData: {}
                            });
                        });

                        localCreations.forEach(session => {
                            if (!allCreationsMap.has(session.story.$id)) {
                                allCreationsMap.set(session.story.$id, session);
                            }
                        });
                        
                        const mergedCreations = Array.from(allCreationsMap.values()).sort((a, b) => new Date(b.story.$createdAt).getTime() - new Date(a.story.$createdAt).getTime());
                        setCreations(mergedCreations);

                    } else { // History Tab
                        const historySessions = await getStoryHistory();
                        const sortedHistory = [...historySessions].sort((a, b) => {
                            const dateA = new Date(a.sessionDate).getTime();
                            const dateB = new Date(b.sessionDate).getTime();
                            return sortOrder === 'Recent' ? dateB - dateA : dateA - dateB;
                        });
                        setHistory(sortedHistory);
                    }
                } catch (error) {
                    console.error("Failed to fetch data:", error);
                    Alert.alert("Error", "Could not fetch your data.");
                } finally {
                    setIsLoading(false);
                }
            };

            fetchData();
        }, [user, activeTab, sortOrder])
    );

    const handleLogout = async () => {
        await logout();
    };

    const handleStartCreation = (session: StorySession) => {
        router.push({
            pathname: '/intro/[sessionId]',
            params: { sessionId: session.story.$id, story: JSON.stringify(session.story) },
        });
    };

    const handleContinueSession = (session: StorySession) => {
        const { story, playerData, sessionId } = session;
        const isNameMissing = story.ask_user_name && !playerData?.name;
        const isGenderMissing = story.ask_user_gender && !playerData?.gender;
        const isAgeMissing = story.ask_user_age && !playerData?.age;

        if (isNameMissing || isGenderMissing || isAgeMissing) {
            router.push({
                pathname: '/intro/[sessionId]',
                params: { sessionId: sessionId, story: JSON.stringify(story) },
            });
        } else {
            router.push({
                pathname: '/play/[sessionId]',
                params: { sessionId: sessionId, story: JSON.stringify(story) },
            });
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;

        setIsLoading(true);
        try {
            if (deleteType === 'Creation') {
                // Deleting a Creation: This removes the story and all its history.
                const allHistory = await getStoryHistory();
                const sessionsToDelete = allHistory.filter(s => s.story.$id === itemToDelete.story.$id);
                
                for (const session of sessionsToDelete) {
                    await deleteStorySession(session.sessionId);
                }

                if (!itemToDelete.isLocal) {
                    if (itemToDelete.story.cover_image_id) {
                        await deleteImageFile(itemToDelete.story.cover_image_id);
                    }
                    await databases.deleteDocument(databaseId, storiesCollectionId, itemToDelete.story.$id);
                }
                
                Alert.alert("Success", "Creation and all associated history deleted.");
                setCreations(prev => prev.filter(c => c.story.$id !== itemToDelete.story.$id));
                setHistory(prev => prev.filter(h => h.story.$id !== itemToDelete.story.$id));

            } else if (deleteType === 'History') {
                // Deleting a History session: This only removes one playthrough.
                await deleteStorySession(itemToDelete.sessionId);
                Alert.alert("Success", "History session deleted.");
                setHistory(prev => prev.filter(h => h.sessionId !== itemToDelete.sessionId));
            }
        } catch (error) {
            console.error(`Failed to delete ${deleteType}:`, error);
            Alert.alert("Error", `Could not delete ${deleteType}.`);
        } finally {
            setIsLoading(false);
            setShowDeleteModal(false);
            setItemToDelete(null);
        }
    };

    const openDeleteModal = (item: StorySession, type: DeleteType) => {
        setItemToDelete(item);
        setDeleteType(type);
        setShowDeleteModal(true);
    };

    const renderCreationItem = ({ item }: { item: StorySession }) => (
        <TouchableOpacity 
            style={styles.storyCard} 
            onPress={() => handleStartCreation(item)}
            onLongPress={() => openDeleteModal(item, 'Creation')}
        >
            {item.localCoverImagePath ? (
                <Image source={{ uri: item.localCoverImagePath }} style={styles.storyCardImage} resizeMode="cover" />
            ) : item.story.cover_image_id ? (
                <Image source={{ uri: getImageUrl(item.story.cover_image_id) }} style={styles.storyCardImage} resizeMode="cover" />
            ) : (
                <View style={styles.storyCardIcon}><Feather name="book" size={30} color="#c792ea" /></View>
            )}
            <View style={styles.storyCardTextContainer}>
                <Text style={styles.storyTitle} numberOfLines={1}>{item.story.title}</Text>
                <Text style={styles.storyDescription} numberOfLines={2}>{item.story.description || 'No description'}</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#555" style={{ marginRight: 15 }} />
        </TouchableOpacity>
    );

    const renderHistoryItem = ({ item }: { item: StorySession }) => (
        <TouchableOpacity 
            style={styles.storyCard} 
            onPress={() => handleContinueSession(item)}
            onLongPress={() => openDeleteModal(item, 'History')}
        >
            {item.localCoverImagePath ? (
                <Image source={{ uri: item.localCoverImagePath }} style={styles.storyCardImage} resizeMode="cover" />
            ) : (
                <View style={styles.storyCardIcon}><Feather name="book-open" size={30} color="#82aaff" /></View>
            )}
            <View style={styles.storyCardTextContainer}>
                <Text style={styles.storyTitle} numberOfLines={1}>{item.story.title}</Text>
                <Text style={styles.storyDescription} numberOfLines={1}>
                    Played on: {new Date(item.sessionDate).toLocaleDateString()}
                </Text>
            </View>
            <View><Text style={styles.continueText}>Continue</Text></View>
        </TouchableOpacity>
    );
    
    const renderContent = () => {
        if (isLoading) return <ActivityIndicator size="large" color="#c792ea" style={{ marginTop: 20 }}/>;
        if (activeTab === 'Creations') {
            return <FlatList data={creations} renderItem={renderCreationItem} keyExtractor={(item) => item.story.$id} ListEmptyComponent={<Text style={styles.emptyListText}>You haven't created any stories yet.</Text>} />;
        }
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
