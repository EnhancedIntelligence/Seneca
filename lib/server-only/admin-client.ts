import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../env";
import type { Database } from "../database.generated";

export const adminClient = createClient<Database>(
  supabaseConfig.url,
  supabaseConfig.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
    global: {
      headers: {
        "x-client-info": "seneca-protocol-admin@1.0.0",
      },
    },
  }
);

export function createAdminClient() {
  return adminClient;
}

// Singleton instance for server-side use
let adminClientInstance: ReturnType<typeof createAdminClient> | null = null;

export function getAdminClient() {
  if (!adminClientInstance) {
    adminClientInstance = createAdminClient();
  }
  return adminClientInstance;
}
