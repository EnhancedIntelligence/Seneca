/**
 * Main App Layout
 * Wraps all memory capture views with navigation
 * Ready for auth protection layer
 */

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Add auth check when backend is ready
  // const session = await getServerSession();
  // if (!session) redirect('/login');
  
  return (
    <div className="min-h-screen bg-black text-white">
      {children}
    </div>
  );
}