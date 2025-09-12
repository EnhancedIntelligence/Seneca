"use server";

import "server-only";
import { createClient } from "@/utils/supabase/server";
import {
  onboardingFormSchema,
  USERNAME_REGEX,
} from "@/lib/validation/onboarding";
import { createLogger } from "@/lib/logger";
import { rateLimitUsernameCheck, rateLimitOnboardingComplete } from "@/lib/server/rate-limit-policies";
import { toE164 } from "@/lib/utils/phone";
import { redirect } from "next/navigation";

const log = createLogger({ where: "onboarding.actions" });

// Exported types for client components
export type UsernameAvailability =
  | { available: true }
  | {
      available: false;
      reason:
        | "UNAUTHENTICATED"
        | "INVALID_FORMAT"
        | "RESERVED"
        | "TAKEN"
        | "ERROR";
    };

export type FieldErrors = Partial<
  Record<"fullName" | "username" | "dateOfBirth" | "phone", string[]>
>;
export type CompleteState =
  | { success: true }
  | {
      success: false;
      error: string;
      message?: string;
      fieldErrors?: FieldErrors;
    };

// RPC response type
type CheckResult = { available: boolean; reason?: string };

export async function checkUsername(
  username: string,
): Promise<UsernameAvailability> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { available: false, reason: "UNAUTHENTICATED" as const };

  const u = (username || "").toLowerCase().trim();

  // Early format guard to avoid unnecessary RPC calls
  if (!USERNAME_REGEX.test(u)) {
    return { available: false, reason: "INVALID_FORMAT" as const };
  }

  // Rate limit: 10 per minute per user, 20 per minute per IP
  try {
    await rateLimitUsernameCheck(user.id);
  } catch {
    log.warn("Rate limit exceeded for username check", { userId: user.id });
    return { available: false, reason: "ERROR" as const };
  }

  // Type the RPC - cast the result since Supabase returns Json type
  // Username already lowercased above in line 53
  const { data, error } = await supabase.rpc("check_username_availability", {
    p_username: u,
  });

  if (error) {
    log.error(error, { op: "usernameCheck", username: u });
    return { available: false, reason: "ERROR" as const };
  }

  // Cast and validate the response
  const result = data as CheckResult | null;
  if (!result || typeof result.available !== "boolean") {
    return { available: false, reason: "ERROR" as const };
  }

  // Normalize to our union type
  const reason = (result.reason ?? "ERROR") as "TAKEN" | "RESERVED" | "ERROR";
  return result.available
    ? { available: true as const }
    : { available: false as const, reason };
}

export async function completeOnboarding(
  _prev: unknown,
  formData: FormData,
): Promise<CompleteState | never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "UNAUTHENTICATED" };

  // Rate limit: 5 attempts per hour per user, 10 per hour per IP
  try {
    await rateLimitOnboardingComplete(user.id);
  } catch {
    log.warn("Rate limit exceeded for onboarding completion", { userId: user.id });
    return { 
      success: false, 
      error: "TOO_MANY_ATTEMPTS", 
      message: "Too many attempts. Please try again later." 
    };
  }

  const raw = {
    fullName: String(formData.get("fullName") ?? ""),
    username: String(formData.get("username") ?? ""),
    dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
    phone: (formData.get("phone") as string | null) ?? undefined,
  };

  const parsed = onboardingFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const dob = parsed.data.dateOfBirth; // Date from transform
  // Use UTC to avoid timezone drift
  const dobIso = `${dob.getUTCFullYear()}-${String(dob.getUTCMonth() + 1).padStart(2, "0")}-${String(dob.getUTCDate()).padStart(2, "0")}`; // yyyy-mm-dd

  // Validate phone to E.164 if provided
  const phoneE164 = parsed.data.phone ? toE164(parsed.data.phone) : null;
  if (parsed.data.phone && !phoneE164) {
    return {
      success: false,
      error: "INVALID_PHONE",
      message: "Please enter a valid international phone number starting with +",
      fieldErrors: { 
        phone: ["Invalid phone format. Must be international format (e.g., +14155551234)"] 
      },
    };
  }

  const { data, error } = await supabase.rpc("complete_onboarding", {
    p_full_name: parsed.data.fullName,
    p_username: parsed.data.username.toLowerCase(), // Ensure lowercase
    p_date_of_birth: dobIso,
    p_phone_e164: phoneE164 ?? "", // RPC expects string, SQL NULLIF will handle empty string
    p_bio: undefined,
    p_preferences: undefined,
    p_notification_preferences: undefined,
  });

  // Cast the RPC response
  type CompleteResult = {
    success: boolean;
    code?: string;
    message?: string;
  } | null;
  const result = data as CompleteResult;

  if (error || !result?.success) {
    // Check for username uniqueness violation (Postgres code 23505 or message pattern)
    const errorCode = (error as { code?: string })?.code;
    if (errorCode === "23505" || 
        (error?.message?.includes("unique") && error?.message?.includes("username"))) {
      return { 
        success: false, 
        error: "USERNAME_TAKEN", 
        message: "That username was just taken. Please try another.",
        fieldErrors: { 
          username: ["That username was just taken. Please try another."] 
        } 
      };
    }

    const code = result?.code ?? "UNKNOWN_ERROR";
    const message =
      code === "USERNAME_TAKEN"
        ? "That username is already taken"
        : code === "AGE_BELOW_MIN"
          ? "You must be at least 13 years old"
          : code === "DUPLICATE_USERNAME"
            ? "This username is already in use"
            : (result?.message ?? error?.message);
    
    if (error) {
      log.error("complete_onboarding_failed", { userId: user.id, error: error.message });
    }
    
    return {
      success: false,
      error: code,
      message,
    };
  }

  // Success → let layout admit user to dashboard area
  redirect("/overview");
}
