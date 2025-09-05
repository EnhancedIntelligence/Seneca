import { createClient } from "@/utils/supabase/server";
import { OnboardingForm } from "./components/OnboardingForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Optional: helps with dev tools and SEO
export const metadata = { title: "Onboarding · Seneca" };

export default async function OnboardingPage() {
  const supabase = await createClient();

  // Verify user exists (layout should have already redirected if not)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // TODO: Prefetch member data when OnboardingWizard is implemented
  // const { data: member } = await supabase
  //   .from("members")
  //   .select("full_name, username, email, phone_e164, date_of_birth, onboarding_completed_at")
  //   .eq("id", user.id)
  //   .maybeSingle();

  return (
    <main className="container mx-auto max-w-2xl py-8">
      <h1 className="text-2xl font-semibold">Finish setting up your profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">This should only take a minute.</p>

      
      <OnboardingForm />
    </main>
  );
}