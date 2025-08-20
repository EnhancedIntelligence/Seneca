/**
 * Server-side API fetch helper
 * Used for fetching data in Server Components
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Server-side API fetch with automatic auth token attachment
 * @param path - API path (relative to APP_URL)
 * @param init - Fetch init options
 * @returns Promise<Response>
 */
export async function apiFetchServer(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const cookieStore = await cookies();
  
  // Create a Supabase client for server-side auth
  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  // Get the current session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Build full URL
  const url = path.startsWith('http') ? path : `${APP_URL}${path}`;

  // Prepare headers with auth token
  const headers = new Headers(init?.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  // Make the fetch request
  return fetch(url, {
    ...init,
    headers,
  });
}