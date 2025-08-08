import { createClient } from '@supabase/supabase-js'
import { supabaseConfig } from './env'
import type { Database } from './database.generated'

// Client-side Supabase client
export const supabase = createClient<Database>(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-client-info': 'seneca-protocol@1.0.0',
      },
    },
  }
)

// Server-side admin client is now in server-only module
// Use: import { createAdminClient } from '@/lib/server-only/admin-client'