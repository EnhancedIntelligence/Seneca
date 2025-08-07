// import { ProtectedRoute } from "@/components/auth/ProtectedRoute"; // this route doesnt exist.
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // <ProtectedRoute requireFamilyMembership={true}>
    <div className="flex h-screen bg-background">
      <DashboardSidebar className="w-auto" />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
    // </ProtectedRoute>
  );
}
