import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.generated";
import { supabaseConfig } from "../env";

// Create a singleton admin client for server-side use only
let singleton: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  if (!singleton) {
    const url = supabaseConfig.url;
    const key = supabaseConfig.serviceRoleKey;

    if (!url || !key) {
      // Avoid throwing at import time; callers will get a clearer error when used
      // but initialize with empty values to keep build-time happy.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      singleton = createClient<Database>(
        url || "http://localhost",
        key || "invalid",
      );
    } else {
      singleton = createClient<Database>(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
        db: { schema: "public" },
        global: { headers: { "x-client-info": "seneca-admin" } },
      });
    }
  }
  return singleton!;
}
