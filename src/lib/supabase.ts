import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create and export the Supabase client with proper configuration
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: localStorage,
    
  },
  global: {
    headers: {
      'x-application-name': 'tmechs-monitor',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Add error handling for failed requests
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
  
  }
})
