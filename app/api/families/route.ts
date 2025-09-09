/**
 * Families Collection Route Handler
 * Handles listing and creating families
 */

import { NextRequest } from "next/server";
import { ok, err, readJson } from "@/lib/server/api";
import {
  requireUser,
  getUserFamilyIds,
  requireSubscription,
} from "@/lib/server/auth";
import { ValidationError, ServerError } from "@/lib/server/errors";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/server-only/admin-client";
import { z } from "zod";
import type { Database } from "@/lib/types";

// Force Node.js runtime to avoid Edge + Supabase issues
export const runtime = "nodejs";
// Force dynamic rendering for live data
export const dynamic = "force-dynamic";

// Validation schema for family creation
const familyCreationSchema = z.object({
  family: z.object({
    name: z
      .string()
      .min(2, "Family name must be at least 2 characters")
      .max(100, "Family name must be at most 100 characters"),
    description: z
      .string()
      .max(500, "Description must be at most 500 characters")
      .optional()
      .nullable(),
  }),
  children: z
    .array(
      z.object({
        name: z
          .string()
          .min(2, "Child name must be at least 2 characters")
          .max(50, "Child name must be at most 50 characters"),
        birth_date: z.string().refine((date) => {
          if (!date) return true; // Optional field
          const birthDate = new Date(date);
          const now = new Date();
          const age = now.getFullYear() - birthDate.getFullYear();
          return birthDate <= now && age <= 18;
        }, "Invalid birth date or child must be under 18"),
        gender: z.enum(["boy", "girl", "other"]).optional().nullable(),
        notes: z
          .string()
          .max(200, "Notes must be at most 200 characters")
          .optional()
          .nullable(),
        profile_image_url: z.string().url().optional().nullable(),
      }),
    )
    .min(1, "At least one child is required")
    .max(10, "Maximum 10 children allowed"),
});

type FamilyCreation = z.infer<typeof familyCreationSchema>;

/**
 * GET /api/families
 * List all families the user has access to with proper pagination and count
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireSubscription(request);

    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 100)
      : 20;
    const offsetParam = parseInt(searchParams.get("offset") || "0", 10);
    const offset = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0;

    // Use user-scoped client with RLS for secure access
    const supabase = await createClient();

    // Step 1: Get memberships with count (clean types)
    const {
      data: memberships,
      error: membershipError,
      count,
    } = await supabase
      .from("family_memberships")
      .select("family_id, role, joined_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (membershipError) {
      console.error("Families list error:", membershipError);
      throw new ServerError("Failed to fetch families");
    }

    // Step 2: Get unique family IDs and fetch details (filter out nulls)
    const familyIds = [
      ...new Set(
        (memberships ?? [])
          .map((m) => m.family_id)
          .filter((id): id is string => id !== null),
      ),
    ];
    // Skip family fetch if no memberships
    if (familyIds.length === 0) {
      return ok({
        items: [],
        nextCursor: null,
        total: 0,
      });
    }

    const { data: families, error: familiesError } = await supabase
      .from("families")
      .select("id, name, description, created_by, created_at, updated_at")
      .in("id", familyIds);

    if (familiesError) {
      console.error("Families fetch error:", familiesError);
      throw new ServerError("Failed to fetch family details");
    }

    // Step 3: Create lookup map for O(1) access (avoid O(n²) complexity)
    const familyMap = new Map((families ?? []).map((f) => [f.id, f]));

    // Step 4: Combine memberships with family data efficiently
    const items = (memberships ?? [])
      .filter((membership) => membership.family_id !== null)
      .map((membership) => {
        const family = familyMap.get(membership.family_id!);
        if (!family) {
          // This shouldn't happen with RLS, but handle gracefully
          throw new ServerError(`Family ${membership.family_id} not found`);
        }

        return {
          id: family.id,
          name: family.name,
          description: family.description,
          created_by: family.created_by,
          created_at: family.created_at,
          updated_at: family.updated_at,
          role: membership.role,
          joined_at: membership.joined_at,
        };
      });

    // Calculate next cursor for pagination
    const hasMore = offset + items.length < (count ?? 0);
    const nextCursor = hasMore ? String(offset + items.length) : null;

    return ok({
      items,
      nextCursor,
      total: count ?? undefined,
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
    const user = await requireSubscription(request);

    // Rate limit family creation
    await checkRateLimit(`${user.id}:family-create`);

    // Parse and validate request body
    const body = await readJson<FamilyCreation>(request);
    const validatedData = familyCreationSchema.parse(body);

    const adminClient = createAdminClient();

    // Optional: Check if user already has too many families
    const existingFamilyIds = await getUserFamilyIds(user.id);
    if (existingFamilyIds.length >= 5) {
      throw new ValidationError("Maximum number of families reached (5)");
    }

    // Start transaction-like operation
    // 1. Create the family
    const { data: family, error: familyError } = await adminClient
      .from("families")
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
      console.error("Family creation error:", familyError);
      throw new ServerError("Failed to create family");
    }

    // 2. Create family membership for the creator
    const { error: membershipError } = await adminClient
      .from("family_memberships")
      .insert({
        family_id: family.id,
        user_id: user.id,
        role: "admin" as Database["public"]["Enums"]["family_role_enum"],
        created_by: user.id,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (membershipError) {
      console.error("Membership creation error:", membershipError);
      // Rollback: Delete the family
      await adminClient.from("families").delete().eq("id", family.id);
      throw new ServerError("Failed to create family membership");
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
      .from("children")
      .insert(childrenToInsert)
      .select();

    if (childrenError) {
      console.error("Children creation error:", childrenError);
      // Rollback: Delete family and membership
      await adminClient
        .from("family_memberships")
        .delete()
        .eq("family_id", family.id);
      await adminClient.from("families").delete().eq("id", family.id);
      throw new ServerError("Failed to create children");
    }

    // Return success response
    return ok(
      {
        family: {
          id: family.id,
          name: family.name,
          description: family.description,
          created_at: family.created_at,
        },
        children: children || [],
        message: "Family created successfully",
      },
      201,
    ); // 201 Created for POST
  } catch (error) {
    return err(error);
  }
}
