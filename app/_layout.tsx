import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';

// --- Best Practice: Keep the splash screen visible until we are ready to render ---
// This prevents the user from seeing a flash of unstyled content.
SplashScreen.preventAutoHideAsync();

const InitialLayout = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // --- Best Practice: Load all necessary assets in your root layout ---
  // This includes fonts, icons, etc.
  const [fontsLoaded, fontError] = useFonts({
    // Add your custom fonts here. I've added a placeholder for the 'serif'
    // font used on your login screen. Replace with the actual file path.
    'serif': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // This effect handles redirection based on auth state.
  useEffect(() => {
    // If there was an error loading fonts, we should log it.
    if (fontError) {
        console.error("Font loading error:", fontError);
    }

    // We wait until both authentication is checked AND fonts are loaded.
    if (isAuthLoading || !fontsLoaded) {
      return; // Do nothing until both are ready
    }

    // Check if the user is currently in the main part of the app (inside the 'tabs' group)
    const inTabsGroup = segments[0] === 'tabs';

    // If the user is logged in but not in the main 'tabs' group, redirect them there.
    if (user && !inTabsGroup) {
      router.replace('/tabs');
    } 
    // If the user is not logged in and is outside the 'login' screen, redirect them to login.
    else if (!user && segments[0] !== 'login') {
      router.replace('/login');
    }

  }, [user, isAuthLoading, fontsLoaded, fontError, segments, router]);


  // --- Best Practice: Hide the splash screen only when everything is ready ---
  // The `onLayout` callback is called after the view has been measured and laid out.
  // This ensures that we hide the splash screen only after the initial layout is complete.
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && !isAuthLoading) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isAuthLoading]);

  // If fonts are not loaded yet or we are still checking auth, we show nothing.
  // The `onLayout` prop on the wrapping View will ensure the splash screen stays visible.
  if (!fontsLoaded || isAuthLoading) {
    return null;
  }

  // If we've reached this point, fonts are loaded and auth is checked.
  // We render the main content of the app.
  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Slot />
    </View>
  );
};

export default function RootLayout() {
  // --- Best Practice: Use SafeAreaProvider at the root of your app ---
  // This is especially important on Android when using `edgeToEdgeEnabled`.
  // It provides better and more reliable inset values.
  return (
    <AuthProvider>
      <SafeAreaProvider>
        {/* Use SafeAreaView from 'react-native-safe-area-context' */}
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
  // The loading container is no longer needed as we return null and let the splash screen cover it.
});
