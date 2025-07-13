import { Redirect } from 'expo-router';

// This component will redirect the user from the root of the app to the home tab.
export default function StartPage() {
  // We redirect to "/index" which corresponds to the `app/(tabs)/index.tsx` file.
  // This is a type-safe way to navigate to the initial tab.
  return <Redirect href="/index" />;
}
