import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.generated";

function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Supabase client for browser usage.
 * This client is used for authentication and database operations.
 * Make sure to set the environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * in your .env file for the client to work properly.
 */
export const supabase = createClient();
