import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';

const InitialLayout = () => {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait for the auth state to load
    if (isLoading) return;

    const inTabsGroup = segments[0] === '(tabs)';

    // If the user is not signed in and is trying to access a protected route,
    // redirect them to the login page.
    if (!user && inTabsGroup) {
      router.replace('/login');
    } 
    // If the user is signed in and is on a page outside the main tabs (e.g., login),
    // redirect them to the home page inside the tabs group.
    else if (user && !inTabsGroup) {
      // Corrected the path to be more explicit and type-safe.
      router.replace('/(tabs)/index');
    }
  }, [user, isLoading, segments]);

  return <Slot />;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <InitialLayout />
      </SafeAreaView>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});
