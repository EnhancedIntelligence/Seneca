/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Family Individual Route Handler
 * Handles operations on specific families
 */

import { NextRequest } from 'next/server';
import { ok, err, readJson } from '@/lib/server/api';
import { requireUser, requireFamilyAccess, getUserFamilyRole } from '@/lib/server/auth';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/server/errors';
import { checkRateLimit } from '@/lib/server/middleware/rate-limit';
import { createAdminClient } from '@/lib/server-only/admin-client';
import { z } from 'zod';

// Validation schema for family updates
const familyUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

type FamilyUpdate = z.infer<typeof familyUpdateSchema>;

/**
 * GET /api/families/[id]
 * Fetch a specific family the user has access to
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    const resolvedParams = await params;
    const familyId = resolvedParams.id;
    
    // Verify user has access to this family
    await requireFamilyAccess(user.id, familyId);
    
    const adminClient = createAdminClient();
    
    // Get user's role in the family
    const role = await getUserFamilyRole(user.id, familyId);
    
    // Fetch family details
    const { data: family, error: familyError } = await adminClient
      .from('families')
      .select('id, name, description, created_by, created_at, updated_at')
      .eq('id', familyId)
      .single();
    
    if (familyError || !family) {
      throw new NotFoundError('Family not found');
    }
    
    return ok({ ...family, role });
  } catch (error) {
    return err(error);
  }
}

/**
 * PATCH /api/families/[id]
 * Partial update of family details
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    const resolvedParams = await params;
    const familyId = resolvedParams.id;
    
    // Rate limit updates
    await checkRateLimit(`${user.id}:family-update`);
    
    // Parse and validate request body
    const body = await readJson<FamilyUpdate>(request);
    const payload = familyUpdateSchema.parse(body);
    
    // Verify user has access to this family
    await requireFamilyAccess(user.id, familyId);
    
    // Optional: Check if user has admin role
    const role = await getUserFamilyRole(user.id, familyId);
    if (role !== 'admin' && role !== 'owner') {
      throw new ForbiddenError('Only family admins can update family details');
    }
    
    const adminClient = createAdminClient();
    
    // Update family
    const { data, error: updateError } = await adminClient
      .from('families')
      .update({ 
        ...payload, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', familyId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Family update error:', updateError);
      throw new Error('Failed to update family');
    }
    
    return ok(data);
  } catch (error) {
    return err(error);
  }
}

/**
 * PUT /api/families/[id]
 * Full update (delegates to PATCH for now)
 */

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return PATCH(request, ctx);
}

/**
 * DELETE /api/families/[id]
 * Soft delete - remove current user's membership
 * Data remains for other members
 */

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    const resolvedParams = await params;
    const familyId = resolvedParams.id;
    
    // Rate limit deletes
    await checkRateLimit(`${user.id}:family-delete`);
    
    // Verify user is a member before removing
    await requireFamilyAccess(user.id, familyId);
    
    const adminClient = createAdminClient();
    
    // Remove user's membership (soft delete for this user)
    // Data remains for other members
    const { error } = await adminClient
      .from('family_memberships')
      .delete()
      .eq('family_id', familyId)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Family membership removal error:', error);
      throw new Error('Failed to leave family');
    }
    
    return ok({
      id: familyId,
      deleted: true,
      message: 'You have left this family'
    });
  } catch (error) {
    return err(error);
  }
}

