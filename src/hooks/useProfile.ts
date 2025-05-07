
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

interface UseProfileResult {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
  refetchProfile: () => Promise<void>;
}

export const useProfile = (): UseProfileResult => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user) {
      setLoading(false);
      setProfile(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setError(error.message);
        return;
      }

      setProfile(data as Profile);
    } catch (err: any) {
      console.error('Exception in fetchProfile:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch profile when component mounts or user changes
  useEffect(() => {
    fetchProfile();
  }, [user]);

  // Function to update user profile
  const updateProfile = async (updates: Partial<Profile>): Promise<boolean> => {
    if (!user) {
      setError('User is not authenticated');
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        setError(error.message);
        return false;
      }

      // Update local state with the changes
      setProfile(currentProfile => 
        currentProfile ? { ...currentProfile, ...updates } : null
      );
      return true;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'An unexpected error occurred');
      return false;
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetchProfile: fetchProfile
  };
};
