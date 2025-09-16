import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const revalidate = 0; // Force dynamic rendering

export default async function CapturePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // TODO(PR-2): Replace placeholder with capture UI and upload functionality

  return (
    <main className="container mx-auto p-4">
      <Card className="p-6 space-y-2">
        <h1 className="text-2xl font-semibold">Capture</h1>
        <p className="text-muted-foreground">
          Coming soon — capture and uploads will land in PR 2.
        </p>
        <Button disabled>Record (disabled)</Button>
      </Card>
    </main>
  );
}