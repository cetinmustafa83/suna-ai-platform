'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback, // Added useCallback
} from 'react';
// import { createClient } from '@/lib/supabase/client'; // Supabase client removed
// import { User, Session } from '@supabase/supabase-js'; // Supabase types removed
// import { SupabaseClient } from '@supabase/supabase-js'; // Supabase client type removed
import * as LocalAuth from '@/lib/auth'; // Import local auth functions
import { usePathname, useRouter } from 'next/navigation'; // Added for potential redirects

type AuthContextType = {
  // supabase: SupabaseClient; // Supabase client removed
  // session: Session | null; // Session concept might be different or not needed for mock
  user: LocalAuth.MockUser | null;
  isLoading: boolean;
  login: (email: string, name?: string) => LocalAuth.MockUser; // Added local login
  signOut: () => Promise<void>; // Keep signOut, but implement locally
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // const supabase = createClient(); // Supabase client removed
  // const [session, setSession] = useState<Session | null>(null); // Session removed
  const [user, setUser] = useState<LocalAuth.MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter(); // Added for potential redirects
  const pathname = usePathname(); // Added for potential redirects

  useEffect(() => {
    setIsLoading(true);

    const unsubscribe = LocalAuth.onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setIsLoading(false);

      // Optional: Handle redirects based on auth state and current path
      // This logic might be better placed in middleware or page components
      // if (!currentUser && pathname !== '/auth' && pathname !== '/') {
      //   router.push('/auth');
      // } else if (currentUser && pathname === '/auth') {
      //   router.push('/dashboard');
      // }
    });

    // Cleanup listener on component unmount
    return () => {
      unsubscribe();
    };
  }, [router, pathname]); // Dependencies updated for local auth

  const handleLogin = useCallback((email: string, name?: string): LocalAuth.MockUser => {
    const loggedInUser = LocalAuth.login(email, name);
    // setUser(loggedInUser); // onAuthStateChange will handle this
    // Potentially redirect here or let the calling component handle it
    // router.push('/dashboard');
    return loggedInUser;
  }, []);

  const handleSignOut = useCallback(async () => {
    await LocalAuth.logout();
    // setUser(null); // onAuthStateChange will handle this
    // router.push('/auth'); // Redirect to login after sign out
  }, []);


  const value = {
    // supabase, // Supabase client removed
    // session, // Session removed
    user,
    isLoading,
    login: handleLogin, // Added local login
    signOut: handleSignOut, // Using local signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
