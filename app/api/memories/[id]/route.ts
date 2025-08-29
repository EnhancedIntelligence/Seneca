/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Memory Individual Route Handler
 * Template for refactored API routes using centralized utilities
 */

import { NextRequest } from "next/server";
import { ok, err, readJson, paginatedResponse } from "@/lib/server/api";
import { requireUser, requireFamilyAccess } from "@/lib/server/auth";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/lib/server/errors";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { createAdminClient } from "@/lib/server-only/admin-client";
import { z } from "zod";
import type { Database } from "@/lib/types";

// Validation schema for updates
const memoryUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(50)).max(50).optional(),
  memory_date: z.string().datetime().optional(),
  location_name: z.string().max(200).optional().nullable(),
  location_lat: z.number().min(-90).max(90).optional().nullable(),
  location_lng: z.number().min(-180).max(180).optional().nullable(),
});

type MemoryUpdate = z.infer<typeof memoryUpdateSchema>;

/**
 * GET /api/memories/[id]
 * Fetch a specific memory if the user has access
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    const adminClient = createAdminClient();
    const resolvedParams = await params;

    // Fetch memory
    const { data: memory, error } = await adminClient
      .from("memory_entries")
      .select("*")
      .eq("id", resolvedParams.id)
      .single();

    if (error || !memory) {
      throw new NotFoundError("Memory not found");
    }

    if (!memory.family_id) {
      throw new NotFoundError("Memory has no associated family");
    }

    // Verify user has access to this family
    await requireFamilyAccess(user.id, memory.family_id);

    // Check if user has soft-deleted this memory
    const ctx = memory.app_context as Record<string, any> | null;
    if (ctx?.hidden_by && ctx.hidden_by[user.id]) {
      throw new NotFoundError("Memory not found");
    }

    return ok(memory);
  } catch (error) {
    return err(error);
  }
}

/**
 * PATCH /api/memories/[id]
 * Update a memory with partial data
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    const resolvedParams = await params;

    // Rate limit updates
    await checkRateLimit(`${user.id}:memory-update`);

    // Parse and validate request body
    const body = await readJson<MemoryUpdate>(req);
    const validatedData = memoryUpdateSchema.parse(body);

    const adminClient = createAdminClient();

    // Verify memory exists and user has access
    const { data: existing, error: fetchError } = await adminClient
      .from("memory_entries")
      .select("id, family_id")
      .eq("id", resolvedParams.id)
      .single();

    if (fetchError || !existing || !existing.family_id) {
      throw new NotFoundError("Memory not found");
    }

    await requireFamilyAccess(user.id, existing.family_id);

    // Update memory
    const { data: updated, error: updateError } = await adminClient
      .from("memory_entries")
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resolvedParams.id)
      .select()
      .single();

    if (updateError) {
      console.error("Memory update error:", updateError);
      throw new Error("Failed to update memory");
    }

    return ok(updated);
  } catch (error) {
    return err(error);
  }
}

/**
 * PUT /api/memories/[id]
 * Full update (delegates to PATCH for now)
 */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return PATCH(req, ctx);
}

/**
 * DELETE /api/memories/[id]
 * Soft delete - mark as hidden for current user
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    const resolvedParams = await params;

    // Rate limit deletes to prevent abuse
    await checkRateLimit(`${user.id}:memory-delete`);

    const adminClient = createAdminClient();

    // Fetch memory to verify access and get current app_context
    const { data: existing, error: fetchErr } = await adminClient
      .from("memory_entries")
      .select("id, family_id, app_context")
      .eq("id", resolvedParams.id)
      .single();

    if (fetchErr || !existing || !existing.family_id) {
      throw new NotFoundError("Memory not found");
    }

    await requireFamilyAccess(user.id, existing.family_id);

    // Update app_context to mark as hidden for this user
    const ctx = (existing.app_context as any) || {};
    const hidden_by = {
      ...(ctx.hidden_by || {}),
      [user.id]: new Date().toISOString(),
    };
    const newContext = { ...ctx, hidden_by };

    const { error: updateError } = await adminClient
      .from("memory_entries")
      .update({
        app_context: newContext,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resolvedParams.id);

    if (updateError) {
      console.error("Memory soft delete error:", updateError);
      throw new Error("Failed to delete memory");
    }

    return ok({
      id: resolvedParams.id,
      deleted: true,
      message: "Memory hidden for this user",
    });
  } catch (error) {
    return err(error);
  }
}
