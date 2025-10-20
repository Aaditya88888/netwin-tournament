import React, { createContext, useContext, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { API_ENDPOINTS } from '@/config/api';
import { auth } from '@/config/firebase';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, getIdTokenResult } from 'firebase/auth';
import { AdminUser } from '@shared/types';


interface AdminAuthContextType {
  user: AdminUser | null;
  loading: boolean;
  token: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('adminUser');
      const user = savedUser ? JSON.parse(savedUser) : null;
      console.log('AdminAuthContext - Initial user from localStorage:', user);
      return user;
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      const savedToken = localStorage.getItem('adminToken');
      console.log('AdminAuthContext - Initial token from localStorage:', savedToken ? 'exists' : 'none');
      return savedToken;
    } catch (error) {
      console.error('Error getting token from localStorage:', error);
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const signIn = async (username: string, password: string) => {
    try {
      setLoading(true);
      console.log('Attempting Firebase login with:', { username });
      // Use Firebase Auth for login
      // For this example, treat username as email
      const email = username;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      // Fetch custom claims
      const idTokenResult = await getIdTokenResult(firebaseUser);
      const role = idTokenResult.claims.role;
      if (role !== 'admin' && role !== 'moderator') {
        await firebaseSignOut(auth);
        setUser(null);
        setToken(null);
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You are not authorized to access the admin panel.",
        });
        throw new Error('Not authorized');
      }
      const adminUser: AdminUser = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || username,
        email: firebaseUser.email || '',
        role: (role as 'admin' | 'moderator') || 'admin',
        createdAt: new Date().toISOString(),
      };
      const idToken = await firebaseUser.getIdToken();
      localStorage.setItem('adminUser', JSON.stringify(adminUser));
      localStorage.setItem('adminToken', idToken);
      setUser(adminUser);
      setToken(idToken);
      console.log('Firebase authentication successful');
      return;
      // ---
      // Old API login logic below (commented out)
      /*
      // Always try API call first
      try {
        console.log('Making API request to:', API_ENDPOINTS.login);
        const response = await fetch(API_ENDPOINTS.login, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });
        if (response.ok) {
          const data = await response.json();
          console.log('API login successful:', data);
          // Store auth data
          sessionStorage.setItem('adminUser', JSON.stringify(data.user));
          sessionStorage.setItem('adminToken', data.token);
          // Update state
          setUser(data.user);
          setToken(data.token);
          console.log('API authentication successful');
          return;
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
          throw new Error(errorData.message || `Login failed with status ${response.status}`);
        }
      } catch (error) {
        console.error('API request failed:', error);
        throw error; // Re-throw API errors instead of falling back
      }
      */
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message || "Failed to sign in",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    firebaseSignOut(auth);
    setUser(null);
    setToken(null);
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');
    console.log('Authentication data cleared');
  };

  const value = {
    user,
    loading,
    token,
    signIn,
    signOut,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};
