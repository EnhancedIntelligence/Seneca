import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card } from "@/components/ui/card";

export const revalidate = 0; // Force dynamic rendering

export default async function ChildrenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // TODO(PR-2): Replace placeholder with children CRUD + profiles UI
  return (
    <main className="container mx-auto p-4">
      <Card className="p-6 space-y-2">
        <h1 className="text-2xl font-semibold">Children</h1>
        <p className="text-muted-foreground">
          Children profiles management will be implemented in PR 2.
        </p>
      </Card>
    </main>
  );
}