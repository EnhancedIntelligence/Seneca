import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.generated";
import { supabaseConfig } from "./env";

// Debug logging in development to help troubleshoot connection issues
if (process.env.NODE_ENV !== "production") {
  const url = supabaseConfig.url || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (url) {
    // Redact the project reference for security
    const redacted = url.replace(/:\/\/([^.]*)\./, "://***.");
    console.log("[Supabase] Connecting to:", redacted);
  } else {
    console.warn(
      "[Supabase] No URL configured - check NEXT_PUBLIC_SUPABASE_URL",
    );
  }
}

export const supabase = createClient<Database>(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    db: { schema: "public" },
    global: { headers: { "x-client-info": "seneca-web" } },
  },
);
