import { AntDesign, Feather } from '@expo/vector-icons'; // Import AntDesign for Google icon
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get the loginWithGoogle function from context
  const { login, register, loginWithFacebook, loginWithGoogle } = useAuth();

  const handleAuthAction = async () => {
    if (!email || !password || (isRegistering && !name)) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setIsLoading(true);
    try {
      if (isRegistering) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (error: any) {
      Alert.alert('Authentication Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithFacebook();
    } catch (error: any) {
      Alert.alert('Facebook Login Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Handler for the Google login button
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      Alert.alert('Google Login Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Storybook AI</Text>
      <Text style={styles.subtitle}>{isRegistering ? 'Create an account' : 'Welcome back'}</Text>
      
      {isRegistering && (
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor="#888"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleAuthAction} disabled={isLoading}>
        <Text style={styles.buttonText}>{isLoading ? 'Loading...' : isRegistering ? 'Register' : 'Login'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.facebookButton} onPress={handleFacebookLogin} disabled={isLoading}>
        <Feather name="facebook" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
        <Text style={styles.buttonText}>Login with Facebook</Text>
      </TouchableOpacity>
      
      {/* NEW: Google Login Button */}
      <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} disabled={isLoading}>
        <AntDesign name="google" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
        <Text style={styles.buttonText}>Login with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
        <Text style={styles.toggleText}>
          {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#121212',
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        fontFamily: 'serif',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: '#a9a9a9',
        textAlign: 'center',
        marginBottom: 40,
    },
    input: {
        backgroundColor: '#1e1e1e',
        color: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 10,
        fontSize: 16,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#333',
    },
    button: {
        backgroundColor: '#6200ee',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    facebookButton: {
        backgroundColor: '#3b5998',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 15,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    // NEW: Style for the Google button
    googleButton: {
        backgroundColor: '#DB4437',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 15,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    toggleText: {
        color: '#c792ea',
        textAlign: 'center',
        marginTop: 25,
        fontSize: 16,
    },
});
