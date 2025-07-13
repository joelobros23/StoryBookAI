import { ID, Models } from 'appwrite';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { account } from '../lib/appwrite';

// Add explicit string types to the function parameters
type AuthContextType = {
  user: Models.User<Models.Preferences> | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, name: string) => Promise<any>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  // Add explicit types to the function implementation parameters
const login = async (email: string, password: string) => {
  try {
    // Clear any existing session first
    await logout();
    
    // Create new session
    await account.createEmailPasswordSession(email, password);
    const currentUser = await account.get();
    setUser(currentUser);
  } catch (error) {
    throw new Error(error.message);
  }
};

  // Add explicit types to the function implementation parameters
  const register = async (email: string, password: string, name: string) => {
    await account.create(ID.unique(), email, password, name);
    return login(email, password);
  };

const logout = async () => {
  try {
    if (user) {
      await account.deleteSession('current');
    }
    setUser(null);
  } catch (error) {
    console.error('Logout error:', error);
  }
};

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
