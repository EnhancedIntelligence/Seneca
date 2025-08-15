import { createAdminClient } from "@/lib/server-only/admin-client";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

// GET /api/families/[id] - fetch a specific family the user has access to
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

    const familyId = params.id;
    const adminClient = createAdminClient();

    // Verify membership
    const { data: membership, error: membershipError } = await adminClient
      .from("family_memberships")
      .select("user_id, role")
      .eq("family_id", familyId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch family
    const { data: family, error: familyError } = await adminClient
      .from("families")
      .select("id, name, description, created_by, created_at, updated_at")
      .eq("id", familyId)
      .single();

    if (familyError || !family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    return NextResponse.json({ ...family, role: membership.role });
  } catch (error) {
    console.error("Family GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const familyUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

// PATCH /api/families/[id] - partial update
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const payload = familyUpdateSchema.parse(body);

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

    const familyId = params.id;
    const adminClient = createAdminClient();

    // Verify membership
    const { data: membership } = await adminClient
      .from("family_memberships")
      .select("user_id, role")
      .eq("family_id", familyId)
      .eq("user_id", user.id)
      .single();

    if (!membership)
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { data, error } = await adminClient
      .from("families")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", familyId)
      .select()
      .single();

    if (error) {
      console.error("Family update error:", error);
      return NextResponse.json(
        { error: "Failed to update family" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, family: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Family PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/families/[id] - full update (same behavior as PATCH for now)
export async function PUT(
  request: NextRequest,
  ctx: { params: { id: string } }
) {
  return PATCH(request, ctx);
}

// DELETE /api/families/[id] - soft delete: remove current user's membership so they no longer see it
export async function DELETE(
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

    const familyId = params.id;
    const adminClient = createAdminClient();

    // If user is the creator/admin, we still soft-delete by removing their membership;
    // data remains for other members. If last member, data remains per requirement.
    const { error } = await adminClient
      .from("family_memberships")
      .delete()
      .eq("family_id", familyId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Family soft delete (membership removal) error:", error);
      return NextResponse.json(
        { error: "Failed to remove membership" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "You will no longer see this family.",
    });
  } catch (error) {
    console.error("Family DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
