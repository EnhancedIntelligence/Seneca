import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card } from "@/components/ui/card";

export const revalidate = 0; // Force dynamic rendering

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // TODO(PR-2): Replace placeholder with user profile management UI
  return (
    <main className="container mx-auto p-4">
      <Card className="p-6 space-y-2">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground">
          User profile management will be implemented in PR 2.
        </p>
      </Card>
    </main>
  );
}