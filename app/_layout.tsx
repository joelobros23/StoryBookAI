import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

/**
 * This is the component that will consume the auth context.
 * It MUST be a child of AuthProvider.
 */
const InitialLayout = () => {
  // useAuth() hook will look for the nearest AuthProvider up the component tree.
  const { user, isLoading: isAuthLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    'serif': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Effect to handle redirection based on authentication state
  useEffect(() => {
    // Exit early if assets or auth state are not ready
    if (isAuthLoading || !fontsLoaded) {
      return;
    }
    if (fontError) {
        console.error("Font loading error:", fontError);
        // You might want to handle this error, e.g., show a message
    }

    const inApp = segments.length > 0 && segments[0] !== 'login';

    if (user && !inApp) {
      // Redirect authenticated users to the main app
      router.replace('/tabs');
    } else if (!user && inApp) {
      // Redirect unauthenticated users to the login screen
      router.replace('/login');
    }
  }, [user, isAuthLoading, fontsLoaded, fontError, segments, router]);

  // Hide the splash screen once everything is loaded
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && !isAuthLoading) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isAuthLoading]);

  // If fonts haven't loaded or auth is still loading, return null to keep showing the splash screen
  if (!fontsLoaded || isAuthLoading) {
    return null;
  }

  // Render the currently active route
  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Slot />
    </View>
  );
};

/**
 * This is the root layout component for the entire app.
 * It sets up the providers that will be available to all other components.
 */
export default function RootLayout() {
  return (
    // AuthProvider provides authentication context to all children
    <AuthProvider>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          {/* InitialLayout is a child of AuthProvider, so it can use the useAuth hook */}
          <InitialLayout />
        </SafeAreaView>
      </SafeAreaProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
