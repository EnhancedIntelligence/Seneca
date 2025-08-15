import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server-only/admin-client";
import { z } from "zod";
import type { Database } from "@/lib/types";
import { supabase } from "@/lib/supabase";

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
    created_by: z.string().uuid("Invalid user ID"),
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
        created_by: z.string().uuid("Invalid user ID"),
      })
    )
    .min(1, "At least one child is required")
    .max(10, "Maximum 10 children allowed"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = familyCreationSchema.parse(body);

    const adminClient = createAdminClient();

    // Check if user already has a family (optional business rule)
    const { data: existingMemberships, error: membershipCheckError } =
      await adminClient
        .from("family_memberships")
        .select("family_id")
        .eq("user_id", validatedData.family.created_by)
        .limit(1);

    if (membershipCheckError) {
      console.error(
        "Error checking existing memberships:",
        membershipCheckError
      );
      return NextResponse.json(
        { error: "Failed to validate user status" },
        { status: 500 }
      );
    }

    // For now, allow multiple families per user
    // if (existingMemberships && existingMemberships.length > 0) {
    //   return NextResponse.json(
    //     { error: 'User already belongs to a family' },
    //     { status: 400 }
    //   )
    // }

    // Start transaction-like operation
    // 1. Create the family
    const { data: family, error: familyError } = await adminClient
      .from("families")
      .insert({
        name: validatedData.family.name,
        description: validatedData.family.description,
        created_by: validatedData.family.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (familyError) {
      console.error("Family creation error:", familyError);
      return NextResponse.json(
        { error: "Failed to create family" },
        { status: 500 }
      );
    }

    // 2. Create family membership for the creator
    const { error: membershipError } = await adminClient
      .from("family_memberships")
      .insert({
        family_id: family.id,
        user_id: validatedData.family.created_by,
        role: "admin" as Database["public"]["Enums"]["family_role_enum"],
        created_by: validatedData.family.created_by,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (membershipError) {
      console.error("Membership creation error:", membershipError);
      // Rollback: Delete the family
      await adminClient.from("families").delete().eq("id", family.id);
      return NextResponse.json(
        { error: "Failed to create family membership" },
        { status: 500 }
      );
    }

    // 3. Create children
    const childrenToInsert = validatedData.children.map((child) => ({
      ...child,
      family_id: family.id,
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
      return NextResponse.json(
        { error: "Failed to create children" },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        family: {
          id: family.id,
          name: family.name,
          description: family.description,
          created_at: family.created_at,
        },
        children: children || [],
        message: "Family created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Family creation API error:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    // Handle other errors
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
    const limitParam = parseInt(searchParams.get("limit") || "50", 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 50)
      : 50;

    const adminClient = createAdminClient();

    const { data: memberships, error: membershipError } = await adminClient
      .from("family_memberships")
      .select(
        `
        family_id,
        role,
        joined_at,
        families ( id, name, description, created_by, created_at, updated_at )
      `
      )
      .eq("user_id", user.id)
      .limit(limit);

    if (membershipError) {
      console.error("Families list error:", membershipError);
      return NextResponse.json(
        { error: "Failed to fetch families" },
        { status: 500 }
      );
    }

    const families = (memberships || []).map((m) => ({
      id: m.families?.id || "",
      name: m.families?.name || "",
      description: m.families?.description || null,
      created_by: m.families?.created_by || "",
      created_at: m.families?.created_at || "",
      updated_at: m.families?.updated_at || "",
      role: m.role,
      joined_at: m.joined_at || "",
    }));

    return NextResponse.json({ families, count: families.length });
  } catch (error) {
    console.error("Families GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
