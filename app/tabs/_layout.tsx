import { Feather } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { handleQuickStart } from '../../lib/quickstart';

// --- Genre Selection Modal ---
// MODIFIED: Added "Romance" to the genre list
const GENRES = ["Adventure", "Horror", "Modern Day Drama", "Medieval Drama", "Action", "Sci-fi", "Fairy Tale", "Romance"];

type QuickStartModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectGenre: (genre: string) => void;
};

const QuickStartModal = ({ visible, onClose, onSelectGenre }: QuickStartModalProps) => (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Choose a Genre</Text>
                        <FlatList
                            data={GENRES}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalOption} onPress={() => onSelectGenre(item)}>
                                    <Text style={styles.modalOptionText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    router.push(path);
    onClose();
  };
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.modalOption} onPress={onQuickStart}>
                <Feather name="zap" size={24} color="#FFFFFF" />
                <Text style={styles.modalOptionText}>Quick Start</Text>
              </TouchableOpacity>
              <View style={styles.separator} />
              <TouchableOpacity style={styles.modalOption} onPress={() => handleNavigate('/create-story')}>
                <Feather name="plus-circle" size={24} color="#FFFFFF" />
                <Text style={styles.modalOptionText}>Create Story</Text>
              </TouchableOpacity>
              <View style={styles.separator} />
              <TouchableOpacity style={styles.modalOption} onPress={() => handleNavigate('/tabs/profile')}>
                <Feather name="book" size={24} color="#FFFFFF" />
                <Text style={styles.modalOptionText}>Creations & History</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// --- Main Tabs Layout ---
export default function TabsLayout() {
  const [playModalVisible, setPlayModalVisible] = useState(false);
  const [quickStartModalVisible, setQuickStartModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const openQuickStart = () => {
    setPlayModalVisible(false);
    setQuickStartModalVisible(true);
  };

  const onGenreSelect = async (genre: string) => {
    setQuickStartModalVisible(false);
    if (!user) return;

    // MODIFIED: Added logic to determine the tag and pass all 4 arguments
    let tag = genre;
    if (genre === "Modern Day Drama") {
        tag = "Drama, 21st Century";
    } else if (genre === "Medieval Drama") {
        tag = "Drama, Medieval Times";
    } else if (genre === "Romance") {
        tag = "Romance, Drama";
    }

    setIsGenerating(true);
    await handleQuickStart(genre, tag, user, router);
    setIsGenerating(false);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#c792ea',
          tabBarInactiveTintColor: '#a9a9a9',
          tabBarStyle: { backgroundColor: '#1e1e1e', borderTopWidth: 0, height: 90, paddingBottom: 10 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Feather name="home" size={28} color={color} /> }} />
        <Tabs.Screen
          name="play"
          options={{ title: 'Play', tabBarIcon: ({ color }) => <Feather name="play" size={28} color={color} /> }}
          listeners={{ tabPress: (e) => { e.preventDefault(); setPlayModalVisible(true); } }}
        />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Feather name="user" size={28} color={color} /> }} />
      </Tabs>
      
      <PlayButtonModal visible={playModalVisible} onClose={() => setPlayModalVisible(false)} onQuickStart={openQuickStart} />
      <QuickStartModal visible={quickStartModalVisible} onClose={() => setQuickStartModalVisible(false)} onSelectGenre={onGenreSelect} />

      {isGenerating && (
        <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Generating your adventure...</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
