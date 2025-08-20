import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Force Node.js runtime to avoid Edge + Supabase issues
export const runtime = 'nodejs';

/**
 * Sanitizes redirect paths to prevent open redirects
 * Only allows same-origin relative paths
 */
function sanitizeNext(next: string, req: NextRequest): string {
  try {
    const u = new URL(next, req.url);
    return u.origin === new URL(req.url).origin 
      ? (u.pathname + u.search + u.hash) 
      : '/';
  } catch { 
    return '/'; 
  }
}

/**
 * Auth Callback Route
 * Handles OAuth and magic link code exchange for session establishment
 * Supports multiple Supabase client versions
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawNext = url.searchParams.get('next') ?? '/';
  
  // Decode the next parameter (it was encoded by the client)
  const decodedNext = (() => { 
    try { 
      return decodeURIComponent(rawNext); 
    } catch { 
      return '/'; 
    } 
  })();
  
  const safe = sanitizeNext(decodedNext, req);
  
  const supabase = await createClient();
  
  // Support both Supabase signatures: with code param or no-arg
  const code = url.searchParams.get('code') ?? '';
  const fn: any = supabase.auth.exchangeCodeForSession;
  
  // Check function signature to support different Supabase versions
  const { error } = fn.length > 0 
    ? await fn(code) 
    : await fn();
  
  if (error) {
    const msg = encodeURIComponent(error.message || 'Auth exchange failed');
    return NextResponse.redirect(new URL(`/login?error=${msg}`, req.url));
  }
  
  return NextResponse.redirect(new URL(safe, req.url));
}