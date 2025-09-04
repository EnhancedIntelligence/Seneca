"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { User, Session } from "@supabase/supabase-js";

interface DashboardAuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const DashboardAuthContext = createContext<
  DashboardAuthContextValue | undefined
>(undefined);

/**
 * DashboardAuthProvider
 *
 * A consolidated auth provider for the dashboard group that:
 * - Checks if user session is active on mount
 * - Listens for auth state changes
 * - Redirects to login if no session
 * - Provides user context to all dashboard pages
 * - No middleware needed - just session verification
 */
export function DashboardAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Create a single Supabase client instance (memoized)
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  // Helper to create safe redirect URL
  const createRedirectUrl = useCallback(() => {
    const currentPath =
      pathname + (searchParams?.toString() ? `?${searchParams}` : "");
    return `/login?next=${encodeURIComponent(currentPath)}`;
  }, [pathname, searchParams]);

  // Sign out function
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  }, [supabase, router]);

  // Refresh session function
  const refreshSession = useCallback(async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session) {
      // Session expired or invalid - redirect to login
      router.replace(createRedirectUrl());
      return;
    }
    setSession(session);
    setUser(session.user);
  }, [supabase, router, createRedirectUrl]);

  useEffect(() => {
    let mounted = true;

    // Check initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error || !session) {
          // No valid session - redirect to login with return URL
          console.log("No valid session found, redirecting to login");
          router.replace(createRedirectUrl());
          return;
        }

        // Valid session found
        setSession(session);
        setUser(session.user);
      } catch (error) {
        console.error("Error checking session:", error);
        router.replace("/login");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      console.log("Auth state changed:", event);

      switch (event) {
        case "SIGNED_OUT":
          setSession(null);
          setUser(null);
          router.replace("/login");
          break;

        case "SIGNED_IN":
        case "TOKEN_REFRESHED":
          if (currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
          }
          break;

        case "USER_UPDATED":
          if (currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
          }
          break;

        default:
          // For any other event, check if we still have a valid session
          if (!currentSession) {
            setSession(null);
            setUser(null);
            router.replace(createRedirectUrl());
          }
      }
    });

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router, createRedirectUrl]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verifying session...</p>
        </div>
      </div>
    );
  }

  // If no user after loading completes, return null (redirect will happen)
  if (!user || !session) {
    return null;
  }

  // Provide context value
  const value: DashboardAuthContextValue = {
    user,
    session,
    loading,
    signOut,
    refreshSession,
  };

  return (
    <DashboardAuthContext.Provider value={value}>
      {children}
    </DashboardAuthContext.Provider>
  );
}

/**
 * Hook to use dashboard auth context
 */
export function useDashboardAuth() {
  const context = useContext(DashboardAuthContext);
  if (context === undefined) {
    throw new Error(
      "useDashboardAuth must be used within DashboardAuthProvider",
    );
  }
  return context;
}

/**
 * Helper hook to get auth headers for API requests
 */
export function useAuthHeaders() {
  const { session } = useDashboardAuth();

  return useCallback(() => {
    const headers = new Headers();
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
    return headers;
  }, [session]);
}
