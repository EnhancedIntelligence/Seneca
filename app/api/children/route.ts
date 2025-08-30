 
/**
 * Children Collection Route Handler
 * Handles listing and creating children with family-scoped access
 */

import { NextRequest } from "next/server";
import { ok, err, readJson, paginatedResponse } from "@/lib/server/api";
import {
  requireUser,
  requireFamilyAccess,
  requireSubscription,
} from "@/lib/server/auth";
import { ValidationError } from "@/lib/server/errors";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { createAdminClient } from "@/lib/server-only/admin-client";
import { z } from "zod";

// Validation schema for child creation
const childCreateSchema = z.object({
  family_id: z.string().uuid("Invalid family ID"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
  birth_date: z.string().optional().nullable(),
  gender: z.enum(["boy", "girl", "other"]).optional().nullable(),
  notes: z
    .string()
    .max(200, "Notes must be at most 200 characters")
    .optional()
    .nullable(),
  profile_image_url: z.string().url("Invalid image URL").optional().nullable(),
});

type ChildCreate = z.infer<typeof childCreateSchema>;

/**
 * GET /api/children
 * List children in a family
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireSubscription(request);
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get("family_id");
    const limitParam = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 50)
      : 50;

    if (!familyId) {
      throw new ValidationError("family_id parameter is required");
    }

    // Verify user has access to this family
    await requireFamilyAccess(user.id, familyId);

    const adminClient = createAdminClient();

    // Query children (exclude soft-deleted)
    let query = adminClient
      .from("children")
      .select(
        "id, name, birth_date, gender, notes, profile_image_url, created_at, updated_at, family_id",
      )
      .eq("family_id", familyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    // Apply pagination
    if (limit > 0) {
      query = query.limit(limit);
    }

    if (offset > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching children:", error);
      throw new Error("Failed to fetch children");
    }

    // Get total count for pagination (exclude soft-deleted) - head-only for performance
    const { count } = await adminClient
      .from("children")
      .select("*", { count: "exact", head: true })
      .eq("family_id", familyId)
      .is("deleted_at", null);

    return paginatedResponse(data || [], count || 0, limit, offset);
  } catch (error) {
    return err(error);
  }
}

/**
 * POST /api/children
 * Create a new child in a family
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireSubscription(request);

    // Rate limit child creation
    await checkRateLimit(`${user.id}:children-create`);

    // Parse and validate request body
    const body = await readJson<ChildCreate>(request);
    const validatedData = childCreateSchema.parse(body);

    // Verify user has access to this family
    await requireFamilyAccess(user.id, validatedData.family_id);

    const adminClient = createAdminClient();

    // Create the child with proper typing (use type assertion for birth_date until schema updated)
    const childData: any = {
      name: validatedData.name,
      family_id: validatedData.family_id,
      birth_date: validatedData.birth_date ?? null,
      gender: validatedData.gender ?? null,
      notes: validatedData.notes ?? null,
      profile_image_url: validatedData.profile_image_url ?? null,
      created_by: user.id,
    };

    const { data, error } = await adminClient
      .from("children")
      .insert(childData)
      .select()
      .single();

    if (error) {
      console.error("Child creation error:", error);
      throw new Error("Failed to create child");
    }

    return ok(
      {
        id: data.id,
        name: data.name,
        birth_date: data.birth_date,
        gender: data.gender,
        family_id: data.family_id,
        created_at: data.created_at,
        message: "Child profile created successfully",
      },
      201,
    ); // 201 Created for POST
  } catch (error) {
    return err(error);
  }
}
