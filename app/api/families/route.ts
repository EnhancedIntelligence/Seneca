/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Families Collection Route Handler
 * Handles listing and creating families
 */

import { NextRequest } from 'next/server';
import { ok, err, readJson, paginatedResponse } from '@/lib/server/api';
import { requireUser, getUserFamilyIds } from '@/lib/server/auth';
import { ValidationError, ServerError } from '@/lib/server/errors';
import { checkRateLimit } from '@/lib/server/middleware/rate-limit';
import { createAdminClient } from '@/lib/server-only/admin-client';
import { z } from 'zod';
import type { Database } from '@/lib/types';

// Validation schema for family creation
const familyCreationSchema = z.object({
  family: z.object({
    name: z
      .string()
      .min(2, 'Family name must be at least 2 characters')
      .max(100, 'Family name must be at most 100 characters'),
    description: z
      .string()
      .max(500, 'Description must be at most 500 characters')
      .optional()
      .nullable(),
  }),
  children: z
    .array(
      z.object({
        name: z
          .string()
          .min(2, 'Child name must be at least 2 characters')
          .max(50, 'Child name must be at most 50 characters'),
        birth_date: z.string().refine((date) => {
          if (!date) return true; // Optional field
          const birthDate = new Date(date);
          const now = new Date();
          const age = now.getFullYear() - birthDate.getFullYear();
          return birthDate <= now && age <= 18;
        }, 'Invalid birth date or child must be under 18'),
        gender: z.enum(['boy', 'girl', 'other']).optional().nullable(),
        notes: z
          .string()
          .max(200, 'Notes must be at most 200 characters')
          .optional()
          .nullable(),
        profile_image_url: z.string().url().optional().nullable(),
      })
    )
    .min(1, 'At least one child is required')
    .max(10, 'Maximum 10 children allowed'),
});

type FamilyCreation = z.infer<typeof familyCreationSchema>;

/**
 * GET /api/families
 * List all families the user has access to
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 50)
      : 50;
    
    const adminClient = createAdminClient();
    
    // Get all families the user is a member of
    const { data: memberships, error: membershipError } = await adminClient
      .from('family_memberships')
      .select(`
        family_id,
        role,
        joined_at,
        families ( id, name, description, created_by, created_at, updated_at )
      `)
      .eq('user_id', user.id)
      .limit(limit);
    
    if (membershipError) {
      console.error('Families list error:', membershipError);
      throw new ServerError('Failed to fetch families');
    }
    
    // Transform the data to include role information
    const families = (memberships || []).map((m) => ({
      id: m.families?.id || '',
      name: m.families?.name || '',
      description: m.families?.description || null,
      created_by: m.families?.created_by || '',
      created_at: m.families?.created_at || '',
      updated_at: m.families?.updated_at || '',
      role: m.role,
      joined_at: m.joined_at || '',
    }));
    
    return ok({
      families,
      count: families.length
    });
  } catch (error) {
    return err(error);
  }
}

/**
 * POST /api/families
 * Create a new family with initial children
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    
    // Rate limit family creation
    await checkRateLimit(`${user.id}:family-create`);
    
    // Parse and validate request body
    const body = await readJson<FamilyCreation>(request);
    const validatedData = familyCreationSchema.parse(body);
    
    const adminClient = createAdminClient();
    
    // Optional: Check if user already has too many families
    const existingFamilyIds = await getUserFamilyIds(user.id);
    if (existingFamilyIds.length >= 5) {
      throw new ValidationError('Maximum number of families reached (5)');
    }
    
    // Start transaction-like operation
    // 1. Create the family
    const { data: family, error: familyError } = await adminClient
      .from('families')
      .insert({
        name: validatedData.family.name,
        description: validatedData.family.description,
        created_by: user.id,

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (familyError || !family) {
      console.error('Family creation error:', familyError);
      throw new ServerError('Failed to create family');
    }
    
    // 2. Create family membership for the creator
    const { error: membershipError } = await adminClient
      .from('family_memberships')
      .insert({
        family_id: family.id,
        user_id: user.id,
        role: 'admin' as Database['public']['Enums']['family_role_enum'],
        created_by: user.id,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    
    if (membershipError) {
      console.error('Membership creation error:', membershipError);
      // Rollback: Delete the family
      await adminClient.from('families').delete().eq('id', family.id);
      throw new ServerError('Failed to create family membership');
    }
    

    // 3. Create children
    const childrenToInsert = validatedData.children.map((child) => ({
      ...child,
      family_id: family.id,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    
    const { data: children, error: childrenError } = await adminClient
      .from('children')
      .insert(childrenToInsert)
      .select();
    
    if (childrenError) {
      console.error('Children creation error:', childrenError);
      // Rollback: Delete family and membership
      await adminClient
        .from('family_memberships')
        .delete()
        .eq('family_id', family.id);
      await adminClient.from('families').delete().eq('id', family.id);
      throw new ServerError('Failed to create children');
    }
    
    // Return success response
    return ok({
      family: {
        id: family.id,
        name: family.name,
        description: family.description,
        created_at: family.created_at,
      },
      children: children || [],
      message: 'Family created successfully',
    }, 201); // 201 Created for POST
  } catch (error) {
    return err(error);
  }
}

