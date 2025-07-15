// app/play/_layout.tsx
import { Stack } from 'expo-router';

export default function PlayLayout() {
  return (
    <Stack>
      <Stack.Screen name="[sessionId]" options={{ headerShown: false }} />
      <Stack.Screen name="edit-story" options={{ headerShown: false }} />
    </Stack>
  );
}