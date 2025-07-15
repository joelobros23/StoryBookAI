import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or loading spinner
  }

  return user ? <Redirect href="/tabs" /> : <Redirect href="/login" />;
}