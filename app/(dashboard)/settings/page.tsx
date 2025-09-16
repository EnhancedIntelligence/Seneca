import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card } from "@/components/ui/card";

export const revalidate = 0; // Force dynamic rendering

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // TODO(PR-2): Replace placeholder with settings management UI
  return (
    <main className="container mx-auto p-4">
      <Card className="p-6 space-y-2">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Application settings will be implemented in PR 2.
        </p>
      </Card>
    </main>
  );
}