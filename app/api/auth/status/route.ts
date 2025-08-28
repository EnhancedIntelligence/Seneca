/**
 * Auth Status Route Handler
 * Provides current authentication and subscription status
 * Used by client-side auth checks and status monitoring
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/subscription';

// Force Node.js runtime (required for Supabase SSR)
export const runtime = 'nodejs';
// Force dynamic rendering to prevent caching auth state
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/status
 * Returns current user authentication and subscription status
 * 
 * Response:
 * - authenticated: boolean - whether user has valid session
 * - active: boolean - whether user has active subscription
 * - subscription: object | null - subscription details if authenticated
 * - userId: string | null - user ID if authenticated
 */
export async function GET() {
  try {
    const { user, hasAccess, subscription } = await requireAuth();
    
    const response = NextResponse.json({
      authenticated: !!user,
      active: hasAccess,
      subscription: subscription ?? null,
      userId: user?.id ?? null,
    });
    
    // Prevent any caching of auth status
    response.headers.set('Cache-Control', 'no-store');
    // Indicate response varies by cookie (session-dependent)
    response.headers.set('Vary', 'Cookie');
    
    return response;
  } catch (error) {
    // Log error but don't expose details to client
    console.error('[AUTH_STATUS] Error checking auth status:', error);
    
    // Return safe error response
    const errorResponse = NextResponse.json(
      { 
        authenticated: false,
        active: false,
        subscription: null,
        userId: null,
        error: 'Failed to check auth status' 
      }, 
      { status: 500 }
    );
    
    // Also prevent caching on error responses
    errorResponse.headers.set('Cache-Control', 'no-store');
    errorResponse.headers.set('Vary', 'Cookie');
    
    return errorResponse;
  }
}