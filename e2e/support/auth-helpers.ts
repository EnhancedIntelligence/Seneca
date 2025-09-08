/**
 * E2E Test Helpers for Authentication
 * Provides utilities for real magic link flows and test user management
 */

import { Page } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { USERNAME_REGEX } from '@/lib/validation/onboarding';
import type { Database } from '@/lib/database.generated';

// Environment configuration with early validation
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Fail fast with clear messages if env is misconfigured
if (!SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for E2E tests');
if (!SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required for E2E tests');

/**
 * Create admin Supabase client for test operations
 * @throws Error if service role key is not configured
 */
export function createAdminClient(): SupabaseClient<Database> {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY required for E2E tests that use admin APIs');
  }
  return createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY);
}

/**
 * Generate and follow a real magic link for authentication
 * Uses Supabase admin API to create a real action link
 * 
 * @param page - Playwright page object
 * @param email - User email to authenticate
 * @param type - Link type: 'magiclink' for login, 'signup' for new user
 * @param next - Optional redirect path after auth
 * @returns User ID of the authenticated user
 */
export async function followMagicLink(
  page: Page,
  email: string,
  type: 'magiclink' | 'signup' = 'magiclink',
  next?: `/${string}`
): Promise<string> {
  const admin = createAdminClient();
  
  // Build redirect URL with trailing slash safety
  const baseUrl = BASE_URL.replace(/\/$/, '');
  const redirectTo = next
    ? `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`
    : `${baseUrl}/auth/callback`;
  
  // Supabase types: 'signup' requires a password. For passwordless OTP flow,
  // always request a magic link; simulate "signup" by ensuring the user exists.
  const linkType = 'magiclink' as const;
  
  let userId = '';
  
  // For 'signup' mode, ensure user exists first
  if (type === 'signup') {
    try {
      const { data: userData } = await admin.auth.admin.createUser({ 
        email, 
        email_confirm: true 
      });
      userId = userData?.user?.id || '';
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      // Only ignore known duplicate/exists errors
      if (!/already|exist/i.test(msg)) throw e;
    }
  }
  
  // Generate real magic link via admin API
  let { data, error } = await admin.auth.admin.generateLink({
    type: linkType,
    email,
    options: { redirectTo },
  });
  
  // Fallback: some configs require an existing user to produce action_link
  if (error || !((data as any)?.properties?.action_link || (data as any)?.action_link)) {
    try {
      const { data: userData } = await admin.auth.admin.createUser({ 
        email, 
        email_confirm: true 
      });
      userId = userId || userData?.user?.id || '';
    } catch {
      // ignore if already exists
    }
    // Retry link generation
    ({ data, error } = await admin.auth.admin.generateLink({
      type: linkType,
      email,
      options: { redirectTo },
    }));
  }
  
  // Handle different SDK versions (properties.action_link vs action_link)
  const link = (data as any)?.properties?.action_link ?? (data as any)?.action_link;
  
  if (error || !link) {
    throw new Error(`Failed to generate magic link: ${error?.message ?? 'no action_link'}`);
  }
  
  // Navigate to the magic link (will redirect to our callback)
  await page.goto(link, { waitUntil: 'load' });
  
  // Wait for auth callback to complete routing to final destination
  await page.waitForURL(/\/(auth\/callback|onboarding|overview)(\?|$)/, { 
    timeout: 15_000,
    waitUntil: 'networkidle' 
  });
  
  // Return the user ID for cleanup (fallback to data.user.id if not captured earlier)
  return userId || data?.user?.id || '';
}

/**
 * Create a test user with optional onboarding completion
 * 
 * @param email - User email
 * @param options - Configuration options
 * @returns User ID for cleanup
 */
export async function createTestUser(
  email: string,
  options: {
    onboardingCompleted?: boolean;
    username?: string;
    fullName?: string;
    dateOfBirth?: string;
  } = {}
): Promise<string> {
  const admin = createAdminClient();
  
  // Create user via admin API
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  
  if (authError || !authData?.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }
  
  const userId = authData.user.id;
  
  // Ensure members row exists (upsert with no updates on conflict)
  const { error: insertError } = await admin
    .from('members')
    .upsert({ id: userId, email }, { onConflict: 'id' });
  
  if (insertError) {
    console.warn('Failed to ensure member record:', insertError);
  }
  
  // Update member record if onboarding options provided
  if (options.onboardingCompleted) {
    // Normalize username and ensure it matches validation regex
    const raw = options.username || `testuser_${Date.now()}`;
    const normalized = raw.toLowerCase();
    const safeUsername = USERNAME_REGEX.test(normalized) ? normalized : `user_${Date.now()}`;
    
    const { error: updateError } = await admin
      .from('members')
      .update({
        onboarding_completed_at: new Date().toISOString(),
        username: safeUsername,
        full_name: options.fullName || 'Test User',
        date_of_birth: options.dateOfBirth || '1990-01-01',
      })
      .eq('id', userId);
    
    if (updateError) {
      console.warn('Failed to update member record:', updateError);
    }
  }
  
  return userId;
}

/**
 * Clean up a test user by ID
 * Cascades to all related records (members, families, etc.)
 * 
 * @param userId - The user ID to delete
 */
export async function cleanupTestUser(userId: string | undefined): Promise<void> {
  if (!userId || !SERVICE_ROLE_KEY) {
    return;
  }
  
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.warn('Failed to cleanup test user:', error);
    }
  } catch (error) {
    console.warn('Failed to cleanup test user:', error);
  }
}

/**
 * Sign out the current user
 * Clears cookies, localStorage, and sessionStorage for complete logout
 * 
 * @param page - Playwright page object
 */
export async function signOut(page: Page): Promise<void> {
  // Clear all auth state
  await page.context().clearCookies();
  
  // Also clear browser storage (belt-and-suspenders)
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
  });
  
  // Navigate to base URL to complete sign out
  await page.goto(BASE_URL);
}

/**
 * Generate unique test email with short random suffix
 * @param prefix - Optional prefix for the email
 * @returns Unique email address for testing
 */
export function generateTestEmail(prefix = 'test'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}_${timestamp}_${random}@example.com`;
}

/**
 * Seed email helper for cleaner test code
 * @param prefix - Optional prefix
 * @returns Unique test email
 */
export const seedEmail = (prefix?: string) => generateTestEmail(prefix);

/**
 * Format date as YYYY-MM-DD in local timezone
 * Avoids UTC conversion issues in date inputs
 * 
 * @param date - Date to format
 * @returns YYYY-MM-DD string
 */
export function toLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get a date for a specific age
 * @param age - Age in years
 * @returns Date object for that age
 */
export function getDateForAge(age: number): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  return date;
}

/**
 * Wait for and verify successful navigation
 * More reliable than waitForURL alone
 * 
 * @param page - Playwright page
 * @param urlPattern - URL pattern to wait for
 * @param timeout - Max wait time in ms
 */
export async function waitForNavigation(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
): Promise<void> {
  await page.waitForURL(urlPattern, { timeout, waitUntil: 'networkidle' });
  
  // Additional stability check
  await page.waitForLoadState('domcontentloaded');
}