import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createAdminClient } from "@/lib/server-only/admin-client";
import { MemoryQueue } from "@/lib/queue";
import {
  validateRequestBody,
  memorySchema,
  MemoryInput,
} from "@/lib/validation";
import { StatusCompat } from "@/lib/database-compatibility";
import type { Database } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = validateRequestBody(memorySchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    const { content, childId, familyId, location, category } = validation.data;

    // Verify user has access to this family
    const { data: membership, error: membershipError } = await supabase
      .from("family_memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("family_id", familyId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "Access denied to this family" },
        { status: 403 }
      );
    }

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
      return NextResponse.json(
        { error: "Failed to create memory" },
        { status: 500 }
      );
    }

    // Add to processing queue
    try {
      const queue = new MemoryQueue();
      const jobId = await queue.addJob(memory.id, familyId);

      return NextResponse.json({
        success: true,
        memory: {
          id: memory.id,
          content: memory.content,
          processing_status: memory.processing_status,
          created_at: memory.created_at,
        },
        jobId,
        message: "Memory created and queued for processing",
      });
    } catch (queueError) {
      console.error("Queue error:", queueError);
      // Memory was created but couldn't be queued - still return success
      return NextResponse.json({
        success: true,
        memory: {
          id: memory.id,
          content: memory.content,
          processing_status: memory.processing_status,
          created_at: memory.created_at,
        },
        message: "Memory created (processing queue unavailable)",
      });
    }
  } catch (error) {
    console.error("Memory creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const token = authHeader.substring(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

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
      return NextResponse.json(
        { error: "family_id parameter is required" },
        { status: 400 }
      );
    }

    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 50)
      : 20;

    const adminClient = createAdminClient();

    // Verify requesting user has access to this family
    const { data: membership, error: membershipError } = await adminClient
      .from("family_memberships")
      .select("user_id, family_id")
      .eq("family_id", familyId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "Access denied: You are not a member of this family" },
        { status: 403 }
      );
    }

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
      `
      )
      .eq("family_id", familyId)
      .order("created_at", { ascending: false });

    // Soft-delete visibility: hide memories explicitly hidden by this user if noted in app_context
    // app_context example: { hidden_by: { '<userId>': '2025-08-14T...' } }
    // Supabase does not support JSON path inequality easily; we filter client-side after fetch if needed.

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
        processingStatus as Database["public"]["Enums"]["processing_status_enum"]
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
      return NextResponse.json(
        { error: "Failed to fetch memories" },
        { status: 500 }
      );
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

    return NextResponse.json({
      memories: visibleMemories,
      total: totalCount || 0,
      limit,
      offset,
      hasMore: visibleMemories ? visibleMemories.length === limit : false,
    });
  } catch (error) {
    console.error("Memories API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
