
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/database";
import { toast } from "sonner";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Check if there's an active session first
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session fetch error:", sessionError);
          setError(sessionError);
          setLoading(false);
          return;
        }
        
        if (!sessionData.session) {
          console.log("No active session found");
          setLoading(false);
          return;
        }
        
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("User fetch error:", userError);
          setError(userError);
          setLoading(false);
          return;
        }

        if (!user) {
          console.log("No authenticated user found");
          setLoading(false);
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Profile fetch error:", profileError);
          
          // If profile doesn't exist, we might need to create one
          if (profileError.code === "PGRST116") {
            console.log("Profile not found, might need to create one");
            toast.error("User profile not found. Please contact support.");
          } else {
            toast.error("Failed to load profile data");
          }
          
          setError(profileError);
          setLoading(false);
          return;
        }

        if (!data) {
          console.log("No profile data found for user:", user.id);
          toast.error("No profile data found");
          setLoading(false);
          return;
        }

        setProfile(data as Profile);
      } catch (err) {
        console.error("Exception in fetchProfile:", err);
        setError(err);
        toast.error("An unexpected error occurred while fetching your profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return { profile, loading, error };
}
