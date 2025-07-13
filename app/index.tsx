import { Redirect } from 'expo-router';

// This component now uses the declarative Redirect component.
// It redirects the user to a known starting point like the login screen.
// The root layout (_layout.tsx) will then check the authentication status
// and redirect the user to the main app if they are already logged in.
// This approach is safer and avoids the race condition error.
export default function StartPage() {
  return <Redirect href="/login" />;
}
