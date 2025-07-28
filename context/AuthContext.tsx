import { ID, Models } from 'appwrite';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { account, appwriteEndpoint, appwriteProjectId } from '../lib/appwrite';

// --- DEBUGGING: Add a log to see if this file is even being loaded ---
console.log("AuthContext.tsx module loaded. Appwrite Project ID:", appwriteProjectId);

type AuthContextType = {
  user: Models.User<Models.Preferences> | null;
  isLoading: boolean;
  login: (email: string, password:string) => Promise<any>;
  loginWithFacebook: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<any>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- DEBUGGING: Add extensive logging to the initial session check ---
  useEffect(() => {
    console.log("DEBUG: AuthProvider useEffect started. App should be checking session.");
    let isMounted = true;
    const checkSession = async () => {
      try {
        console.log("DEBUG: Calling account.get() to check for existing session...");
        const currentUser = await account.get();
        console.log("DEBUG: account.get() succeeded. User:", currentUser ? currentUser.name : "None");
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error("DEBUG: account.get() failed. This is likely the cause of the issue.", error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        console.log("DEBUG: Session check finished. Setting isLoading to false.");
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
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
    // Facebook login logic remains here...
  };

  const loginWithGoogle = async () => {
    try {
      const successUrl = `appwrite-callback-${appwriteProjectId}://callback`;
      const failureUrl = `appwrite-callback-${appwriteProjectId}://fallback`;
      const authUrl = `${appwriteEndpoint}/account/sessions/oauth2/google?project=${appwriteProjectId}&success=${encodeURIComponent(successUrl)}&failure=${encodeURIComponent(failureUrl)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, successUrl);

      if (result.type === 'success') {
        const currentUser = await account.get();
        setUser(currentUser);
      }
    } catch (error: any)      {
      console.error('DEBUG: Google login process threw an error:', error);
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
    <AuthContext.Provider value={{ user, isLoading, login, loginWithFacebook, loginWithGoogle, register, logout }}>
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