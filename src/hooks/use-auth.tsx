
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

interface UserProfile {
  role?: 'rider' | 'boat_owner' | 'admin' | 'captain';
  // Add other profile fields here as needed
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: UserProfile | null;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profile: null,
  refetchProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (currentUser: User | null) => {
    if (currentUser) {
      try {
        const response = await fetch(`/api/users/${currentUser.uid}`);
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Failed to fetch user profile", error);
        setProfile(null);
      }
    } else {
      setProfile(null);
    }
  }, []);

  const refetchProfile = useCallback(async () => {
    await fetchProfile(user);
  }, [user, fetchProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      await fetchProfile(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, loading, profile, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

    