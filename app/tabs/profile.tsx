import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  // Get the current user and the logout function from the AuthContext
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      // After logout, the useEffect in the root layout will automatically
      // handle redirecting the user to the login screen.
    } catch (error: any) {
      Alert.alert('Logout Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Feather name="user-check" size={80} color="#c792ea" />
      <Text style={styles.title}>Profile</Text>
      
      {user ? (
        <View style={styles.userInfoContainer}>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.info}>{user.name}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.info}>{user.email}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.info}>Loading user data...</Text>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
        <Feather name="log-out" size={20} color="#FFFFFF" style={{ marginLeft: 10 }}/>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 30,
  },
  userInfoContainer: {
    width: '100%',
    marginBottom: 40,
  },
  infoBox: {
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
  },
  label: {
    color: '#a9a9a9',
    fontSize: 14,
    marginBottom: 5,
  },
  info: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c73e3e',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: "#c73e3e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
