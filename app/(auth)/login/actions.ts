"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppOrigin } from "@/lib/server/origin";
import { createClient } from "@/utils/supabase/server";

/**
 * Magic Link Login (requires SMTP configuration)
 */
export async function loginWithOtp(formData: FormData) {
  const supabase = await createClient();
  
  // Get the origin using our centralized helper
  const origin = await getAppOrigin();

  const { error } = await supabase.auth.signInWithOtp({
    email: formData.get("email") as string,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error("OTP login error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, message: "Check your email for the login link!" };
}

/**
 * Password-based Login (fallback if SMTP not configured)
 */
export async function loginWithPassword(formData: FormData) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    console.error("Password login error:", error);
    return { success: false, error: error.message };
  }

  if (data?.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  return { success: true };
}

/**
 * Sign up with password
 */
export async function signup(formData: FormData) {
  const supabase = await createClient();
  
  const origin = await getAppOrigin();

  const { data, error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        name: formData.get("name") as string,
      }
    }
  });

  if (error) {
    console.error("Signup error:", error);
    return { success: false, error: error.message };
  }

  if (data?.user && !data.session) {
    // User created but needs email verification
    return { 
      success: true, 
      message: "Account created! Check your email to verify your account." 
    };
  }

  if (data?.session) {
    // User created and auto-confirmed (if email confirmation disabled)
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  return { success: true };
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