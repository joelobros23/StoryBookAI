import { Feather } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

// Define props type for the modal component
type PlayButtonModalProps = {
  visible: boolean;
  onClose: () => void;
};

// Apply the props type to the component
const PlayButtonModal = ({ visible, onClose }: PlayButtonModalProps) => {
  const router = useRouter();
  const handleNavigate = (path) => {
    onClose();
    console.log(`Navigating to ${path}`);
  };
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.modalOption} onPress={() => handleNavigate('/create-story')}>
                <Feather name="plus-circle" size={24} color="#FFFFFF" />
                <Text style={styles.modalOptionText}>Create Story</Text>
              </TouchableOpacity>
              <View style={styles.separator} />
              <TouchableOpacity style={styles.modalOption} onPress={() => handleNavigate('/my-stories')}>
                <Feather name="book" size={24} color="#FFFFFF" />
                <Text style={styles.modalOptionText}>Your Stories</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Replace the entire TabsLayout component with this:
export default function TabsLayout() {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#c792ea',
          tabBarInactiveTintColor: '#a9a9a9',
          tabBarStyle: {
            backgroundColor: '#1e1e1e',
            borderTopWidth: 0,
            height: 90,
            paddingBottom: 10,
          },
        }}
      >
        <Tabs.Screen 
          name="index" 
          options={{ 
            title: 'Home', 
            tabBarIcon: ({ color }) => <Feather name="home" size={28} color={color} /> 
          }} 
        />
        <Tabs.Screen
          name="play"
          options={{
            title: 'Play',
            tabBarIcon: () => (
              <View style={styles.playButtonContainer}>
                <Feather name="play" size={32} color="#FFFFFF" style={{ marginLeft: 4 }}/>
              </View>
            ),
            tabBarLabel: () => null,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setModalVisible(true);
            },
          }}
        />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Feather name="user" size={28} color={color} /> }} />
      </Tabs>
      <PlayButtonModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
    playButtonContainer: {
        backgroundColor: '#6200ee',
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        bottom: 30,
        borderColor: '#121212',
        borderWidth: 4,
        shadowColor: "#6200ee",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 10,
    },
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
    }
});
