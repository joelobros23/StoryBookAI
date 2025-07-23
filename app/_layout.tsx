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
SplashScreen.preventAutoHideAsync();

const InitialLayout = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    'serif': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // This effect handles redirection based on auth state.
  useEffect(() => {
    if (fontError) {
        console.error("Font loading error:", fontError);
    }

    if (isAuthLoading || !fontsLoaded) {
      return;
    }

    // MODIFIED: Added 'generate-creation' to the list of allowed routes.
    // This prevents the layout from redirecting away from the new screen after navigation.
    const allowedAppRoutes = ['tabs', 'intro', 'play', 'create-story', 'generate-creation'];
    const inApp = segments.length > 0 && allowedAppRoutes.includes(segments[0] as string);

    if (user && !inApp) {
      router.replace('/tabs');
    }
    else if (!user && segments[0] !== 'login') {
      router.replace('/login');
    }

  }, [user, isAuthLoading, fontsLoaded, fontError, segments, router]);


  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && !isAuthLoading) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isAuthLoading]);

  if (!fontsLoaded || isAuthLoading) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Slot />
    </View>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
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
});
