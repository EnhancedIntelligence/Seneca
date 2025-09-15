import { type ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const onboardingEnabled = process.env.SENECA_ONBOARDING_V1 === "true";

  // If the feature is off, route like pre-onboarding
  if (!onboardingEnabled) {
    return redirect("/overview");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const { data: member, error } = await supabase
    .from("members")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  // Already completed → bounce to overview
  if (!error && member?.onboarding_completed_at) {
    return redirect("/overview");
  }

  return <>{children}</>;
}

