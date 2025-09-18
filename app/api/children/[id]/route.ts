 
/**
 * Child Individual Route Handler
 * Handles operations on specific children
 */

import { NextRequest } from "next/server";
import { ok, err, readJson } from "@/lib/server/api";
import { requireUser, requireFamilyAccess } from "@/lib/server/auth";
import { NotFoundError } from "@/lib/server/errors";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { createAdminClient } from "@/lib/server-only/admin-client";
import { z } from "zod";

// Validation schema for child updates
const childUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  birth_date: z.string().optional().nullable(),
  gender: z.enum(["boy", "girl", "other"]).optional().nullable(),
  notes: z.string().max(200).optional().nullable(),
  profile_image_url: z.string().url().optional().nullable(),
});

type ChildUpdate = z.infer<typeof childUpdateSchema>;

/**
 * GET /api/children/[id]
 * Fetch a specific child if the user has family access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    const resolvedParams = await params;
    const childId = resolvedParams.id;

    const adminClient = createAdminClient();

    // Fetch child with family info (exclude soft-deleted)
    const { data: child, error } = await adminClient
      .from("children")
      .select(
        "id, name, birth_date, gender, notes, profile_image_url, family_id, created_at, updated_at",
      )
      .eq("id", childId)
      .single();

    if (error || !child) {
      throw new NotFoundError("Child not found");
    }

    // Check if soft-deleted (field may not exist in current schema)
    if ((child as any).deleted_at) {
      throw new NotFoundError("Child not found");
    }

    // Verify user has access to the child's family
    if (child.family_id) {
      await requireFamilyAccess(user.id, child.family_id);
    }

    return ok(child);
  } catch (error) {
    return err(error);
  }
}

/**
 * PATCH /api/children/[id]
 * Partial update of child details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    const resolvedParams = await params;
    const childId = resolvedParams.id;

    // Rate limit updates
    await checkRateLimit(`${user.id}:children-update`);

    const adminClient = createAdminClient();

    // First fetch the child to verify access
    const { data: existing, error: fetchError } = await adminClient
      .from("children")
      .select("id, family_id")
      .eq("id", childId)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundError("Child not found");
    }

    // Verify user has access to the child's family
    if (existing.family_id) {
      await requireFamilyAccess(user.id, existing.family_id);
    }

    // Parse and validate update data
    const body = await readJson<ChildUpdate>(request);
    const validatedData = childUpdateSchema.parse(body);

    // Perform the update (handle nullable fields properly)
    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.birth_date !== undefined)
      updateData.birth_date = validatedData.birth_date ?? null;
    if (validatedData.gender !== undefined)
      updateData.gender = validatedData.gender;
    if (validatedData.notes !== undefined)
      updateData.notes = validatedData.notes;
    if (validatedData.profile_image_url !== undefined)
      updateData.profile_image_url = validatedData.profile_image_url;

    const { data, error: updateError } = await adminClient
      .from("children")
      .update(updateData)
      .eq("id", childId)
      .select()
      .single();

    if (updateError) {
      console.error("Child update error:", updateError);
      throw new Error("Failed to update child");
    }

    return ok({
      id: data.id,
      name: data.name,
      birth_date: data.birth_date,
      gender: data.gender,
      family_id: data.family_id,
      updated_at: data.updated_at,
      message: "Child profile updated successfully",
    });
  } catch (error) {
    return err(error);
  }
}

/**
 * PUT /api/children/[id]
 * Full update (delegates to PATCH for now)
 */
export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return PATCH(request, ctx);
}

/**
 * DELETE /api/children/[id]
 * Soft or hard delete a child profile
 * Note: Consider implications of deleting a child with associated memories
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    const resolvedParams = await params;
    const childId = resolvedParams.id;

    // Rate limit deletes
    await checkRateLimit(`${user.id}:children-delete`);

    const adminClient = createAdminClient();

    // First fetch the child to verify access
    const { data: existing, error: fetchError } = await adminClient
      .from("children")
      .select("id, family_id")
      .eq("id", childId)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundError("Child not found");
    }

    // Verify user has access to the child's family
    if (existing.family_id) {
      await requireFamilyAccess(user.id, existing.family_id);
    }

    // Check if child has associated memories - head-only for performance
    const { count: memoryCount } = await adminClient
      .from("memories")
      .select("*", { count: "exact", head: true })
      .eq("child_id", childId);

    // Always soft delete to preserve data integrity
    const { error: updateError } = await adminClient
      .from("children")
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq("id", childId);

    if (updateError) {
      console.error("Child soft delete error:", updateError);
      throw new Error("Failed to delete child");
    }

    return ok({
      id: childId,
      deleted: true,
      soft_delete: true,
      message:
        memoryCount && memoryCount > 0
          ? `Child profile deleted (${memoryCount} associated memories preserved)`
          : "Child profile deleted",
    });
  } catch (error) {
    return err(error);
  }
}
