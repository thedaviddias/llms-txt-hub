import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabase: ReturnType<typeof createClient>

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials are missing. Some features may not work correctly.")
  console.warn("Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables.")

  // Create a mock client that logs warnings instead of throwing errors
  supabase = {
    auth: {
      signInWithOAuth: () => {
        console.warn("Auth is not available due to missing Supabase credentials.")
        return Promise.resolve({ error: new Error("Auth is not available") })
      },
      signOut: () => {
        console.warn("Auth is not available due to missing Supabase credentials.")
        return Promise.resolve({ error: new Error("Auth is not available") })
      },
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        console.warn("Auth state change listener is not available due to missing Supabase credentials.")
        return {
          data: { subscription: { unsubscribe: () => {} } },
          error: null,
        }
      },
      // Add other auth methods as needed
    },
    // Add other Supabase client methods as needed
  } as any
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase }

