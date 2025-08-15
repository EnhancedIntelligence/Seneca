import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.generated'
import { supabaseConfig } from './env'

export const supabase = createClient<Database>(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    db: { schema: 'public' },
    global: { headers: { 'x-client-info': 'seneca-web' } },
  }
)


