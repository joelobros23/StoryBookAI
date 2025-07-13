import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';

const InitialLayout = () => {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    
    const inAuthGroup = segments[0] === 'login';
    
    if (user && inAuthGroup) {
      router.replace('/'); // Redirect to root
    } else if (!user && !inAuthGroup) {
      router.replace('/login');
    }
  }, [user, isLoading, segments]);

  return isLoading ? <View /> : <Slot />;
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