/**
 * Server-side Authentication Helpers
 * Centralized auth validation for API routes
 */

import { AuthError, ForbiddenError } from './errors';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '../server-only/admin-client';
import type { User } from '@supabase/supabase-js';
import {
  SUBSCRIPTION_TABLE,
  SUBSCRIPTION_COLUMNS,
  type SubscriptionTier,
} from '@/lib/server/subscription';

// Use service role for server-side auth validation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Extract and validate user from request
 * @param req - The incoming request
 * @returns The authenticated user
 * @throws AuthError if authentication fails
 */
export async function requireUser(req: Request): Promise<User> {
  const authHeader = 
    req.headers.get('authorization') || 
    req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Authentication required');
  }
  
  const token = authHeader.slice(7);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new AuthError('Invalid authentication token');
  }
  
  return user;
}

/**
 * Verify user has access to a specific family
 * @param userId - The user's ID
 * @param familyId - The family's ID
 * @throws ForbiddenError if user doesn't have access
 */
export async function requireFamilyAccess(
  userId: string, 
  familyId: string
): Promise<void> {
  const adminClient = createAdminClient();
  
  const { data: membership, error } = await adminClient
    .from('family_memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('family_id', familyId)
    .single();
  
  if (error || !membership) {
    throw new ForbiddenError('Access denied to this family');
  }
}

/**
 * Get all family IDs a user has access to
 * @param userId - The user's ID
 * @returns Array of family IDs
 */
export async function getUserFamilyIds(userId: string): Promise<string[]> {
  const adminClient = createAdminClient();
  
  const { data: memberships, error } = await adminClient
    .from('family_memberships')
    .select('family_id')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching family memberships:', error);
    return [];
  }
  
  return memberships?.map((m: { family_id: string | null }) => m.family_id).filter((id): id is string => id !== null) || [];
}

/**
 * Verify user has access to a specific child (through family membership)
 * @param userId - The user's ID
 * @param childId - The child's ID
 * @throws ForbiddenError if user doesn't have access
 */
export async function requireChildAccess(
  userId: string,
  childId: string
): Promise<void> {
  const adminClient = createAdminClient();
  
  // Get child with family info
  const { data: child, error: childError } = await adminClient
    .from('children')
    .select('id, family_id')
    .eq('id', childId)
    .single();
  
  if (childError || !child || !child.family_id) {
    throw new ForbiddenError('Child not found or access denied');
  }
  
  // Verify family access
  await requireFamilyAccess(userId, child.family_id);
}

/**
 * Get user's role in a family
 * @param userId - The user's ID
 * @param familyId - The family's ID
 * @returns The user's role or null if not a member
 */
export async function getUserFamilyRole(
  userId: string,
  familyId: string
): Promise<string | null> {
  const adminClient = createAdminClient();
  
  const { data: membership } = await adminClient
    .from('family_memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('family_id', familyId)
    .single();
  
  return membership?.role || null;
}

// Default allowed tiers for subscription checks
const DEFAULT_ALLOWED_TIERS = ['basic', 'premium'] as const;

/**
 * Require user authentication and subscription validation
 * @param req - The incoming request
 * @param allowedTiers - Array of allowed subscription tiers (defaults to ['basic', 'premium'])
 * @returns The authenticated user if all checks pass
 * @throws AuthError if authentication fails
 * @throws ForbiddenError if subscription requirements not met
 */
export async function requireSubscription(
  req: Request,
  allowedTiers: ReadonlyArray<SubscriptionTier> = DEFAULT_ALLOWED_TIERS
): Promise<User> {
  // First verify authentication
  const user = await requireUser(req);

  // Get admin client for subscription check
  const adminClient = createAdminClient();
  
  // Query members table for subscription status with typed response
  const { data: member, error } = await adminClient
    .from(SUBSCRIPTION_TABLE)
    .select(
      `${SUBSCRIPTION_COLUMNS.active}, ${SUBSCRIPTION_COLUMNS.tier}, ${SUBSCRIPTION_COLUMNS.expiresAt}`
    )
    .eq('id', user.id)
    .single();

  if (error || !member) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[SUBSCRIPTION_CHECK] Member fetch error:', {
        userId: user.id,
        error: error?.message
      });
    }
    throw new ForbiddenError('Subscription verification failed');
  }

  // Check if subscription is active
  const isActive = member[SUBSCRIPTION_COLUMNS.active] as boolean;
  if (!isActive) {
    throw new ForbiddenError('Active subscription required');
  }

  // Check if subscription is expired
  const expiresAtValue = member[SUBSCRIPTION_COLUMNS.expiresAt] as string | null;
  const expiresAt = expiresAtValue && new Date(expiresAtValue);
  if (expiresAt && expiresAt < new Date()) {
    throw new ForbiddenError('Subscription has expired');
  }

  // Check tier requirements if specified
  if (allowedTiers.length > 0) {
    const userTier = (member[SUBSCRIPTION_COLUMNS.tier] as SubscriptionTier) ?? 'free';
    if (!allowedTiers.includes(userTier)) {
      throw new ForbiddenError(`Subscription tier '${allowedTiers.join(' or ')}' required`);
    }
  }

  return user;
}