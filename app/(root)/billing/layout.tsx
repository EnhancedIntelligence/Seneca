// Server component layout to control billing segment behavior
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
