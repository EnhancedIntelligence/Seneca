/**
 * Memories Collection Route Handler
 * Handles listing and creating memories with proper auth and rate limiting
 */

import { NextRequest } from "next/server";
import { ok, err, readJson, paginatedResponse } from "@/lib/server/api";
import {
  requireUser,
  requireFamilyAccess,
  requireSubscription,
} from "@/lib/server/auth";
import { ValidationError, ForbiddenError } from "@/lib/server/errors";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { createAdminClient } from "@/lib/server-only/admin-client";
import { MemoryQueue } from "@/lib/queue";
import { validateRequestBody, memorySchema } from "@/lib/validation";
import { StatusCompat } from "@/lib/database-compatibility";
import type { Database } from "@/lib/types";

/**
 * GET /api/memories
 * List memories with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireSubscription(request);

    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get("family_id");
    const search = searchParams.get("search");
    const childId = searchParams.get("child_id");
    const category = searchParams.get("category");
    const processingStatus = searchParams.get("processing_status");
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Validate required parameters
    if (!familyId) {
      throw new ValidationError("family_id parameter is required");
    }

    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 50)
      : 20;

    // Verify user has access to this family
    await requireFamilyAccess(user.id, familyId);

    const adminClient = createAdminClient();

    // Build query for memories
    let query = adminClient
      .from("memory_entries")
      .select(
        `
        id,
        title,
        content,
        category,
        tags,
        memory_date,
        created_at,
        updated_at,
        processing_status,
        milestone_detected,
        milestone_type,
        milestone_confidence,
        classification_confidence,
        image_urls,
        video_urls,
        location_name,
        location_lat,
        location_lng,
        child_id,
        family_id,
        created_by,
        needs_review,
        error_message,
        app_context
      `,
      )
      .eq("family_id", familyId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    if (childId) {
      query = query.eq("child_id", childId);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (processingStatus) {
      query = query.eq(
        "processing_status",
        processingStatus as Database["public"]["Enums"]["processing_status_enum"],
      );
    }

    // Apply pagination
    if (limit > 0) {
      query = query.limit(limit);
    }

    if (offset > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: memories, error: memoriesError } = await query;

    if (memoriesError) {
      console.error("Error fetching memories:", memoriesError);
      throw new Error("Failed to fetch memories");
    }

    // Filter out items the current user has soft-deleted (hidden)
    const visibleMemories = (memories || []).filter((m: any) => {
      const ctx = m.app_context as Record<string, any> | null;
      const hiddenBy = ctx?.hidden_by;
      return !(hiddenBy && typeof hiddenBy === "object" && hiddenBy[user.id]);
    });

    // Get total count for pagination (excluding hidden is approximated)
    const { count: totalCount } = await adminClient
      .from("memory_entries")
      .select("id", { count: "exact" })
      .eq("family_id", familyId);

    return paginatedResponse(visibleMemories, totalCount || 0, limit, offset);
  } catch (error) {
    return err(error);
  }
}

/**
 * POST /api/memories
 * Create a new memory with optional AI processing
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireSubscription(request);

    // Rate limit memory creation
    await checkRateLimit(`${user.id}:memory-create`);

    // Validate request body
    const body = await readJson(request);
    const validation = validateRequestBody(memorySchema, body);

    if (!validation.success) {
      throw new ValidationError("Validation failed", validation.errors);
    }

    const { content, childId, familyId, location, category } = validation.data;

    // Verify user has access to this family
    await requireFamilyAccess(user.id, familyId);

    // Create memory entry
    const adminClient = createAdminClient();
    const { data: memory, error: createError } = await adminClient
      .from("memory_entries")
      .insert({
        content,
        child_id: childId,
        family_id: familyId,
        location,
        category,
        processing_status: StatusCompat.toNew("pending"),
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error("Memory creation error:", createError);
      throw new Error("Failed to create memory");
    }

    // Add to processing queue (optional, non-blocking)
    let jobId: string | undefined;
    try {
      const queue = new MemoryQueue();
      jobId = await queue.addJob(memory.id, familyId);
    } catch (queueError) {
      // Log but don't fail the request if queue is unavailable
      console.error("Queue error (non-blocking):", queueError);
    }

    return ok(
      {
        id: memory.id,
        content: memory.content,
        processing_status: memory.processing_status,
        created_at: memory.created_at,
        jobId,
        message: jobId
          ? "Memory created and queued for processing"
          : "Memory created (processing queue unavailable)",
      },
      201,
    ); // 201 Created for POST
  } catch (error) {
    return err(error);
  }
}
