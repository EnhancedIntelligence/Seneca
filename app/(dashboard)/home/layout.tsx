// import { ProtectedRoute } from "@/components/auth/ProtectedRoute"; // this route doesnt exist.

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // <ProtectedRoute requireFamilyMembership={true}>
    <main className="min-h-screen overflow-auto">{children}</main>
    // </ProtectedRoute>
  );
}
