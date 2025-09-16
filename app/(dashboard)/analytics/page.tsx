import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card } from "@/components/ui/card";

export const revalidate = 0; // Force dynamic rendering

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // TODO(PR-2): Replace placeholder with real analytics widgets fed by SQL/Edge queries
  return (
    <main className="container mx-auto p-4">
      <Card className="p-6 space-y-2">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground">
          Analytics features will be implemented in PR 2.
        </p>
      </Card>
    </main>
  );
}