
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from "sonner";
import { Session, User } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { Profile } from '@/types/database';

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
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as Profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Check for existing session on component mount
  useEffect(() => {
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        
        if (currentSession?.user) {
          const currentUser = currentSession.user;
          
          // Fetch profile data
          setTimeout(async () => {
            const profileData = await fetchProfile(currentUser.id);
            
            if (profileData) {
              setProfile(profileData);
              setUser({
                id: currentUser.id,
                email: currentUser.email || '',
                name: profileData.name,
                role: profileData.role
              });
            } else {
              setUser({
                id: currentUser.id,
                email: currentUser.email || '',
                name: '',
                role: 'user'
              });
            }
          }, 0);
        } else {
          setUser(null);
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      
      if (currentSession?.user) {
        const currentUser = currentSession.user;
        
        // Fetch profile data
        fetchProfile(currentUser.id).then(profileData => {
          if (profileData) {
            setProfile(profileData);
            setUser({
              id: currentUser.id,
              email: currentUser.email || '',
              name: profileData.name,
              role: profileData.role
            });
          } else {
            setUser({
              id: currentUser.id,
              email: currentUser.email || '',
              name: '',
              role: 'user'
            });
          }
          
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
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
            name: name,
          },
        }
      });

      if (error) {
        toast.error(error.message);
        return { success: false, error: error.message };
      }

      if (data) {
        toast.success('Registration successful! Please check your email for verification.');
        return { success: true };
      }

      return { success: false, error: 'Unknown error occurred' };
    } catch (error: any) {
      toast.error(error.message || 'Error during signup');
      return { success: false, error: error.message };
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string): Promise<{ success: boolean, error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast.error(error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        toast.success(`Welcome back!`);
        return { success: true };
      }

      return { success: false, error: 'Unknown error occurred' };
    } catch (error: any) {
      toast.error(error.message || 'Error during sign in');
      return { success: false, error: error.message };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.info("You've been logged out");
    } catch (error: any) {
      toast.error(error.message || 'Error during sign out');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      profile,
      signUp, 
      signIn, 
      signOut, 
      loading 
    }}>
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
