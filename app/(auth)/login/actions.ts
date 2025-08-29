"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppOrigin } from "@/lib/server/origin";
import { createClient } from "@/utils/supabase/server";

/**
 * Magic Link Login
 * Handles both sign in and sign up automatically
 */
export async function loginWithOtp(formData: FormData) {
  const email = formData.get("email") as string;
  const next = (formData.get("next") as string) || "/";

  if (!email) {
    return { success: false, error: "Email is required" };
  }

  const supabase = await createClient();

  // Get the origin using our centralized helper
  const origin = await getAppOrigin();

  // Include next parameter in the callback URL
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    console.error("OTP login error:", error);

    // Check for SMTP configuration issues
    if (
      error.message.includes("Email provider") ||
      error.message.includes("SMTP")
    ) {
      return {
        success: false,
        error:
          "Email service is not configured. Please contact your administrator.",
      };
    }

    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, message: "Check your email for the login link!" };
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Sign out error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
