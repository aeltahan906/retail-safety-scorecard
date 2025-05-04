
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from "sonner";
import { Session } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { Profile } from '@/types/database';
import { Tables } from "@/integrations/supabase/types";

// Define types
export type UserType = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
} | null;

interface AuthContextType {
  user: UserType;
  session: Session | null;
  profile: Profile | null;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean, error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean, error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean, error?: string }>;
  loading: boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserType>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to fetch user profile. Please try again later.');
        return null;
      }

      if (!data) {
        console.error('No profile data found for user ID:', userId);
        toast.error('No profile found for the current user.');
        return null;
      }

      return data as Profile;
    } catch (error) {
      console.error('Exception in fetchProfile:', error);
      toast.error('An error occurred while fetching the profile.');
      return null;
    }
  };

  // Handle session changes and fetch profile
  const handleSessionChange = async (currentSession: Session | null) => {
    setSession(currentSession);
    if (currentSession?.user) {
      const currentUser = currentSession.user;

      const profileData = await fetchProfile(currentUser.id);
      if (profileData) {
        setProfile(profileData);
        setUser({
          id: currentUser.id,
          email: currentUser.email || '',
          name: profileData.name,
          role: profileData.role as 'admin' | 'user',
        });
      } else {
        setUser({
          id: currentUser.id,
          email: currentUser.email || '',
          name: '',
          role: 'user',
        });
      }
    } else {
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
  };

  // Check for existing session on component mount
  useEffect(() => {
    console.log("AuthProvider initialized");
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log("Auth state changed:", event);
      handleSessionChange(currentSession);
    });

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("Initial session check:", currentSession ? "Session found" : "No session");
      handleSessionChange(currentSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign up function
  const signUp = async (email: string, password: string, name: string): Promise<{ success: boolean, error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return { success: false, error: error.message };
      }

      if (data) {
        toast.success('Registration successful! Please check your email for verification.');
        return { success: true };
      }

      return { success: false, error: 'Unknown error occurred during sign up.' };
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'An error occurred during sign up.');
      return { success: false, error: error.message };
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string): Promise<{ success: boolean, error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        toast.success('Welcome back!');
        return { success: true };
      }

      return { success: false, error: 'Unknown error occurred during sign in.' };
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'An error occurred during sign in.');
      return { success: false, error: error.message };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.info("You've been logged out.");
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error(error.message || 'An error occurred while signing out.');
    }
  };

  // Reset password function
  const resetPassword = async (email: string): Promise<{ success: boolean, error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getSiteUrl()}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        return { success: false, error: error.message };
      }

      toast.success('Password reset instructions sent to your email.');
      return { success: true };
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'An error occurred while resetting the password.');
      return { success: false, error: error.message };
    }
  };

  const contextValue: AuthContextType = {
    user,
    session,
    profile,
    signUp,
    signIn,
    signOut,
    resetPassword,
    loading,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
