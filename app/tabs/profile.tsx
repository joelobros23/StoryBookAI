import { Feather } from '@expo/vector-icons';
import { Models, Query } from 'appwrite';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { databaseId, databases, storiesCollectionId } from '../../lib/appwrite';
import { getStoryHistory } from '../../lib/history'; // Import the new history function

// Define a type for the story documents for type safety
type Story = Models.Document & {
    title: string;
    description: string;
};

type ProfileTab = 'Creations' | 'History';

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();
    
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ProfileTab>('Creations');

    useEffect(() => {
        const fetchCreations = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }
            try {
                const response = await databases.listDocuments(
                    databaseId,
                    storiesCollectionId,
                    [
                        Query.equal('userId', user.$id),
                        Query.orderDesc('$createdAt')
                    ]
                );
                setStories(response.documents as Story[]);
            } catch (error) {
                console.error("Failed to fetch stories:", error);
                Alert.alert("Error", "Could not fetch your creations.");
            } finally {
                setIsLoading(false);
            }
        };

        const fetchHistory = async () => {
            try {
                const historyStories = await getStoryHistory();
                setStories(historyStories);
            } catch (error) {
                 console.error("Failed to fetch history:", error);
                Alert.alert("Error", "Could not fetch your history.");
            } finally {
                setIsLoading(false);
            }
        };

        setIsLoading(true);
        if (activeTab === 'Creations') {
            fetchCreations();
        } else { // History tab
            fetchHistory();
        }
    }, [user, activeTab]);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error: any) {
            Alert.alert('Logout Error', error.message);
        }
    };

    const renderStoryItem = ({ item }: { item: Story }) => (
        <TouchableOpacity style={styles.storyCard} onPress={() => router.push(`/play/${item.$id}`)}>
            <View style={styles.storyCardIcon}>
                <Feather name="book-open" size={24} color="#c792ea" />
            </View>
            <View style={styles.storyCardTextContainer}>
                <Text style={styles.storyTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.storyDescription} numberOfLines={2}>{item.description || 'No description available.'}</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#555" />
        </TouchableOpacity>
    );
    
    const renderContent = () => {
        if (isLoading) {
            return <ActivityIndicator size="large" color="#c792ea" style={{ marginTop: 20 }}/>;
        }

        const emptyMessage = activeTab === 'Creations' 
            ? "You haven't created any stories yet." 
            : "Your story history is empty.";

        return (
            <FlatList
                data={stories}
                renderItem={renderStoryItem}
                keyExtractor={(item) => item.$id}
                ListEmptyComponent={<Text style={styles.emptyListText}>{emptyMessage}</Text>}
            />
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Feather name="user-check" size={80} color="#c792ea" />
                    
                    {user ? (
                        <View style={styles.userInfoContainer}>
                            <Text style={styles.name}>{user.name}</Text>
                            <Text style={styles.email}>{user.email}</Text>
                        </View>
                    ) : (
                        <Text style={styles.email}>Loading user data...</Text>
                    )}

                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutButtonText}>Logout</Text>
                        <Feather name="log-out" size={20} color="#FFFFFF" style={{ marginLeft: 10 }}/>
                    </TouchableOpacity>
                </View>

                <View style={styles.storiesSection}>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity 
                            style={[styles.tab, activeTab === 'Creations' && styles.activeTab]} 
                            onPress={() => setActiveTab('Creations')}
                        >
                            <Text style={styles.tabText}>Creations</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tab, activeTab === 'History' && styles.activeTab]}
                            onPress={() => setActiveTab('History')}
                        >
                            <Text style={styles.tabText}>History</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.tabContent}>
                        {renderContent()}
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#121212',
    },
    container: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1e1e1e',
    },
    userInfoContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    name: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    email: {
        fontSize: 16,
        color: '#a9a9a9',
        marginTop: 4,
    },
    storiesSection: {
        flex: 1,
        width: '100%',
        backgroundColor: '#1e1e1e',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#121212',
    },
    tab: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#c792ea',
    },
    tabText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    tabContent: {
        flex: 1,
        padding: 20,
    },
    storyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    storyCardIcon: {
        marginRight: 15,
    },
    storyCardTextContainer: {
        flex: 1,
    },
    storyTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    storyDescription: {
        color: '#a9a9a9',
        fontSize: 14,
        marginTop: 4,
    },
    emptyListText: {
        color: '#a9a9a9',
        textAlign: 'center',
        marginTop: 40,
        fontStyle: 'italic',
        fontSize: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#c73e3e',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 30,
        marginTop: 10,
    },
    logoutButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
