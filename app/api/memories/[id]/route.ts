import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server-only/admin-client";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
import type { Database } from "@/lib/types";

// GET /api/memories/[id] - fetch a specific memory if the user has access
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    } = await supabase.auth.getUser(token);
    if (!user)
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );

    const admin = createAdminClient();

    const { data: memory, error } = await admin
      .from("memory_entries")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !memory)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!memory.family_id)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Verify membership based on memory.family_id
    const { data: membership } = await admin
      .from("family_memberships")
      .select("user_id")
      .eq("family_id", memory.family_id)
      .eq("user_id", user.id)
      .single();

    if (!membership)
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    // Hide if user has soft-deleted
    const ctx = memory.app_context as Record<string, any> | null;
    if (ctx?.hidden_by && ctx.hidden_by[user.id]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(memory);
  } catch (e) {
    console.error("Memory GET error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

// PATCH /api/memories/[id] - partial update
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const payload = memoryUpdateSchema.parse(body);

    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer "))
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    const token = authHeader.substring(7);
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user)
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );

    const admin = createAdminClient();

    // Fetch memory to verify access
    const { data: existing, error: fetchErr } = await admin
      .from("memory_entries")
      .select("id,family_id")
      .eq("id", params.id)
      .single();
    if (fetchErr || !existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!existing.family_id)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: membership } = await admin
      .from("family_memberships")
      .select("user_id")
      .eq("family_id", existing.family_id)
      .eq("user_id", user.id)
      .single();
    if (!membership)
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { data, error } = await admin
      .from("memory_entries")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      console.error("Memory update error:", error);
      return NextResponse.json(
        { error: "Failed to update memory" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, memory: data });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: e.issues },
        { status: 400 }
      );
    }
    console.error("Memory PATCH error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/memories/[id] - full update behaves like PATCH for now
export async function PUT(
  request: NextRequest,
  ctx: { params: { id: string } }
) {
  return PATCH(request, ctx);
}

// DELETE /api/memories/[id] - soft delete: mark hidden for current user in app_context.hidden_by
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer "))
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    const token = authHeader.substring(7);
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user)
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );

    const admin = createAdminClient();

    // Fetch memory to verify access and get current app_context
    const { data: existing, error: fetchErr } = await admin
      .from("memory_entries")
      .select("id,family_id,app_context")
      .eq("id", params.id)
      .single();
    if (fetchErr || !existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!existing.family_id)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: membership } = await admin
      .from("family_memberships")
      .select("user_id")
      .eq("family_id", existing.family_id)
      .eq("user_id", user.id)
      .single();
    if (!membership)
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const ctx = (existing.app_context as any) || {};
    const hidden_by = {
      ...(ctx.hidden_by || {}),
      [user.id]: new Date().toISOString(),
    };
    const newCtx = { ...ctx, hidden_by };

    const { error } = await admin
      .from("memory_entries")
      .update({ app_context: newCtx, updated_at: new Date().toISOString() })
      .eq("id", params.id);

    if (error) {
      console.error("Memory soft delete error:", error);
      return NextResponse.json(
        { error: "Failed to hide memory" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Memory hidden for this user",
    });
  } catch (e) {
    console.error("Memory DELETE error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
