import { ID, Models } from 'appwrite';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
// FIX: Import everything needed from the appwrite config file
import * as WebBrowser from 'expo-web-browser';
import { account, appwriteEndpoint, appwriteProjectId } from '../lib/appwrite';

type AuthContextType = {
  user: Models.User<Models.Preferences> | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  loginWithFacebook: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<any>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  let isMounted = true;
  const checkSession = async () => {
    try {
      const currentUser = await account.get();
      if (isMounted) setUser(currentUser);
    } catch {
      if (isMounted) setUser(null);
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };
  checkSession();
  return () => { isMounted = false };
}, []);

const login = async (email: string, password: string) => {
  try {
    await logout();
    await account.createEmailPasswordSession(email, password);
    const currentUser = await account.get();
    setUser(currentUser);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

  const loginWithFacebook = async () => {
    try {
      const successUrl = 'appwrite-callback-68731f5800079a29af20://callback';
      const failureUrl = 'appwrite-callback-68731f5800079a29af20://fallback';

      const authUrl = `${appwriteEndpoint}/account/sessions/oauth2/facebook?project=${appwriteProjectId}&success=${encodeURIComponent(successUrl)}&failure=${encodeURIComponent(failureUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, successUrl);

      if (result.type === 'success') {
        const currentUser = await account.get();
        setUser(currentUser);
      } else {
        console.log('Facebook login was cancelled or failed.', result);
      }
    } catch (error: any) {
      console.error('Facebook login error:', error);
      throw new Error(error.message);
    }
  };

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
    <AuthContext.Provider value={{ user, isLoading, login, loginWithFacebook, register, logout }}>
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
