"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
});

/**
 * DashboardAuthProvider V2
 *
 * Optimized auth provider that:
 * - Prevents flicker on initial load (SSR-aware)
 * - Uses single memoized Supabase client
 * - Properly encodes/decodes redirect URLs
 * - Avoids redirect loops on auth routes
 * - Cleans up subscriptions properly
 */
export function DashboardAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Memoize Supabase client for single instance
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  // Check if we're on an auth route to prevent redirect loops
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth/");

  const [session, setSession] = useState<Session | null>(null);
  const hydrated = useRef(false);

  // Helper to create safe redirect URL
  const makeNext = () => {
    const currentPath =
      pathname + (searchParams?.toString() ? `?${searchParams}` : "");
    try {
      const u = new URL(currentPath, window.location.origin);
      return u.origin === window.location.origin
        ? u.pathname + u.search + u.hash
        : "/";
    } catch {
      return "/";
    }
  };

  useEffect(() => {
    let mounted = true;

    // Initial session check
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(session ?? null);
      hydrated.current = true;

      // Only redirect if no session AND not on auth route
      if (!session && !isAuthRoute) {
        router.replace(`/login?next=${encodeURIComponent(makeNext())}`);
      }
    })();

    // Listen for auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        setSession(newSession ?? null);

        // Handle sign out or session loss
        if ((!newSession || event === "SIGNED_OUT") && !isAuthRoute) {
          router.replace(`/login?next=${encodeURIComponent(makeNext())}`);
        }
      },
    );

    // Cleanup
    return () => {
      mounted = false;
      subscription?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, isAuthRoute]); // Path changes handled via makeNext()

  // Provide context value
  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
    }),
    [session],
  );

  // Render children immediately to avoid flicker
  // The server already checked auth, so we trust that initially
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access dashboard auth context
 */
export function useDashboardAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    console.warn("useDashboardAuth must be used within DashboardAuthProvider");
  }
  return context;
}
