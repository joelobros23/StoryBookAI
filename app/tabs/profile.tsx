import { Feather } from '@expo/vector-icons';
import { Models, Query } from 'appwrite';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { databaseId, databases, storiesCollectionId } from '../../lib/appwrite';

// Define a type for the story documents for type safety
type Story = Models.Document & {
    title: string;
    description: string;
};

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();
    
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStories = async () => {
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
                        Query.orderDesc('$createdAt') // Show newest stories first
                    ]
                );
                setStories(response.documents as Story[]);
            } catch (error) {
                console.error("Failed to fetch stories:", error);
                Alert.alert("Error", "Could not fetch your stories.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchStories();
    }, [user]); // Refetch stories if the user changes

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

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Feather name="user-check" size={80} color="#c792ea" />
                
                {user ? (
                    <View style={styles.userInfoContainer}>
                        <Text style={styles.name}>{user.name}</Text>
                        <Text style={styles.email}>{user.email}</Text>
                    </View>
                ) : (
                    <Text style={styles.email}>Loading user data...</Text>
                )}

                <View style={styles.storiesSection}>
                    <Text style={styles.sectionTitle}>My Stories</Text>
                    {isLoading ? (
                        <ActivityIndicator size="large" color="#c792ea" style={{ marginTop: 20 }}/>
                    ) : (
                        <FlatList
                            data={stories}
                            renderItem={renderStoryItem}
                            keyExtractor={(item) => item.$id}
                            ListEmptyComponent={<Text style={styles.emptyListText}>You haven't created any stories yet.</Text>}
                            scrollEnabled={false} // The outer ScrollView will handle scrolling
                        />
                    )}
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>Logout</Text>
                    <Feather name="log-out" size={20} color="#FFFFFF" style={{ marginLeft: 10 }}/>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#121212',
    },
    container: {
        alignItems: 'center',
        padding: 20,
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
        width: '100%',
        backgroundColor: '#1e1e1e',
        borderRadius: 15,
        padding: 20,
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 15,
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
        marginTop: 20,
        fontStyle: 'italic',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#c73e3e',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
    },
    logoutButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
