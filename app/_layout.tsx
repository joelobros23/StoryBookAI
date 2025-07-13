import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, SafeAreaView, StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // A dark background color
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
});
