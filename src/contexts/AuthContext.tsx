
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database'; 
import { toast } from 'sonner';

// Define types for auth context
interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize auth state
  useEffect(() => {
    console.info("AuthProvider initialized");
    
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking session:", error.message);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        console.info("Initial session check:", session ? "Session found" : "No session");
        
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("Unexpected error in initializeAuth:", error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.info("Auth state changed:", event);
        
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );
    
    // Cleanup listener on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);
  
  // Fetch user profile from database
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error.message);
        return;
      }
      
      setProfile(data as Profile);
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
    }
  };
  
  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error("Sign in error:", error.message);
        toast.error(error.message);
        return false;
      }
      
      toast.success("Signed in successfully!");
      return true;
    } catch (error: any) {
      console.error("Unexpected error in signIn:", error);
      toast.error(error.message || "An error occurred during sign in");
      return false;
    }
  };
  
  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Sign out error:", error.message);
        toast.error(error.message);
        return;
      }
      
      setUser(null);
      setProfile(null);
      toast.success("Signed out successfully!");
    } catch (error: any) {
      console.error("Unexpected error in signOut:", error);
      toast.error(error.message || "An error occurred during sign out");
    }
  };
  
  // Sign up with email and password
  const signUp = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error("Sign up error:", error.message);
        toast.error(error.message);
        return false;
      }
      
      const user = data.user;
      
      if (user) {
        // Create an initial profile in the database
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name,
            role: 'user',
          });
        
        if (profileError) {
          console.error("Error creating profile:", profileError.message);
          toast.error("Failed to create user profile");
          return false;
        }
      }
      
      toast.success("Account created successfully!");
      return true;
    } catch (error: any) {
      console.error("Unexpected error in signUp:", error);
      toast.error(error.message || "An error occurred during sign up");
      return false;
    }
  };
  
  // Reset password
  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        console.error("Reset password error:", error.message);
        toast.error(error.message);
        return false;
      }
      
      toast.success("Password reset email sent!");
      return true;
    } catch (error: any) {
      console.error("Unexpected error in resetPassword:", error);
      toast.error(error.message || "An error occurred during password reset");
      return false;
    }
  };

  // Log auth state for debugging
  useEffect(() => {
    console.info("Auth state:", { user, loading });
  }, [user, loading]);
  
  // Provide auth context to components
  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signOut,
        signUp,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
};
