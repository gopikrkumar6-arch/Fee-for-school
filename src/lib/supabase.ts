import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database types
export interface Student {
  id: string;
  user_id: string;
  name: string;
  class: string;
  roll_number?: string;
  created_at: string;
  updated_at: string;
}

export interface FeeRecord {
  id: string;
  user_id: string;
  student_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Helper functions
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
