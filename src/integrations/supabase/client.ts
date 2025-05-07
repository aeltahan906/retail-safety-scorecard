
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables if available, fallback to hardcoded values for development
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ibhglktotlqvfdnotxxp.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliaGdsa3RvdGxxdmZkbm90eHhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMTk2ODgsImV4cCI6MjA2MTU5NTY4OH0.bfeOsTuShbqrYhuXLe4t_BUj7IPU8S8s44Z9AkJlatw";

// Helper function to determine the current site URL
export const getSiteUrl = () => {
  // Get the current URL
  const url = window.location.origin;
  return url;
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    redirectTo: getSiteUrl()
  }
});
