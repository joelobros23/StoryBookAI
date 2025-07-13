import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();

  const handleStartNewStory = () => {
    // Navigate to the story creation screen (we'll create this next)
    // router.push('/story'); 
    console.log("Starting a new story!");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Storybook AI</Text>
          <Text style={styles.subtitle}>Your collaborative storyteller</Text>
        </View>

        <View style={styles.card}>
            <Feather name="book-open" size={48} color="#c792ea" />
            <Text style={styles.cardText}>
                Create immersive and interactive stories with the power of AI. Your adventure awaits!
            </Text>
        </View>


        <TouchableOpacity style={styles.button} onPress={handleStartNewStory}>
          <Text style={styles.buttonText}>Start New Story</Text>
          <Feather name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: 10 }}/>
        </TouchableOpacity>

        <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Features</Text>
            <View style={styles.featureItem}>
                <Feather name="edit" size={24} color="#89ddff" />
                <Text style={styles.featureText}>Dynamic story generation</Text>
            </View>
            <View style={styles.featureItem}>
                <Feather name="git-branch" size={24} color="#82aaff" />
                <Text style={styles.featureText}>Multiple story branches</Text>
            </View>
             <View style={styles.featureItem}>
                <Feather name="save" size={24} color="#c3e88d" />
                <Text style={styles.featureText}>Save and continue later</Text>
            </View>
        </View>
      </ScrollView>
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
    justifyContent: 'center',
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
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  cardText: {
    color: '#e0e0e0',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 24,
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
  featuresContainer: {
    width: '100%',
    backgroundColor: '#1e1e1e',
    borderRadius: 15,
    padding: 20,
  },
  featuresTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureText: {
    fontSize: 16,
    color: '#d0d0d0',
    marginLeft: 15,
  },
});
