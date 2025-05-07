
import { createClient } from '@supabase/supabase-js';
import { toast } from "sonner";

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Ensure the environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase URL or Anonymous Key is missing. Make sure you have set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment."
  );
  
  // For development, you might want to use default values
  if (import.meta.env.DEV) {
    console.warn("Using placeholder values for development purposes only.");
  }
}

// Create the Supabase client
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      // Removed redirectTo as it's not supported in the current API version
    },
  }
);

// Add a helper method to handle auth state changes
export const setupAuthListener = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

// Export a function to handle errors gracefully
export const handleSupabaseError = (error: any, customMessage?: string) => {
  console.error('Supabase error:', error);
  toast.error(customMessage || 'An error occurred');
  return null;
};
