import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { databaseId, databases, storiesCollectionId } from '../../lib/appwrite';
import { createNewSession } from '../../lib/history';
import { StoryDocument } from '../types/story'; // FIX: Corrected import path

export default function StoryInfoScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [story, setStory] = useState<StoryDocument | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStory = async () => {
            if (!id) {
                Alert.alert("Error", "Story ID is missing.");
                setIsLoading(false);
                return;
            }
            try {
                const fetchedStory = await databases.getDocument(databaseId, storiesCollectionId, id) as StoryDocument;
                setStory(fetchedStory);
            } catch (error) {
                console.error("Failed to fetch story details:", error);
                Alert.alert("Error", "Could not load story details.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchStory();
    }, [id]);

    const handlePlay = async () => {
        if (!story) return;
        try {
            // This creates a new, unique session in your local history
            const newSession = await createNewSession(story);
            // FIX: Navigate to the play screen with the correct typed route syntax
            router.push({
                pathname: '/play/[sessionId]',
                params: { sessionId: newSession.sessionId, story: JSON.stringify(story) }
            });
        } catch (error) {
            Alert.alert("Error", "Could not start a new session.");
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#c792ea" />
            </View>
        );
    }

    if (!story) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>Story not found.</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Feather name="chevron-left" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.title} numberOfLines={2}>{story.title}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Description</Text>
                    <Text style={styles.cardText}>{story.description || "No description provided."}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Opening Scene</Text>
                    <Text style={styles.cardText}>{story.opening || "No opening scene provided."}</Text>
                </View>
                
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Tags</Text>
                    <Text style={styles.cardText}>{story.tags || "No tags provided."}</Text>
                </View>

                <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
                    <Text style={styles.playButtonText}>Play</Text>
                    <Feather name="play" size={22} color="#FFFFFF" style={{ marginLeft: 10 }}/>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        padding: 5,
        marginRight: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        flex: 1,
    },
    card: {
        backgroundColor: '#1e1e1e',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#c792ea',
        marginBottom: 10,
    },
    cardText: {
        fontSize: 16,
        color: '#e0e0e0',
        lineHeight: 24,
    },
    playButton: {
        flexDirection: 'row',
        backgroundColor: '#6200ee',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    playButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#ff6b6b',
        fontSize: 18,
    },
});
